import Discord from "discord.js";
import { commands } from "../RPGThunder";
import { groupArrayBy, CC, getServerPrefix, colors, displayRound } from "../utils";
import { DbEquipmentItem, DbMaterialItem, DbConsumableItem, _anyItem } from "../classes/items";
import { DataManager } from "../classes/dataManager";
import { Class } from "../classes/class";
import { CommandInterface } from "../interfaces";
import { Ability } from "../classes/ability";
import { InstantDamageEffect, InstantHealingEffect, DamageOverTimeDebuffEffect, HealingOverTimeBuffEffect, AbsorbBuffEffect, DamageReductionBuffEffect, InstantDrainLifeEffect, DamageImmunityBuffEffect } from "../classes/tb_effects";

export const cmds: CommandInterface[] = 
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
					const prefix = getServerPrefix(msg);
					const embed = new Discord.RichEmbed()
					.setAuthor(`Add ${prefix} before any command!`,'http://159.89.133.235/DiscordBotImgs/logo.png')
					.setColor(colors.yellow) //Yelow⛏️
					.setTitle(`**Commands**`)
					.setDescription(`**Are you a new user? Type \`${prefix}register\` to get started!**\n\n`+
					`*Note: Thunder RPG is still in development. New features are being rolled out actively and user accounts will be wiped on official release.*\n\n**The game recently wiped on 1.31.20 as a completely reworked balance system was implemented. Thank you for your understanding, and enjoy!**`)					
					.setTimestamp()
					.setFooter(`use ${prefix}help [command] to get extra info about the command.`, 'http://159.89.133.235/DiscordBotImgs/logo.png');

                    for (const ce of groupArrayBy(commands.array(),"category")) 
                    {
                        if (ce[0] == -1) continue;
                        embed.addField(`${ce[0]}`, ce[1].map(x => `\`${x.name}\``).join(","));
					}
					
					embed.addField(`🕵️ Administative 🕵️‍♀️`,`\`rpgthunder setprefix\`, \`rpgthunder prefix\`, \`rpgthunder resetprefix\`, \`blacklist\``);
					
                    embed.addField('\u200B',`[Invite](https://discordapp.com/oauth2/authorize?client_id=646764666508541974&permissions=8&scope=bot) | [Support Server](https://discord.gg/V4EaHNt) | [Patreon](https://www.patreon.com/rpgthunder) | [Donate](https://donatebot.io/checkout/646062255170912293)`);

					return msg.channel.send(embed);
				}

				//get command by alias or name
				let cmd;
				if (commands.has(args[0].toLowerCase())) cmd = commands.get(args[0].toLowerCase());
				else if (commands.find((x: CommandInterface) => x.aliases.includes(args[0].toLowerCase()))) cmd = commands.find((x: CommandInterface) => x.aliases.includes(args[0].toLowerCase()));
				
				if (!cmd) throw "Could not find a command with that name!";

				//Create an embed with its info
				const prefix = getServerPrefix(msg);
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow⛏️
				.setTitle(`**Command info -- ${cmd.name}**`)
				.setDescription(cmd.description)
				.addField("**Info**",
				`**Usage: \`${cmd.usage.replace("[prefix]",prefix)}\`**\n`+
				`**Aliases:** ${cmd.aliases.map((x: string) => "`"+x+"`").join(",")}\n`+
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
			if (args.length == 0 && parseInt(args[0])) return msg.channel.send(`Please enter the id of the item.`);
			let item: _anyItem | undefined;
			if(!isNaN(+args[0])) item = DataManager.getItem(+args[0]);
			else item = DataManager.getItemByName(args.join(" "));
			if (!item) return msg.channel.send(`\`${msg.author.username}\`, could not find an item with that id/name.`);
			if (item instanceof DbEquipmentItem)
			{
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`Item #${item._id}: ${item.icon} ${item.name}`)
				.setDescription(item.description)

				.addField("Info:",
				`**Quality:** ${item.getQuality().icon} ${item.getQuality().name}\n`+
				`**Slot(s):** ${item.getSlots().map(x => x.name).join(" OR ")}\n`+
				`**Type:** ${item.getType().name}\n`+
				`${item.slots.includes(1) || item.slots.includes(2) ? `**TwoHand:** ${item.twoHand}\n` : ``}`+
				`**Level Requirement:** ${item.levelRequirement}\n`+
				`**Sellable: ** ${item.sellable}\n`+
				`${item.sellable ? `**Sell Price:** ${item.sellPrice}\n` : ""}`+
				`**Soulbound: ** ${item.soulbound}\n`
				,true)
			
				.addField("Stats:",
				`🗡️**ATK:** ${displayRound(item.stats.base.atk)}\n`+
				`🛡️**DEF:** ${displayRound(item.stats.base.def)}\n`+
				`⚡**ACC:** ${displayRound(item.stats.base.acc)}\n`,true)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
			
				msg.channel.send(embed);
			}
			else if (item instanceof DbConsumableItem)
			{
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`Item #${item._id}: ${item.icon} ${item.name}`)
				.setDescription(item.description)
				.addField("Info:",
				`**Quality:** ${item.getQuality().icon} ${item.getQuality().name}\n`+
				`**Type:** Material\n`+
				`**Effects:** ${item.getEffectsString().length==0 ? "None" : `\n${item.getEffectsString()}`}`+
				`**Sellable: ** ${item.sellable}\n`+
				`${item.sellable ? `**Sell Price:** ${item.sellPrice}\n` : ""}`+
				`**Soulbound: ** ${item.soulbound}\n`);

				msg.channel.send(embed);
			}
			else if (item instanceof DbMaterialItem)
			{
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`Item #${item._id}: ${item.icon} ${item.name}`)
				.setDescription(item.description)
				.addField("Info:",
				`**Quality:** ${item.getQuality().icon} ${item.getQuality().name}\n`+
				`**Type:** Material\n`+
				`**Sellable: ** ${item.sellable}\n`+
				`${item.sellable ? `**Sell Price:** ${item.sellPrice}\n` : ""}`+
				`**Soulbound: ** ${item.soulbound}\n`);

				msg.channel.send(embed);
			}
		},
	},
	{
		name: 'spelldata',
		category: CC.GeneralInfo,
		executeWhileTravelling: true,
		aliases: ['sd'],
		description: 'Shows all the information about a spell.',
		usage: `[prefix]spelldata [spellID/spellName]`,
		execute(msg: Discord.Message, args: string[]) 
		{
			if (args.length == 0 && parseInt(args[0])) return msg.channel.send(`Please enter the id/name of the spell.`);
			let spell: Ability | undefined;
			if(!isNaN(+args[0])) spell = DataManager.getSpell(+args[0]);
			else spell = DataManager.getSpellByName(args.join(" "));
			if (!spell) return msg.channel.send(`\`${msg.author.username}\`, could not find a spell with that id/name.`);

			const embed = new Discord.RichEmbed()
			.setColor(colors.yellow) //Yelow
			.setTitle(`Spell #${spell.id}: ${spell.icon} ${spell.name}`)
			.setDescription(`Cooldown: \`${spell.cooldown}\` <:cooldown:674944207663923219>\n*${spell.description}*`);

			let effectCounter = 1;
			for (const e of spell.effects)
			{
				const infostrings: string[] = [];
				if (e instanceof InstantDamageEffect)
				{
					infostrings.push(`Type: \`Instant Damage\``);
					infostrings.push(`ATK Multiplier: \`x${e.multiplier}\``);
					infostrings.push(`Base Hit Chance: \`${e.baseHitChance}\` <:baseHitChance:674941186858942464>`);
					infostrings.push(`Max Damage: \`${e.maxDamage}\``);
				}
				if (e instanceof InstantHealingEffect)
				{
					infostrings.push(`Type: \`Instant Healing\``);
					infostrings.push(`ATK Multiplier: \`x${e.multiplier}\``);
					infostrings.push(`Base Hit Chance: \`${e.baseHitChance}%\` <:baseHitChance:674941186858942464>`);
					infostrings.push(`Max Healing: \`${e.maxHealing}\``);
				}
				if (e instanceof InstantDrainLifeEffect)
				{
					infostrings.push(`Type: \`Drain Life\``);
					infostrings.push(`ATK Multiplier: \`x${e.multiplier}\``);
					infostrings.push(`HEAL of ATK Multiplier: \`x${e.healingMultiplier}\``);
					infostrings.push(`Base Hit Chance: \`${e.baseHitChance}%\` <:baseHitChance:674941186858942464>`);
					infostrings.push(`Max Damage: \`${e.maxDamage}\``);
					infostrings.push(`Max Healing: \`${e.maxHealing}\``);
				}
				if (e instanceof DamageOverTimeDebuffEffect)
				{
					infostrings.push(`Type: \`Damage Over Time\``);
					infostrings.push(`ATK Multiplier: \`x${e.multiplier}\``);
					infostrings.push(`Duration: \`${e.duration}\` rounds`);
					infostrings.push(`Tick Interval: \`${e.interval}\``);
					infostrings.push(`Spread Damage Over Duration: \`${e.spread}\``);
					infostrings.push(`Success Chance: \`${e.successChance}%\``);
					infostrings.push(`Max Damage: \`${e.maxDamage}\``);
				}
				if (e instanceof HealingOverTimeBuffEffect)
				{
					infostrings.push(`Type: \`Healing Over Time\``);
					infostrings.push(`ATK Multiplier: \`x${e.multiplier}\``);
					infostrings.push(`Duration: \`${e.duration}\` rounds`);
					infostrings.push(`Tick Interval: \`${e.interval}\``);
					infostrings.push(`Spread Healing Over Duration: \`${e.spread}\``);
					infostrings.push(`Success Chance: \`${e.successChance}%\``);
					infostrings.push(`Max Healing: \`${e.maxHealing}\``);
				}
				if (e instanceof AbsorbBuffEffect)
				{
					infostrings.push(`Type: \`Absorb Buff\``);
					if (e.healthPercentage) infostrings.push(`Health Percentage: \`${e.healthPercentage * 100}%\``);
					if (e.amount) infostrings.push(`Amount: \`x${e.amount}\``);
					infostrings.push(`Duration: \`${e.duration}\` rounds`);
					infostrings.push(`Max Absorb: \`${e.maxHealing}\``);
				}
				if (e instanceof DamageReductionBuffEffect)
				{
					infostrings.push(`Type: \`Damage Reduction Buff\``);
					infostrings.push(`Damage Reduction: \`${e.multiplier*100}%\``);
					infostrings.push(`Duration: \`${e.duration}\` rounds`);
				}
				if (e instanceof DamageImmunityBuffEffect)
				{
					infostrings.push(`Type: \`Damage Immunity\``);
					infostrings.push(`Duration: \`${e.duration}\` rounds`);
				}

				embed.addField(`Effect #${effectCounter}`, `${infostrings.join("\n")}`);
				effectCounter++;
			}

			msg.channel.send(embed);
		},
	},
	{
		name: 'zones',
		category: CC.GeneralInfo,
		executeWhileTravelling: true,
		aliases: ['areas'],
		description: 'List all the available zones.',
		usage: `[prefix]zones`,
		execute(msg: Discord.Message) 
		{
			let zoneString = "";
			for (const zone of DataManager.zones.values()) zoneString += `**${zone.name}** | lvl: ${zone.levelSuggestion}\n`;
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
		execute(msg: Discord.Message) 
		{
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow⛏️
			.setTitle(`**Available classes**`)
			.setTimestamp()
			.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

			for (const c of DataManager.classes) embed.addField(`**${c[1].icon} ${c[1].name}**`, c[1].description);

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
			let c: Class;

			if (args.length == 0) 
			{
				const user = DataManager.getUser(msg.author.id);
				if (!user) return msg.channel.send(`\`${msg.author.username}\` is not registered.`);
				else c = user.class;
			}
			else
			{
				const inputName = args.join(" ").toLowerCase();
				const tempc = DataManager.classes.find(x => x.name.toLowerCase() == inputName);
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
	{
		name: 'donate',
		category: CC.Economy,
		aliases: ['patreon', 'pledge'],
		executeWhileTravelling: true,
		description: 'Shows more information about how to support RPG Thunder.',
		usage: `[prefix]donate`,
		execute(msg: Discord.Message) 
		{
			const embed = new Discord.RichEmbed()
			.setColor(colors.yellow)
			.setTitle(`✨ Support RPG Thunder ✨`)
			.setDescription(`*Are you enjoying this game?*\n*Would you like to help us in improving the quality and the rate at which we push out content?*\n**Then consider helping us out with funding the project!**`)
			.addField("<:patreonicon:680396659091570754> **Patreon** <:patreonicon:680396659091570754>", `[Patreon](https://www.patreon.com/rpgthunder) is a platform where you can buy a __recurring subscription for each month__. We have several tiers available __starting at as low as 2$/month__.\nThese tiers will get you __an assortiment of in-game benefits like cooldown reduction, improved daily and weekly rewards__ aswell as __a role in the official discord server__.\n[Check out our patreon!](https://www.patreon.com/rpgthunder)`)
			.addField("💳 **One-Time Donation** 💳", "If a monthly subscription doesn't fit your style but you still want to support us you can use [the donate bot](https://donatebot.io/checkout/646062255170912293) we have set up that __allows for one-time payments__. The one-time payment system is going to be __linked to a premium currency you can use in-game for an mostly cosmetic things__. When the premium currency officially launches, __all previous one-time purchases will be converted to the premium currency and added to your account!__\n[Check out the one-time payment!](https://donatebot.io/checkout/646062255170912293)")
			.setTimestamp();
			msg.channel.send(embed);
		}
	}
];

export function SetupCommands() {for (const cmd of cmds) commands.set(cmd.name, cmd);}