import { Session } from "./session";
import { User } from "./user";
import Discord from "discord.js";
import cf from "../config.json"
import { colors, sleep, round, randomIntFromInterval, clamp, parseComblatLogString, constructCurrencyString, numberToIcon} from "../utils";
import { _bossData} from "../interfaces";
import { Boss } from "./boss";
import { DataManager } from "./dataManager";
import { Actor } from "./actor";
import { BaseBuff, DamageOverTimeDebuff, HealingOverTimeBuff, AbsorbBuff } from "./tb_effects";

export class ZoneBossSession extends Session
{
    boss: Boss;
    status = {started: false, ended: false}
    combatLogMsg: Discord.Message | undefined;
    combatLog :string[] = []
    bossdataStartMessage: Discord.Message | undefined;
    buffs: Discord.Collection<Actor, BaseBuff[]> = new Discord.Collection();
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
        .setDescription(`Here is an overview of the information you want to know when fighting the zone bosses.`)
        .addField("**Turn Based Fighting**",`Fighting against a boss is done in a turn-based battle. The boss and you both have abilities you can use. **To use an ability you must wait until it is your turn (this is displayed by message color/status message). Once it is your turn, simply type and send the number of the ability and it will use it.**`)
        .addField("**Abilities**",`There are several types of abilities. Ex: *instant damage,instant healing, damage over time, healing over time, shields, damage reductions, ...*. Abilities are unlocked by leveling up and can be equipped using the \`$equipspell\` command.`)
        .addField("**Cooldowns**",`Each ability has its own cooldown. The remaining cooldown of a ability is displayed as a number before the icon: <:cooldown:674944207663923219>. **The cooldown lowers once both you and the boss have finished a turn.**`)
        .addField("**Advanced Combat Logging**",`Above the information board there is another message displaying everything that happens during the battle. **It tracks all of the details of what's happening.**`)
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
            this.user!.setCooldown('boss', 7200);
            this.bossdataStartMessage?.delete();
            this.setTimer(120);
            this.status.started = true;

            //create the combat log and the fighting board.
            this.combatLog.push(`**[START ROLEPLAY]**`);
            await Promise.all([await this.updateCombatLogMessage(), await this.updateLiveMessage(this.constructBoardMessage(colors.purple, "starting [RP]"))]);
            await sleep(1.5);

            for (let rpmsg of this.boss.dialogue)
            {
                this.combatLog.push(rpmsg);
                await this.updateCombatLogMessage();
                await sleep(1.5);
            }
            this.combatLog.push(`**[END ROLEPLAY]**`);
            await this.updateCombatLogMessage();
            await this.updateLiveMessage(this.constructBoardMessage(colors.green, "your turn"))
            return resolve(true);
        })
    }

    async useAbility(slot:number) :Promise<boolean>
    {
        this.setTimer(120);
        return new Promise(async (resolve, reject) => 
        {
            let ability = this.user.abilities.get(slot)!.ability!;
            if (ability.remainingCooldown > 0) {await this.updateLiveMessage(this.constructBoardMessage(colors.green, "your turn", [`You tried to use \`${ability.data.name}\` but it's on cooldown for another ${ability.remainingCooldown} turns.`])); return resolve(true);} 
            
            ability.remainingCooldown = ability.data.cooldown; //set cooldown
            //use the ability's effect
            for (let e of ability.data.effects) 
            {
                let targets: Actor[] = [this.boss];
                if (e.target == 'self') targets = [this.user];
                if (!e.execute(ability.data,this.user, targets, this.combatLog, this.buffs)) break;
            }
            await this.updateCombatLogMessage();
            if (this.boss.hp <= 0) return resolve(await this.onWin());
            if (this.user.hp <= 0) return resolve(await this.onLose());

            return resolve(await this.bossUseAbility());
        })
    }

    async endRound() :Promise<boolean>
    {
        return new Promise(async (resolve, reject) => 
        {
            //damage over time
            for (let ubf of this.buffs)
            {
                for (let bf of ubf[1].filter(x => x instanceof DamageOverTimeDebuff) as DamageOverTimeDebuff[]) 
                {
                    let {dmgTaken} = ubf[0].takeDamage(bf.damage,true,this.buffs,true);
                    this.combatLog.push(parseComblatLogString(bf.combatLogTick,ubf[0],[ubf[0]])+ `__🗡️ ${round(dmgTaken)}__`);
                }
            }
            
            //healing over time
            for (let ubf of this.buffs)
            {
                for (let bf of ubf[1].filter(x => x instanceof HealingOverTimeBuff) as HealingOverTimeBuff[]) 
                {
                    ubf[0].takeHealing(bf.healing, true);
                    this.combatLog.push(parseComblatLogString(bf.combatLogTick,ubf[0],[ubf[0]]));
                }
            }

            //expired buffs
            for (let ubf of this.buffs)
            {
                for (let bf of ubf[1]) 
                {
                    bf.duration--;
                    if (bf.duration == 0) ubf[1].splice(ubf[1].indexOf(bf),1);
                }
            }

            //cooldown
            for (let ab of this.boss.abilities) ab.remainingCooldown = clamp(ab.remainingCooldown-1 , 0, Number.POSITIVE_INFINITY);
            for (let ab of this.user.abilities) if (ab[1].ability) ab[1].ability.remainingCooldown = clamp(ab[1].ability.remainingCooldown-1, 0, Number.POSITIVE_INFINITY);
            
            await Promise.all([await this.updateCombatLogMessage(), await this.updateLiveMessage(this.constructBoardMessage(colors.green, `your turn`))]);

            if (this.boss.hp <= 0) return resolve(await this.onWin());
            if (this.user.hp <= 0) return resolve(await this.onLose());

            return resolve(true);
        })
    }

    async bossUseAbility() :Promise<boolean>
    {
        this.setTimer(120);
        return new Promise(async (resolve, reject) => 
        {
            await this.updateLiveMessage(this.constructBoardMessage(colors.red, `boss turn`));

            //get abilities that are not on cooldown.
            let abs = this.boss.abilities.filter(x => x.remainingCooldown == 0);
            //get a ability to use based on chance.
            let tempabs = abs.slice();
			let rng = randomIntFromInterval(0,abs.reduce((pv,cv) => pv + cv.chance,0))
			while (tempabs.length > 0 && rng > 0)
			{
				let d = tempabs[0];
				if (rng <= d.chance) break;
				else rng-= d.chance;
				tempabs.splice(0,1);
            }
            let ability = abs.find(x => x.data.id == tempabs[0].data.id)!;
            ability.remainingCooldown = ability.data.cooldown; //set cooldown
            //use the ability's effect
            for (let e of ability.data.effects) 
            {
                let targets: Actor[] = [this.user]
                if (e.target == 'self') targets = [this.boss];
                if (!e.execute(ability.data,this.boss, targets, this.combatLog, this.buffs)) break;
            }
            await this.updateCombatLogMessage();
            await sleep(1.5);
            if (this.boss.hp <= 0) return resolve(await this.onWin());
            if (this.user.hp <= 0) return resolve(await this.onLose());
            return resolve(await this.endRound());
        })
    }

    async destroySession()
    {
        this.user.resetAbilities();
        super.destroySession();
    }

    async updateCombatLogMessage()
    {
        if (!this.combatLogMsg) this.combatLogMsg = await this.sessionChannel?.send(this.constructCombatLogMessage()) as Discord.Message;
        else await this.combatLogMsg.edit(this.constructCombatLogMessage());
    }

    async onTimeout()
    {
        if (this.status.started && !this.status.ended)
        {
            this.user.onDeath();
            this.broadcastChannel.send(`\`${this.discordUser.username}\`'s zone boss session expired while being active. They have lost a level as penalty.`)
        }
        await super.onTimeout()
    }

    async onInput(input: string)
    {
        //check if it's a number and a owned ability
        if (this.status.started && !this.status.ended && !isNaN(+input) && this.user.abilities.get(+input)?.ability) {this.awaitingInput = false; this.awaitingInput = await this.useAbility(+input);};
        switch(input)
        {
            case "start":
                if (!this.status.started) {this.awaitingInput = false; this.awaitingInput = await this.startGame();}
            break;
            case "exit":
                if (this.status.ended) {await this.destroySession();}
            break;
            default:
                await super.onInput(input);
            break;
        }
    }

    async onWin() : Promise<boolean>
    {
        return new Promise(async (resolve, reject) => {
            await Promise.all([await this.updateLiveMessage(this.constructBoardMessage(colors.green, "you won")), await this.updateCombatLogMessage()])
            this.status.ended = true;
            const embed = new Discord.RichEmbed()
            .setColor(colors.green) //Yelow 
            .setTitle(`Congratulations! You have defeated ${this.boss.name}!`)
            .setTimestamp()
            .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

            let rewardStrings = [];
            //Give EXP
            if (!this.user.unlocked_zones.includes(this.user.zone+1))
            {
                //user has not unlocked new zone yet.
                rewardStrings.push(`**You have unlocked the next zone __${DataManager.zones.get(this.user.zone+1)}__**`);
                rewardStrings.push(`${round(this.boss.expReward)} EXP`);
                this.user.gainExp(this.boss.expReward,this.liveMsg!);
                this.user.unlocked_zones.push(this.user.zone+1);
            }
            else 
            {
                rewardStrings.push(`${round(this.boss.expReward/3)} EXP`);
                this.user.gainExp(this.boss.expReward / 3,this.liveMsg!);
            }

            //Give currencies
            for (let cd of this.boss.currencyDrops)
            {
                this.user.getCurrency(cd.id).value += cd.amount;
                rewardStrings.push(constructCurrencyString(cd.id,cd.amount));
            }
            //Give Items
            for (let id of this.boss.itemDrops)
            {
                this.user.addItemToInventoryFromId(id.id,id.amount);
                rewardStrings.push(DataManager.getItem(id.id)?.getDisplayString()+` x${id.amount}`);
            }
            //Send message
            embed.setDescription(`**Rewards:**\n${rewardStrings.join("\n")}\n\n If you are done looking at the result, type \`exit\` to close the session.`)
            this.sessionChannel?.send(embed);
            this.broadcastChannel.send(`\`${this.discordUser.username}\` has defeated \`${this.boss.name}\`, zone boss of **${this.user.getZone().name}**`)
            return resolve(true);
        });
    }

    async onLose() : Promise<boolean>
    {
        return new Promise(async (resolve, reject) => {
            await Promise.all([await this.updateLiveMessage(this.constructBoardMessage(colors.red, "you lost")), await this.updateCombatLogMessage()])
            this.status.ended = true;
            //send message
            this.user.onDeath();
            const embed = new Discord.RichEmbed()
            .setColor(colors.red) //Yelow 
            .setTitle(`Defeat! You were defeated by ${this.boss.name}!`)
            .setDescription(`**You have lost one level as death penalty.**\n\n If you are done looking at the result, type \`exit\` to close the session.`)
            .setTimestamp()
            .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

            this.sessionChannel?.send(embed);

            return resolve(true);
        });
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
        let boss_healthBar = "<:healthBar:674948947684622337>".repeat(Math.ceil(boss_healthPercentage/(20/3))) + "<:emptyBar:674948948087013376>".repeat(15 - Math.ceil(boss_healthPercentage/(20/3))); 
        
        let boss_absorbPercentage = 0;
        let bossBuffs = this.buffs.get(this.boss);
        if (bossBuffs) 
        {
            let babs = bossBuffs.filter(x => x instanceof AbsorbBuff);
            if (babs.length > 0) 
            {
                let healthtotal = babs.reduce((pv,cv) => pv + (cv as AbsorbBuff).health,0);
                boss_absorbPercentage = healthtotal/this.boss.stats.max_hp * 100;

            }
        }
        let boss_absorbBar = boss_absorbPercentage > 0 ? "<:expBar:674948948103790610>".repeat(Math.ceil(boss_absorbPercentage/(20/3))) + "<:emptyBar:674948948087013376>".repeat(15 - Math.ceil(boss_absorbPercentage/(20/3))) : "";

        embed.addField(`**Boss**`, 
            `☠️ **${this.boss.name}**\n`+
            `${round(boss_healthPercentage)}% [${round(this.boss.hp)}/${round(this.boss.stats.max_hp)}]\n`+
            `❤️ ${boss_healthBar}\n`+
            `${boss_absorbBar.length > 0 ? `💙 ${boss_absorbBar}`: ""}`
        );

        let player_healthPercentage = this.user.getHealthPercentage();
        let player_progressBar = "<:healthBar:674948947684622337>".repeat(Math.ceil(player_healthPercentage/(20/3))) + "<:emptyBar:674948948087013376>".repeat(15 - Math.ceil(player_healthPercentage/(20/3))); 
        
        let player_absorbPercentage = 0;
        let playerBuffs = this.buffs.get(this.user);
        if (playerBuffs) 
        {
            let pabs = playerBuffs.filter(x => x instanceof AbsorbBuff);
            if (pabs.length > 0) 
            {
                let healthtotal = pabs.reduce((pv,cv) => pv + (cv as AbsorbBuff).health,0);
                player_absorbPercentage = healthtotal/this.user.getStats().total.hp * 100;
            }
        }
        let player_absorbBar = player_absorbPercentage > 0 ? "<:expBar:674948948103790610>".repeat(Math.ceil(player_absorbPercentage/(20/3))) + "<:emptyBar:674948948087013376>".repeat(15 - Math.ceil(player_absorbPercentage/(20/3))) : "";


        embed.addField(`**Player**`, 
            `${this.user.class.icon} **${this.discordUser.username}**\n`+
            `${round(player_healthPercentage)}% [${round(this.user.hp)}/${round(this.user.getStats().base.hp)}]\n`+
            `❤️ ${player_progressBar}\n`+
            `${player_absorbBar.length > 0 ? `💙 ${player_absorbBar}`: ""}`
        );

        //create ability string.
        let abStrings = []
        for (let ab of this.user.abilities)
        {
            if (!ab[1].ability) continue;
            let abstring = `${numberToIcon(ab[0])} - **${ab[1].ability.data.name}**`;
            if (ab[1].ability.remainingCooldown > 0) abstring += ` <:cooldown:674944207663923219> ${ab[1].ability.remainingCooldown}`;
            abStrings.push(abstring)
        }

        embed.addField(`**Abilities**`, abStrings.join("\n"));
        return embed;
        
    }
    private constructCombatLogMessage()
    {
        return new Discord.RichEmbed()
        .setColor(colors.black)
        .setTitle(`Battle Combat Log`)
        .setDescription(this.combatLog.slice(-10).join("\n"))
    }
}