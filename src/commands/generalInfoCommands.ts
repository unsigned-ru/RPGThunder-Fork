import Discord from "discord.js"
import { commands } from "../main";
import { groupArrayBy, round, CC, getServerPrefix } from "../utils";
import { _equipmentItem, _materialItem, _consumableItem, _anyItem } from "../classes/items";
import { DataManager } from "../classes/dataManager";
import {_command } from "../interfaces";
import { _class } from "../classes/class";

export const cmds: _command[] = 
[
    {
		name: 'help',
		category: CC.GeneralInfo,
		aliases: ['commands'],
		executeWhileTravelling: true,
		description: 'List help for all commands.',
		usage: `[prefix]help`,
		execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				if (args.length == 0)
				{
					var prefix = getServerPrefix(msg);
					const embed = new Discord.RichEmbed()
					.setAuthor(`Add ${prefix} before any command!`,'http://159.89.133.235/DiscordBotImgs/logo.png')
					.setColor('#fcf403') //Yelow⛏️
					.setTitle(`**Commands**`)
					.setDescription(`**Are you a new user? Type \`${prefix}register\` to get started!**\n\n`+
					`*Note: Thunder RPG is still in development. New features are being rolled out actively and user accounts will be wiped on official release.*\n\n**The game recently wiped on 1.31.20 as a completely reworked balance system was implemented. Thank you for your understanding, and enjoy!**`)					
					.setTimestamp()
					.setFooter(`use ${prefix}help [command] to get extra info about the command.`, 'http://159.89.133.235/DiscordBotImgs/logo.png');

                    for (let ce of groupArrayBy(commands.array(),"category")) 
                    {
                        if (ce[0] == -1) continue;
                        embed.addField(`${ce[0]}`, ce[1].map(x => `\`${x.name}\``).join(","))
                    }
                    embed.addField('\u200B',`[Invite](https://discordapp.com/oauth2/authorize?client_id=646764666508541974&permissions=8&scope=bot) | [Support Server](https://discord.gg/V4EaHNt) | [Donate](https://donatebot.io/checkout/646062255170912293)`)

					return msg.channel.send(embed);
				}

				//get command by alias or name
				var cmd;
				if (commands.has(args[0].toLowerCase())) cmd = commands.get(args[0].toLowerCase());
				else if (commands.find((x:_command) => x.aliases.includes(args[0].toLowerCase()))) cmd = commands.find((x: _command) => x.aliases.includes(args[0].toLowerCase()));
				
				if (!cmd) throw "Could not find a command with that name!";

				//Create an embed with its info
				var prefix = getServerPrefix(msg);
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow⛏️
				.setTitle(`**Command info -- ${cmd.name}**`)
				.setDescription(cmd.description)
				.addField("**Info**",
				`**Usage: \`${cmd.usage.replace("[prefix]",prefix)}\`**\n`+
				`**Aliases:** ${cmd.aliases.map((x:string) => "`"+x+"`").join(",")}\n`+
				`**Can execute while travelling:** \`${cmd.executeWhileTravelling == true ? "`yes`":"`no`"}\``)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

				//send the embed
				return msg.channel.send(embed);
			}
			catch(err)
			{
				msg.channel.send(err);
				console.log(err);
			}
		},	
	},
	{
		name: 'itemdata',
		category: CC.GeneralInfo,
		executeWhileTravelling: true,
		aliases: ['id'],
		description: 'Shows all the information about an item.',
		usage: `[prefix]itemdata [itemID/ItemName]`,
		execute(msg: Discord.Message, args: string[]) 
		{
			if (args.length == 0 && parseInt(args[0])) return msg.channel.send(`Please enter the id of the item.`)
			let item : _anyItem | undefined;
			if(!isNaN(+args[0])) item = DataManager.getItem(+args[0]);
			else item = DataManager.getItemByName(args.join(" "));
			if (!item) return msg.channel.send(`\`${msg.author.username}\`, could not find an item with that id/name.`);
			if (item instanceof _equipmentItem)
			{
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`Item #${item._id}: ${item.icon} ${item.name}`)
				.setDescription(item.description)

				.addField("Info:",
				`**Quality:** ${item.getQuality().icon} ${item.getQuality().name}\n`+
				`**Slot(s):** ${item.getSlots().map(x => x.name).join(" OR ")}\n`+
				`**Type:** ${item.getType().name}\n`+
				`${item.slots.includes(1) || item.slots.includes(2) ? `**TwoHand:** ${item.two_hand}\n` : ``}`+
				`**Level Requirement:** ${item.level_requirement}\n`+
				`**Sell Price:** ${item.sell_price}`,true)
			
				.addField("Stats:",
				`🗡️**ATK:** ${round(item.stats.base.atk)}\n`+
				`🛡️**DEF:** ${round(item.stats.base.def)}\n`+
				`⚡**ACC:** ${round(item.stats.base.acc)}\n`,true)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
			
				msg.channel.send(embed);
			}
			else if (item instanceof _consumableItem)
			{
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`Item #${item._id}: ${item.icon} ${item.name}`)
				.setDescription(item.description)
				.addField("Info:",
				`**Quality:** ${item.getQuality().icon} ${item.getQuality().name}\n`+
				`**Type:** Material\n`+
				`**Effects:** ${item.getEffectsString().length==0 ? "None" : `\n${item.getEffectsString()}`}`+
				`**Sell Price:** ${item.sell_price}`)

				msg.channel.send(embed);
			}
			else if (item instanceof _materialItem)
			{
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`Item #${item._id}: ${item.icon} ${item.name}`)
				.setDescription(item.description)
				.addField("Info:",
				`**Quality:** ${item.getQuality().icon} ${item.getQuality().name}\n`+
				`**Type:** Material\n`+
				`**Sell Price:** ${item.sell_price}`)

				msg.channel.send(embed);
			}
		},
	},
	{
		name: 'zones',
		category: CC.GeneralInfo,
		executeWhileTravelling: true,
		aliases: ['areas'],
		description: 'List all the available zones.',
		usage: `[prefix]zones`,
	 	execute(msg: Discord.Message, args: string[]) 
		{
			var zoneString = "";
			for (var zone of DataManager.zones.values()) zoneString += `**${zone.name}** | lvl: ${zone.level_suggestion}\n`;
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow
			.setTitle(`**Available Zones**`)
			.addField("Zones", zoneString)
			.setTimestamp()
			.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
			
			msg.channel.send(embed);
		},
	},
	{
		name: 'classes',
		category: CC.GeneralInfo,
		executeWhileTravelling: true,
		aliases: [],
		description: 'List all the available classes.',
		usage: `[prefix]classes`,
	 	execute(msg: Discord.Message, args: string[]) 
		{
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow⛏️
			.setTitle(`**Available classes**`)
			.setTimestamp()
			.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

			for (var c of DataManager.classes) embed.addField(`**${c[1].icon} ${c[1].name}**`, c[1].description);

			msg.channel.send(embed);
		},
	},
	{
		name: 'classinfo',
		category: CC.GeneralInfo,
		aliases: ['cinfo', 'ci'],
		executeWhileTravelling: true,
		description: 'Shows all the information about the specified class.',
		usage: `[prefix]classinfo [Optional: Classname]`,
		execute(msg: Discord.Message, args: string[]) 
		{
			var c: _class;

			if (args.length == 0) 
			{
				let user = DataManager.getUser(msg.author.id)
				if (!user) return msg.channel.send(`\`${msg.author.username}\` is not registered.`)
				else c = user.class;
			}
			else
			{
				let inputName = args.join(" ").toLowerCase();
				let tempc = DataManager.classes.find(x => x.name.toLowerCase() == inputName);
				if (!tempc) return msg.channel.send(`\`${msg.author.username}\`, could not find a class with name \`${inputName}\``);
				else c = tempc;
			}

			//We have class info, create embed
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow⛏️
			.setTitle(`**Class Info -- ${c.icon} ${c.name}**`)
			.setDescription(c.description)
			.addField("Item Types", c.getTypes().map(x => `\`${x.name}\``).join(","))
			.setTimestamp()
			.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
			msg.channel.send(embed);
		},
	},
]

export function SetupCommands()
{
    for (let cmd of cmds)
    {
        commands.set(cmd.name, cmd);
        console.log("command: '"+cmd.name+"' Registered.");
    };
}