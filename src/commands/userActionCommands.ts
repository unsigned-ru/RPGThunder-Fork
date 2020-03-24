import Discord from "discord.js";
import { commands, client } from "../RPGThunder";
import { DataManager } from "../classes/dataManager";
import { randomIntFromInterval, CC, awaitConfirmMessage, colors, getItemAndAmountFromArgs, numberToIcon, clamp, formatTime, displayRound } from "../utils";
import { CommandInterface} from "../interfaces";
import { User } from "../classes/user";
import { DbMaterialItem, MaterialItem } from "../classes/items";
import cf from "../config.json";
import { CronJob } from "cron";
import { Enemy } from "../classes/enemy";
import { Zone } from "../classes/zone";
import { ZoneBossSession } from "../classes/zoneBossSession";
import { Ability, UserAbility } from "../classes/ability";
import { Boss } from "../classes/boss";

export const cmds: CommandInterface[] = 
[
    {
		name: 'register',
        aliases: [],
        category: CC.hidden,
		description: 'Registers a user!',
        usage: `[prefix]register`,
        executeWhileTravelling: true,
		async execute(msg: Discord.Message) 
		{
            if(DataManager.users.has(msg.author.id)) return msg.channel.send(`\`${msg.author.username}\` is already registered.`);
            
            const embed = new Discord.RichEmbed()
            .setColor('#fcf403')
            .setTitle(`Welcome to RPG Thunder!`)
            .setDescription(`**To start off your adventure, you must pick a class! What class do you want to be?**`)
            .setThumbnail('http://159.89.133.235/DiscordBotImgs/logo.png')
            .setTimestamp()
            .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

            for (const c of DataManager.classes) embed.addField(`**${c[1].icon} ${c[1].name}**`, c[1].description);
            msg.channel.send(embed);

            try
            {
                const rr = (await msg.channel.awaitMessages((m: Discord.Message) => m.author.id == msg.author.id,{time: 100000, maxMatches: 1})).first();
                if (!rr || !rr.content) return;

                const selectedClass = DataManager.classes.find(x => rr.content.toLowerCase().includes(x.name.toLowerCase()));
                if (!selectedClass) return msg.channel.send("Did not find a class with that name.");
                
                DataManager.registerUser(msg.author,selectedClass);
                msg.channel.send(`You have been registered as the class ${selectedClass.name}`);
            }
            catch(err) { return console.log(err);}
        }
    },
    {
		name: 'equip',
        aliases: [],
        category: CC.Equipment,
		description: 'Equips an item.',
        usage: `[prefix]equip [itemName/itemID]`,
        executeWhileTravelling: true,
        mustBeRegistered: true,
		async execute(msg: Discord.Message, args, user: User) 
		{
            //check if args are correct
            if (args.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you did not provide what to equip.\n${this.usage}`);

            //check if item exists
            const item = (!isNaN(+args[0]) && user.inventory.some(x => x.id == +args[0]) 
            ? DataManager.getItem(+args[0]) 
            : DataManager.getItemByName(args.map(x => x.trim()).join(" ").toLowerCase()));
            if (!item) return msg.channel.send(`\`${msg.author.username}\`, could not find an item with that id/name`);

            await user.equipItem(item,msg);
        }
    },
    {
		name: 'unequip',
        aliases: ['deequip',"uq"],
        category: CC.Equipment,
		description: 'unequips an item.',
        usage: `[prefix]unequip [main-hand/off-hand/head/chest/legs/feet/trinket]`,
        executeWhileTravelling: true,
        mustBeRegistered: true,
		execute(msg: Discord.Message, args, user: User) 
		{
            //check if args are correct
            if (args.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you did not provide what to unequip.\n${this.usage}`);

            //check if arg is a slot.
            const slotData = DataManager.itemSlots.find(x => x.name.toLowerCase() == args[0].toLowerCase());
            if (!slotData) return msg.channel.send(`\`${msg.author.username}\`, did not find a slot with that name.\n${this.usage}`);

            const playerSlot = user.equipment.get(slotData._id)!;
            if (!playerSlot.item) return msg.channel.send(`\`${msg.author.username}\`, you have no item equipped in that slot.`);

            //we have an item in the slot. Unequip it and add it to the inventory
            const item = playerSlot.item;
            playerSlot.item = undefined;
            user.addItemToInventory(item);

            msg.channel.send(`\`${msg.author.username}\`, You have sucessfully unequipped ${item.getData()?.getDisplayString()}`);
        }
    },
    {
		name: 'equipspell',
        aliases: ['es', 'equipability'],
        category: CC.Equipment,
		description: 'Equip a spell in a specific slot.',
        usage: `[prefix]equipspell [spellName/spellID]`,
        executeWhileTravelling: true,
        mustBeRegistered: true,
		async execute(msg: Discord.Message, args, user: User) 
		{
            //parse args to get ability
            if (args.length == 0 && parseInt(args[0])) return msg.channel.send(`Please enter the id/name of the spell.\n${this.usage}`);
			let spell: Ability | undefined;
			if(!isNaN(+args[0])) spell = DataManager.getSpell(+args[0]);
			else spell = DataManager.getSpellByName(args.join(" "));
            if (!spell) return msg.channel.send(`\`${msg.author.username}\`, could not find a spell with that id/name.`);
            //check if class owns spell.
            if (!user.class.spellbook.some(x => x.ability == spell?.id)) return msg.channel.send(`\`${msg.author.username}\`, your class cannot use the spell ${spell.icon}\`${spell.name}\`.`);
            //check if user is high enough level for the spell.
            const slvl = user.class.spellbook.find(x => x.ability == spell?.id)?.level!;
            if (user.level < slvl) return msg.channel.send(`\`${msg.author.username}\`, you are not high enough level to use that spell. (requirement: \`${slvl}\`)`);
            //check if user has the spell equipped already
            if (user.abilities.some((x) => x.ability?.data.id == spell?.id)) return msg.channel.send(`\`${msg.author.username}\`, you already have this spell equipped.`);

            const abStrings: string[] = [];
			for (const ab of user.abilities)
			{
				if (!ab[1].ability) abStrings.push(`${numberToIcon(ab[0])} - ❌ __None__ ❌`);
				else abStrings.push(`${numberToIcon(ab[0])} - __${ab[1].ability.data.name}__ <:cooldown:674944207663923219> ${ab[1].ability.data.cooldown}`);
			}

            const confirmEmbed = new Discord.RichEmbed()
            .setTitle(`In what slot would you like to equip __${spell.icon} ${spell.name}__?`)
            .setDescription(abStrings.join("\n"))
            .setColor(colors.yellow);
        
            //send and await reaction
            await msg.channel.send(confirmEmbed) as Discord.Message;
            user.reaction.isPending = true;
            try 
            {
                const rr = (await msg.channel.awaitMessages((m: Discord.Message) => m.author.id == msg.author.id, { time: 30000, maxMatches: 1 })).first();
                user.reaction.isPending = false;
                if (!rr || !rr.content ||isNaN(+rr.content)) return msg.channel.send(`\`${msg.author.username}\`, wrong input. Exptected a number, please try again.`);
    
                const selectedSlot = clamp(+rr.content,1,user.abilities.size);
                user.abilities.set(selectedSlot, {ability: new UserAbility(spell)});
                msg.channel.send(`\`${msg.author.username}\` has equipped __${spell.icon} ${spell.name}__ in slot ${selectedSlot}.`);
            }
            catch (err) { user.reaction.isPending = false; }
        }
    },
    {
		name: 'use',
        aliases: [],
        category: CC.Equipment,
		description: 'use an item.',
        usage: `[prefix]use [itemName/itemID]`,
        executeWhileTravelling: true,
        mustBeRegistered: true,
		async execute(msg: Discord.Message, args, user: User) 
		{
            //check if args are correct
            if (args.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you did not provide what to use.\n${this.usage}`);

            //check if item exists
            const {item, amount, errormsg} = getItemAndAmountFromArgs(args,user);
            if (!item && errormsg) return msg.channel.send(`\`${msg.author.username}\`, ${errormsg}`);
            await user.useItem(item!, msg, amount);
        }
    },
    {
		name: 'explore',
        aliases: ['adv','adventure','e'],
        category: CC.Fighting,
		description: 'Explore in your current zone.',
        usage: `[prefix]explore`,
        executeWhileTravelling: false,
        mustBeRegistered: true,
        cooldown: { name: "explore", duration: 60 },
		execute(msg: Discord.Message, args: string[], user: User) 
		{
            const zone = user.getZone();
            const enemies = zone.enemies.filter(x => user.level >= x.min_encounter_level);
            if (enemies.length == 0) return msg.channel.send(`\`${msg.author.username}\`, Could not find any enemies in this zone.`);
            const ze = enemies[randomIntFromInterval(0,enemies.length-1,true)];

            const enemy = new Enemy(user, ze);
            let dmgTaken = 0;
            let counter = 0;
            let died = false;
            do
            {
                //User attacks
                if (counter % 2 == 0) enemy.takeDamage(user.dealDamage(85).dmg,true, undefined);
                //enemy attacks
                else 
                {
                    const r = user.takeDamage(enemy.dealDamage(85).dmg, true, undefined);
                    dmgTaken += r.dmgTaken;
                    died = r.died;
                }
                counter++;
            }
            while(died == false && enemy.hp > 0);

            if (died)
            {
                const embed = new Discord.RichEmbed()
                .setColor(colors.red)
                .setTitle(`⚔️ Exploration Failed! ❌`)
                .setDescription(
                `\`${msg.author.username}\` explored **${zone.name}** and was defeated by **a level ${enemy.level} ${enemy.name}**.\n`+
                `**\`${msg.author.username}\` has lost 1 level as death penalty!**\n`)
                .setTimestamp()
                .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
                
                user.onDeath();

                msg.channel.send(embed);
            }
            else
            {
                const embed = new Discord.RichEmbed()
                .setColor(colors.green)
                .setTitle(`⚔️ Exploration Success! ✅`)
                .setDescription(
                `\`${msg.author.username}\` explored **${zone.name}** and **killed a level ${enemy.level} ${enemy.name}**.\n`+
                `\`${msg.author.username}\` took **${displayRound(dmgTaken)} damage** and gained **${displayRound(enemy.exp)} exp**.\n`+
                `Their remaining hp is **${displayRound(user.hp)}/${displayRound(user.getStats().base.hp)}**.`)
                .setTimestamp()
                .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
                
                user.gainExp(enemy.exp,msg);
                let rewardString = "";
                for (const cd of enemy.currencyDrops)
                {
                    const c = DataManager.getCurrency(cd.id);
                    user.getCurrency(cd.id).value += cd.amount;
                    rewardString += `${c?._id} - ${c?.icon} ${cd.amount} ${c?.name}\n`;
                }
                for (const id of enemy.itemDrops)
                {
                    const i = DataManager.getItem(id.id)!;
                    user.addItemToInventoryFromId(id.id, id.amount);
                    rewardString += `${i._id} - ${i.icon} __${i.name}__ ${id.amount ? `x${id.amount}` : ""}\n`;
                }
                if (rewardString.length > 0) embed.addField("**Rewards**",rewardString);
                msg.channel.send(embed);
                
                if (!user.foundBosses.includes(zone.boss) && randomIntFromInterval(0,100) <= 3.2)
                {
                    user.foundBosses.push(zone.boss);
                    msg.channel.send(`**\`${msg.author.username}\` has found the lair of \`${zone.name}'s\` boss!**`);
                }
            }
        }
    },
    {
		name: 'weekly',
        aliases: [],
        category: CC.Cooldowns,
		description: 'Claim a weekly reward!.',
        usage: `[prefix]weekly`,
        cooldown: {name: "weekly", duration: 604800},
        executeWhileTravelling: true,
        mustBeRegistered: true,
		execute(msg: Discord.Message, args, user: User) 
		{
            const embed = new Discord.RichEmbed()
            .setTitle(`Weekly Reward -- ${msg.author.username}`)
            .setDescription(`\`${msg.author.username}\` has claimed their weekly reward!`)
            .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
            .setColor('#fcf403');
            let rewardString = "";
            const multiplier = user.getPatreonRank() ? user.getPatreonRank()!.weekly_reward_multiplier : 1;
            const coins = Math.round(randomIntFromInterval(10,50) * multiplier);
            user.currencies.get(1)!.value+= coins;
            rewardString += `${DataManager.getCurrency(1)?.icon} __${DataManager.getCurrency(1)?.name}__ x${coins}\n`;
            const material = DataManager.items.filter(x => x instanceof DbMaterialItem && x.quality < 2).random();
            const materialAmount = Math.round(randomIntFromInterval(Math.abs(material.quality - 4), Math.abs(material.quality - 4)*2) * multiplier);
            rewardString += `${material._id} - ${material.icon} __${material.name}__ x${materialAmount}\n`;
            user.addItemToInventory(new MaterialItem(material._id, materialAmount));
            embed.addField(`Rewards:`, rewardString);
            msg.channel.send(embed);
        }
    },
    {
		name: 'daily',
        aliases: [],
        category: CC.Cooldowns,
		description: 'Claim a daily reward!.',
        usage: `[prefix]daily`,
        cooldown: {name: "daily", duration: 86400},
        executeWhileTravelling: true,
        mustBeRegistered: true,
		execute(msg: Discord.Message, args, user: User) 
		{
            const embed = new Discord.RichEmbed()
            .setTitle(`Daily Reward -- ${msg.author.username}`)
            .setDescription(`\`${msg.author.username}\` has claimed their daily reward!`)
            .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
            .setColor('#fcf403');
            let rewardString = "";
            const multiplier = user.getPatreonRank() ? user.getPatreonRank()!.daily_reward_multiplier : 1;
            const coins = Math.round(randomIntFromInterval(2,10) * multiplier);
            user.currencies.get(1)!.value+= coins;
            rewardString += `${DataManager.getCurrency(1)?.icon} __${DataManager.getCurrency(1)?.name}__ x${coins}\n`;
            const material = DataManager.items.filter(x => x instanceof DbMaterialItem && x.quality <= 2).random();
            const materialAmount = Math.round(randomIntFromInterval(Math.abs(material.quality - 4), Math.abs(material.quality - 4)*1.5) * multiplier);
            rewardString += `${material._id} - ${material.icon} __${material.name}__ x${materialAmount}\n`;
            user.addItemToInventory(new MaterialItem(material._id, materialAmount));
            embed.addField(`Rewards:`, rewardString);
            msg.channel.send(embed);
        }
    },
    {
        name: 'vote',
        category: CC.Cooldowns,
        executeWhileTravelling: true,
		aliases: [],
		description: 'Get some rewards by voting for our bot!',
		usage: `[prefix]vote`,
		async execute(msg: Discord.Message) 
		{
            const user = DataManager.getUser(msg.author.id);
            if (user)
            {
                const cd = user.getCooldown('vote');
                if (cd) return msg.channel.send(`Your vote is on cooldown for another ${cd}`);			
            }
            msg.channel.send(`You can vote for our discord bot here:\nhttps://top.gg/bot/646764666508541974/vote`);			
		},	
	},
    {
		name: 'travel',
		category: CC.Fighting,
		aliases: ['travelling'],
		description: 'Travel to another zone.',
        usage: `[prefix]travel [Zone]`,
        executeWhileTravelling: false,
        mustBeRegistered: true,
		async execute(msg: Discord.Message, args: string[], user: User) 
		{
            if (args.length == 0)
            {
                const embed = new Discord.RichEmbed()
                .setTitle(`Travelling -- Unlocked zones: ${msg.author.username}`)
                .setDescription(`To travel you must enter what zone you'd like to travel to, here is a list of your unlocked zones.`)
                .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
                .setColor('#fcf403');

                const zoneString = user.getUnlockedZones().map(x => `**${x.name}**\nlvl: ${x.levelSuggestion} | loc: ${x.loc.x}, ${x.loc.y}\n\n`);
                zoneString.length > 0 ? embed.addField("Zones:", zoneString) : embed.addField("Zones:", "You have no unlocked zones");
                return msg.channel.send(embed);
            }

            const inputName = args.map(x => x.trim()).join(" ").toLowerCase();
            const zone = DataManager.zones.find(x => x.name.toLowerCase() == inputName);

            if (!zone) return msg.channel.send(`\`${msg.author.username}\`, could not find a zone with name: \`${inputName}\``);
            if (user.zone == zone._id) return msg.channel.send(`\`${msg.author.username}\`, you are already in the zone: \`${zone.name}\``);
            if (!user.unlockedZones.includes(zone._id)) return msg.channel.send(`\`${msg.author.username}\`, you have not unlocked the zone \`${zone.name}\` yet.`);

            const currentZone = user.getZone();
            const distance = Math.abs(currentZone.loc.x - zone.loc.x) + Math.abs(currentZone.loc.y - zone.loc.y);

            //calculate travel time and apply duration reductions.
            const pRank = user.getPatreonRank();
            let reduction = pRank ? pRank.travel_cooldown_reduction : 0;
            const travelTime = (cf.chunk_travel_time * distance) * clamp(1 - reduction, 0, 1); //in seconds

            //await user confirm
            if (!await awaitConfirmMessage(`Travel to ${zone.name} - ${msg.author.username}`,`The travel time will be **${formatTime(travelTime*1000)}**.\n*During this period you will not be able to use some of the commands.*\n**Are you sure you would like to travel to ${zone.name}?**`,msg,user)) return;
            
            //Add to traveling cds
            const d = new Date();
            
            if (client.guilds.get(cf.official_server)?.members.get(user.userID)?.roles.has("651567406967291904")) reduction += 0.1;
            d.setSeconds(d.getSeconds() + travelTime);
        
            user.commandCooldowns.set("travel",new CronJob(d, 
                function(this: {user: User; channel: Discord.TextChannel; destination: Zone}) 
                {
                    user.zone = this.destination._id;
                    this.channel.send(`\`${msg.author.username}\` has arrived at ${this.destination.name}.`);
                    this.user.commandCooldowns.delete("travel");
                }, undefined, true, undefined, {user: user, channel: msg.channel, destination: zone}));

            msg.channel.send(`\`${msg.author.username}\` has started travelling to ${zone.name}.`);
            
		},
    },
    {
		name: 'canceltravel',
		category: CC.Fighting,
		aliases: ['ctravel'],
		description: 'cancel travelling to another zone.',
        usage: `[prefix]canceltravel`,
        executeWhileTravelling: true,
        mustBeRegistered: true,
		async execute(msg: Discord.Message, args: string[], user: User) 
		{
            const travelCd = user.commandCooldowns.get('travel');
            if (!travelCd) return msg.channel.send(`\`${msg.author.username}\`, you are not travelling.`);
            travelCd.stop();
            user.commandCooldowns.delete('travel');
            return msg.channel.send(`\`${msg.author.username}\`, you have stopped travelling.`);
		},
    },
    {
		name: 'boss',
		category: CC.Fighting,
		aliases: ['travelling'],
		description: "Fight the current zone's boss. **You must unlock this first by exploring.**",
        usage: `[prefix]boss`,
        executeWhileTravelling: false,
        mustBeRegistered: true,
		async execute(msg: Discord.Message, args: string[], user: User) 
		{  
            const cd = user.getCooldown('boss');
            if (cd) return msg.channel.send(`That command is on cooldown for another ${cd}`);
            if (!user.foundBosses.includes(user.getZone().boss)) return msg.channel.send(`\`${msg.author.username}\`, you have not found the boss of \`${user.getZone().name}\` yet. To find it, explore some more!`);
            
            const bd = DataManager.getBossData(user.getZone().boss);
            if (!bd) return msg.channel.send(`\`${msg.author.username}\`, a problem occured getting the boss data. Please inform an administrator.`);
            if (user.abilities.filter(x => x.ability != undefined).size == 0) return msg.channel.send(`\`${msg.author.username}\`, you cannot enter a turn based battle without abilities equipped.`);

            const boss = new Boss(bd);

            if (!await awaitConfirmMessage(`Are you sure you would like to battle **${bd?.name}**?`, `⚠️ The suggested minimum level requirement is ${bd?.level}. ⚠️\n\n`, msg, user, bd.portraitURL, [{name: "**Stats**", value: `❤️ ${displayRound(boss.stats.max_hp)}\n🗡️ ${displayRound(boss.stats.atk)}\n🛡️ ${displayRound(boss.stats.def)}\n⚡ ${displayRound(boss.stats.acc)}`, inline: false}, {name: "**Abilities**", value: `${boss.abilities.map(x => `${x.data.icon} ${x.data.name}`).join("\n")}`, inline: true}])) return;
        
            const bs = new ZoneBossSession(msg.author, user, msg.channel as Discord.TextChannel, boss);
            DataManager.sessions.set(msg.author.id, bs);
            await bs.initialize();
		},
    },
];

export function SetupCommands() {for (const cmd of cmds) commands.set(cmd.name, cmd);}