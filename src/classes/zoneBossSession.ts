import { Session } from "./session";
import { User } from "./user";
import Discord from "discord.js";
import cf from "../config.json"
import { constructCurrencyString, colors, sleep, round, randomIntFromInterval } from "../utils";
import { _bossData, Ability } from "../interfaces";
import { Boss } from "./boss";

export class ZoneBossSession extends Session
{
    boss: Boss;
    status = {started: false, ended: false}
    combatLogMsg: Discord.Message | undefined;
    combatLog :string[] = []
    bossdataStartMessage: Discord.Message | undefined;
    
    constructor(discordUser: Discord.User, user: User, broadcastChannel: Discord.TextChannel, bd: _bossData)
    {
        super(discordUser,user,broadcastChannel);
        this.boss = new Boss(bd);
    }

    async initialize()
    {
        this.setTimer(350);
        //create channel
        await super.createChannel(this.boss.name);

        //Check if announced channel is in the official guild the just mention the channel.
        //If it's outside of the official guild then create an invite to the channel.
        if (this.broadcastChannel.guild.id == cf.official_server) await this.broadcastChannel.send(`\`${this.discordUser.username}\`, your turn based boss session has been set up and is ready for use in ${this.sessionChannel?.toString()}`);
        else 
        {
            await this.createInvite();
            await this.broadcastChannel.send(`\`${this.discordUser.username}\`, your turn based boss session has been setup in our official server.\nTo play: **click join on the invite**. It will take you to the correct channel.\n${this.invite?.toString()}`);
        }

        //construct and send information message.
        const infoEmbed = new Discord.RichEmbed()
        .setColor(colors.yellow) //Yelow 
        .setTitle(`Zone boss fight information`)
        .setDescription(`Here is an overview of the information you want to know for fighting the zone bosses.`)
        .addField("**Starting**",`To start the session and engage the boss type \`start\``)

        .setTimestamp()
        .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
        
        //construct and send boss data message
        const dataEmbed = new Discord.RichEmbed()
        .setColor(colors.yellow) //Yelow 
        .setTitle(`${this.boss.name}`)
        .addField("**Stats**",`❤️ ${round(this.boss.stats.max_hp)}\n🗡️ ${round(this.boss.stats.atk)}\n🛡️ ${round(this.boss.stats.def)}\n⚡ ${round(this.boss.stats.acc)}`,true)
        .addField("**Abilities**",`${this.boss.abilities.map(x => x.data.name).join("\n")}`,true)
        .setTimestamp()
        .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')

        await this.sessionChannel?.send(infoEmbed);
        this.bossdataStartMessage = await this.sessionChannel?.send(dataEmbed) as Discord.Message
    }

    async startGame() :Promise<boolean>
    {
        return new Promise(async (resolve, reject) => 
        {
            this.bossdataStartMessage?.delete();
            this.setTimer(120);
            this.status.started = true;

            //create the combat log and the fighting board.
            this.combatLog.push(`**[START ROLEPLAY]**`);
            await this.updateCombatLogMessage();
            await this.updateLiveMessage(this.constructBoardMessage(colors.purple, "starting [RP]"))

            for (let rpmsg of this.boss.dialogue)
            {
                await sleep(2)
                this.combatLog.push(rpmsg);
                await this.updateCombatLogMessage();
            }
            this.combatLog.push(`**[END ROLEPLAY]**`);
            await this.updateCombatLogMessage();
            await this.updateLiveMessage(this.constructBoardMessage(colors.green, "your turn"))
            return resolve(true);
        })
    }

    async useAbility(slot:number) :Promise<boolean>
    {
        return new Promise(async (resolve, reject) => 
        {
            let ability = this.user.abilities.get(slot)!.ability!;
            if (ability.remainingCooldown > 0) {this.updateLiveMessage(this.constructBoardMessage(colors.green, "your turn", [`You tried to use \`${ability.data.name}\` but it's on cooldown for another ${ability.remainingCooldown} turns.`])); return resolve(true);} 
            
            //use the abilitie's effect

            return resolve(true);
        })
    }

    async updateCombatLogMessage()
    {
        if (!this.combatLogMsg) this.combatLogMsg = await this.sessionChannel?.send(this.constructCombatLogMessage()) as Discord.Message;
        else await this.combatLogMsg.edit(this.constructCombatLogMessage());
    }

    async onTimeout()
    {
        await super.onTimeout()
    }

    async onInput(input: string)
    {
        //check if it's a number and a owned ability
        if (this.status.started && !isNaN(+input) && this.user.abilities.get(+input)?.ability) this.awaitingInput = await this.useAbility(+input);
        switch(input)
        {
            case "start":
                if (!this.status.started) {this.awaitingInput = false; this.awaitingInput = await this.startGame();}
            break;
            case "exit":
                if (this.status.ended) {await super.destroySession();}
            break;
            default:
                await super.onInput(input);
            break;
        }
    }

    //utils
    private constructBoardMessage(color: string, status: string, warnings: string[] = [])
    {
        let embed = new Discord.RichEmbed()
        .setColor(color)
        .setTitle(`Boss Battle: ${this.boss.name}`)
        .setDescription(`__Status:__ **${status}**\n${warnings.join("\n")}`)
        .setTimestamp()
        .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')

        let boss_healthPercentage = this.boss.getHealthPercentage();
        let boss_progressBar = "<:healthBar:674948947684622337>".repeat(Math.ceil(boss_healthPercentage/(20/3))) + "<:emptyBar:674948948087013376>".repeat(15 - Math.ceil(boss_healthPercentage/(20/3))); 

        embed.addField(`**Boss**`, 
            `☠️ **${this.boss.name}**\n`+
            `${round(boss_healthPercentage)}% [${round(this.boss.hp)}/${round(this.boss.stats.max_hp)}]\n`+
            `❤️ ${boss_progressBar}`
        );

        let player_healthPercentage = this.user.getHealthPercentage();
        let player_progressBar = "<:healthBar:674948947684622337>".repeat(Math.ceil(player_healthPercentage/(20/3))) + "<:emptyBar:674948948087013376>".repeat(15 - Math.ceil(player_healthPercentage/(20/3))); 
        embed.addField(`**Player**`, 
            `${this.user.class.icon} **${this.discordUser.username}**\n`+
            `${round(player_healthPercentage)}% [${round(this.user.hp)}/${round(this.user.getStats().base.hp)}]\n`+
            `❤️ ${player_progressBar}`
        );

        embed.addField(`**Abilities**`, `${this.user.abilities.filter(x => x.ability != undefined).map(x => x.ability?.data.name).join("\n")}`);
        return embed;
        
    }
    private constructCombatLogMessage()
    {
        return new Discord.RichEmbed()
        .setColor(colors.black)
        .setTitle(`Battle Combat Log`)
        .setDescription(this.combatLog.slice(undefined, 10).join("\n"))
    }
}