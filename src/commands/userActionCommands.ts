import Discord from "discord.js"
import { commands, dbl } from "../main";
import { DataManager } from "../classes/dataManager";
import { randomIntFromInterval, CC, round, awaitConfirmMessage, colors, getItemAndAmountFromArgs } from "../utils";
import { _command} from "../interfaces";
import { User } from "../classes/user";
import { _anyItem, _equipmentItem, _materialItem, MaterialItem } from "../classes/items";
import cf from "../config.json"
import { CronJob } from "cron";
import { Enemy } from "../classes/enemy";
import { Zone } from "../classes/zone";

export const cmds: _command[] = 
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

            for (var c of DataManager.classes) embed.addField(`**${c[1].icon} ${c[1].name}**`, c[1].description);
            msg.channel.send(embed);

            try
            {
                var rr = await msg.channel.awaitMessages((m:Discord.Message) => m.author.id == msg.author.id,{time: 100000, maxMatches: 1});
                var selectedClass = DataManager.classes.find(x => rr.first().content.toLowerCase().includes(x.name.toLowerCase()));
                if (!selectedClass) return msg.channel.send("Did not find a class with that name.");
                DataManager.registerUser(msg.author,selectedClass);
                msg.channel.send(`You have been registered as the class ${selectedClass.name}`);
            }
            catch(err) { console.log(err); return; }
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
            let {item, amount, errormsg} = getItemAndAmountFromArgs(args,user);
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
        executeWhileTravelling: true,
        mustBeRegistered: true,
        cooldown: { name: "explore", duration:60 },
		execute(msg: Discord.Message, args: string[], user: User) 
		{
            let zone = user.getZone();
            let enemies = zone.enemies.filter(x => user.level >= x.min_encounter_level);
            if (enemies.length == 0) return msg.channel.send(`\`${msg.author.username}\`, Could not find any enemies in this zone.`);
            let ze = enemies[randomIntFromInterval(0,enemies.length-1,true)]

            let enemy = new Enemy(user, ze);
            let dmgTaken = 0;
            let counter = 0;
            let died = false;
            do
            {
                //User attacks
                if (counter % 2 == 0) enemy.takeDamage(user.dealDamage());
                //enemy attacks
                else 
                {
                    let r = user.takeDamage(enemy.dealDamage());
                    dmgTaken += r.dmgTaken;
                    if (r.died) died = r.died;
                };
                counter++;
            }
            while(died == false && enemy.hp > 0)

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

                msg.channel.send(embed);
            }
            else
            {
                const embed = new Discord.RichEmbed()
                .setColor(colors.green)
                .setTitle(`⚔️ Exploration Success! ✅`)
                .setDescription(
                `\`${msg.author.username}\` explored **${zone.name}** and **killed a level ${enemy.level} ${enemy.name}**.\n`+
                `\`${msg.author.username}\` took **${round(dmgTaken)} damage** and gained **${round(enemy.exp)} exp**.\n`+
                `Their remaining hp is **${round(user.hp)}/${user.getStats().base.hp}**.`)
                .setTimestamp()
                .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
                
                user.gainExp(enemy.exp,msg);
                let rewardString = "";
                for (let cd of enemy.currencyDrops)
                {
                    let c = DataManager.getCurrency(cd.id);
                    user.getCurrency(cd.id).value += cd.amount;
                    rewardString += `${c._id} - ${c.icon} ${cd.amount} ${c.name}\n`
                }
                for (let id of enemy.itemDrops)
                {
                    let i = DataManager.getItem(id.id)!;
                    user.addItemToInventoryFromId(id.id, id.amount);
                    rewardString += `${i._id} - ${i.icon} __${i.name}__ ${id.amount ? `x${id.amount}` : ""}\n`
                }
                if (rewardString.length > 0) embed.addField("**Rewards**",rewardString);
                msg.channel.send(embed);
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
            var embed = new Discord.RichEmbed()
            .setTitle(`Weekly Reward -- ${msg.author.username}`)
            .setDescription(`\`${msg.author.username}\` has claimed their weekly reward!`)
            .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
            .setColor('#fcf403')
            let rewardString = "";
            var coins = randomIntFromInterval(10,50, true);
            user.currencies.get(1)!.value+= coins;
            rewardString += `${DataManager.getCurrency(1).icon} __${DataManager.getCurrency(1).name}__ x${coins}\n`
            var material = DataManager.items.filter(x => x instanceof _materialItem && x.quality < 4).random();
            let materialAmount = randomIntFromInterval(Math.abs(material.quality - 4), Math.abs(material.quality - 4)*2, true);
            rewardString += `${material._id} - ${material.icon} __${material.name}__ x${materialAmount}\n`
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
            var embed = new Discord.RichEmbed()
            .setTitle(`Daily Reward -- ${msg.author.username}`)
            .setDescription(`\`${msg.author.username}\` has claimed their daily reward!`)
            .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
            .setColor('#fcf403')
            let rewardString = "";
            var coins = randomIntFromInterval(2,10,true);
            user.currencies.get(1)!.value+= coins;
            rewardString += `${DataManager.getCurrency(1).icon} __${DataManager.getCurrency(1).name}__ x${coins}\n`
            var material = DataManager.items.filter(x => x instanceof _materialItem && x.quality < 4).random();
            let materialAmount = randomIntFromInterval(Math.abs(material.quality - 4), Math.abs(material.quality - 4)*1.5,true);
            rewardString += `${material._id} - ${material.icon} __${material.name}__ x${materialAmount}\n`
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
            if (await dbl.hasVoted(msg.author.id) == true) return msg.channel.send(`\`${msg.author.username}\`, you have already voted in the past 12hrs, it is still on cooldown.`);
            else msg.channel.send(`You can vote for our discord bot here:\nhttps://top.gg/bot/646764666508541974/vote`);			
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
		async execute(msg: Discord.Message, args: string[], user:User) 
		{
            if (args.length == 0)
            {
                var embed = new Discord.RichEmbed()
                .setTitle(`Travelling -- Unlocked zones: ${msg.author.username}`)
                .setDescription(`To travel you must enter what zone you'd like to travel to, here is a list of your unlocked zones.`)
                .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
                .setColor('#fcf403')

                let zoneString = user.getUnlockedZones().map(x => `**${x.name}**\nlvl: ${x.level_suggestion} | loc: ${x.loc.x}, ${x.loc.y}\n\n`);
                zoneString.length > 0 ? embed.addField("Zones:", zoneString) : embed.addField("Zones:", "You have no unlocked zones");
                return msg.channel.send(embed);
            }

            var inputName = args.map(x => x.trim()).join(" ").toLowerCase();
            var zone = DataManager.zones.find(x => x.name.toLowerCase() == inputName);

            if (!zone) return msg.channel.send(`\`${msg.author.username}\`, could not find a zone with name: \`${inputName}\``);
            if (user.zone == zone._id) return msg.channel.send(`\`${msg.author.username}\`, you are already in the zone: \`${zone.name}\``);
            if (!user.unlocked_zones.includes(zone._id)) return msg.channel.send(`\`${msg.author.username}\`, you have not unlocked the zone \`${zone.name}\` yet.`);

            var currentZone = user.getZone();
            var distance = Math.abs(currentZone.loc.x - zone.loc.x) + Math.abs(currentZone.loc.y - zone.loc.y);

            //Todo: add perks for travel time reduction here
            var travelTime = cf.chunk_travel_time * distance; //in seconds

            //await user confirm
            if (!await awaitConfirmMessage(`Travel to ${zone.name} - ${msg.author.username}`,`The travel time will be **${travelTime}s**.\n*During this period you will not be able to use some of the commands.*\n**Are you sure you would like to travel to ${zone.name}?**`,msg,user)) return;
            
            //Add to traveling cds
            var d = new Date();
            d.setSeconds(d.getSeconds() + travelTime);
        
            user.command_cooldowns.set("travel",new CronJob(d, 
                function(this: {user: User, channel: Discord.TextChannel, destination: Zone}) 
                {
                    user.zone = this.destination._id;
                    this.channel.send(`\`${msg.author.username}\` has arrived at ${this.destination.name}.`);
                    this.user.command_cooldowns.delete("travel");
                }, undefined, true, undefined, {user: user, channel: msg.channel, destination: zone}));

            msg.channel.send(`\`${msg.author.username}\` has started travelling to ${zone.name}.`);
            
		},
    },
    {
		name: 'i',
		category: CC.hidden,
		aliases: ['travelling'],
		description: 'Travel to another zone.',
        usage: `[prefix]travel [Zone]`,
        executeWhileTravelling: false,
        mustBeRegistered: true,
		async execute(msg, args: string[], user:User) 
		{
            user.addItemToInventoryFromId(+args[0], +args[1])
		},
	},
]

export function SetupCommands()
{
    for (let cmd of cmds)
    {
        commands.set(cmd.name, cmd);
    };
}