import Discord, { Message } from "discord.js";
import { User } from "./user";
import cf from "../config.json";
import { CronJob, CronTime } from "cron";
import { DataManager } from "./dataManager";
import { client } from "../RPGThunder";

export class Session
{
    discordUser: Discord.User;
    user: User;
    broadcastChannel: Discord.TextChannel;
    timer: CronJob;

    sessionChannel!: Discord.TextChannel;
    invite: Discord.Invite | undefined;
    liveMsg: Discord.Message | undefined;
    lastUpdateMsg: Discord.MessageEmbed | undefined; 
    awaitingInput = true;
    finishedSettingUp = false;

    constructor(discordUser: Discord.User, user: User, broadcastChannel: Discord.TextChannel)
    {
        this.discordUser = discordUser;
        this.user = user;
        this.broadcastChannel = broadcastChannel;
        this.timer = new CronJob(new Date(), this.onTimeout, undefined, false, undefined, this, false);
    }

    async createChannel(channelTitle: string)
    {
        //Get the official server
        const officialGuild = client.guilds.cache.find((x: Discord.Guild) => x.id == cf.official_server);
        if (!officialGuild) return console.error("Session error: CreateChannel-> official guild not found.");

        //create session channel with category as parent.
        const parentCategory = officialGuild.channels.cache.get(cf.session_category);
        if (!parentCategory) return console.error("Session error: CreateChannel-> parentCategory not found.");

        //if the channel exists delete it first.
        const ctd = await officialGuild.channels.cache.find((x) => x.name.includes(this.discordUser.id.slice(0,4)));
        if (ctd && ctd.deletable) await ctd.delete().catch((err: any) => console.error(err));

        //Create a channel for play and add permissions for user.
        const newchannel = await officialGuild.channels.create(`${channelTitle}-#${this.discordUser.id.slice(0,4)}`, {type: "text", parent: parentCategory, rateLimitPerUser: 1, permissionOverwrites: parentCategory.permissionOverwrites});
        this.sessionChannel = newchannel as Discord.TextChannel;
        await this.createChannelPermissions();
        this.finishedSettingUp = true;
    }
    async createChannelPermissions()
    {
        const guild = client.guilds.cache.get(cf.official_server);
        if (!guild) return console.error("Failed to create session channel permissions: Guild not found.");
        try 
        {
            const member = await guild.members.fetch(this.user.userID);
            await this.sessionChannel.updateOverwrite(member, {VIEW_CHANNEL: true, READ_MESSAGE_HISTORY: true, SEND_MESSAGES: true});
        }
        catch(err) {console.error(err);}
    }
    async createInvite()
    {
        if (!this.sessionChannel) return;
        this.invite = await this.sessionChannel.createInvite({unique: true, maxAge: 0});
    }
    async promptStart(embed: Discord.MessageEmbed)
    {
        if (!this.sessionChannel) return;
        await this.sessionChannel.send(embed);
    }
    async updateLiveMessage(embed: Discord.MessageEmbed): Promise<boolean>
    {
        return new Promise(async (resolve) => {
            if (!this.liveMsg) this.liveMsg = await this.sessionChannel?.send(embed) as Discord.Message;
            else await this.liveMsg.edit(embed);
            return resolve(true);
        });
    }
    setTimer(seconds: number)
    {
        //stop old timer
        this.timer.stop();
        const d = new Date();
        d.setSeconds(d.getSeconds() + seconds);
        this.timer.setTime(new CronTime(d));
        //start it again
        this.timer.start();
    }

    async onTimeout()
    {
        await this.destroySession();
    }

    async destroySession()
    {
        this.timer.stop();
        DataManager.sessions.delete(this.discordUser.id);
        if (this.invite) await this.invite.delete();
        if (this.sessionChannel && this.sessionChannel.deletable) await this.sessionChannel.delete();
    }

    async onInput(input: string)
    {
        
        switch(input)
        {
            case "update":
                if (this.liveMsg && this.lastUpdateMsg) {this.awaitingInput = false; this.awaitingInput = await this.updateLiveMessage(this.lastUpdateMsg);}
                break;
            default:
                break;
        }
    }

}