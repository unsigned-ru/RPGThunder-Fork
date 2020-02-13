import Discord, { Message } from "discord.js";
import { User } from "./user";
import cf from "../config.json"
import { client } from "../main";
import { CronJob, CronTime } from "cron";
import { DataManager } from "./dataManager";

export class Session
{
    discordUser: Discord.User;
    user: User;
    broadcastChannel: Discord.TextChannel;
    timer: CronJob;

    sessionChannel: Discord.TextChannel | undefined;
    invite: Discord.Invite | undefined;
    liveMsg: Discord.Message | undefined;
    lastUpdateMsg: Discord.RichEmbed | undefined; 
    awaitingInput: boolean = true;

    constructor(discordUser: Discord.User, user: User, broadcastChannel: Discord.TextChannel)
    {
        this.discordUser = discordUser;
        this.user = user;
        this.broadcastChannel = broadcastChannel;
        this.timer = new CronJob(new Date(), this.onTimeout, undefined, false, undefined, this, false);
    }

    async createChannel(channelTitle:string)
    {
        //Get the official server
        let officialGuild = client.guilds.get(cf.official_server)!;

        //create session channel with category as parent.
        let parentCategory = officialGuild.channels.get(cf.session_category)!;
        
        //if the channel exists delete it first.
        let ctd = await officialGuild.channels.find(x => x.name.includes(this.discordUser.id.slice(0,4)));
        if (ctd && ctd.deletable) await ctd.delete();

        //Create a channel for play and add permissions for user.
        const newchannel = await officialGuild.createChannel(`${channelTitle}-#${this.discordUser.id.slice(0,4)}`, {type: "text", parent: parentCategory, rateLimitPerUser: 1});
        this.sessionChannel = newchannel as Discord.TextChannel;
        await this.createChannelPermissions();
    }
    async createChannelPermissions()
    {
        await this.sessionChannel!.lockPermissions();
        if (client.guilds.get(cf.official_server)!.members.has(this.discordUser.id)) await this.sessionChannel!.overwritePermissions(this.discordUser,{ VIEW_CHANNEL: true, READ_MESSAGES: true, READ_MESSAGE_HISTORY: true, SEND_MESSAGES: true});
    }

    async createInvite()
    {
        if (!this.sessionChannel) return;
        this.invite = await this.sessionChannel.createInvite({unique: true, maxAge: 0});
    }

    async promptStart(embed :Discord.RichEmbed)
    {
        if (!this.sessionChannel) return;
        await this.sessionChannel.send(embed);
    }

    async updateLiveMessage(embed :Discord.RichEmbed) :Promise<boolean>
    {
        return new Promise(async (resolve, reject) => {
            if (!this.liveMsg) this.liveMsg = await this.sessionChannel?.send(embed) as Discord.Message;
            else await this.liveMsg.edit(embed);
            return resolve(true);
        });
    }

    setTimer(seconds: number)
    {
        //stop old timer
        this.timer.stop();
        let d = new Date();
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