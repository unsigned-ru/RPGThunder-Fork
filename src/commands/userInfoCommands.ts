import Discord from "discord.js";
import { DataManager } from "../classes/dataManager";
import { CC, clamp, filterItemArray, sortItemArray, constructAbilityDataString, colors, numberToIcon, displayRound } from "../utils";
import { DbEquipmentItem, MaterialItem, EquipmentItem, ConsumableItem, anyItem, EasterEgg } from "../classes/items";
import { User } from "../classes/user";
import { CommandInterface } from "../interfaces";
import cf from "../config.json";
import { commands } from "../main";

export const cmds: CommandInterface[] = 
[
    {
		name: 'profile',
		category: CC.UserInfo,
		executeWhileTravelling: true,
		aliases: ['pf'],
		description: 'Shows a user profile containing their class, stats and currencies.',
		usage: `[prefix]profile [optional: @User]`,
		execute(msg: Discord.Message) 
		{	
			let targetUser: Discord.GuildMember;

			//check if there is a mentioned user to get the profile from.
			if (msg.mentions.members.size > 0 && msg.mentions.members.first()) targetUser = msg.mentions.members.first();
			else targetUser = msg.member;

			const user = DataManager.getUser(targetUser.id);
			if (!user) return msg.channel.send(`\`${targetUser.user.username}\` is not registered.`);
			const pRank = user.getPatreonRank();
			//Create an embedd with the profile data.
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow
			.setTitle(`User profile: ${targetUser.user.username}`)
			
			.addField("Info:",
			`**Class:** ${user.class.icon} ${user.class.name}\n`+
			`**Level:** ${user.level}\n`+
			`**Exp:** ${displayRound(user.exp)}/${displayRound(user.getRequiredExp())}\n`+
			`**Zone:** ${user.getZone().name}\n`+
			`**Rank:** ${pRank ? pRank.name : "None"}\n`
			,true);

			const s = user.getStats();
			embed.addField("Stats:",
			`❤️ ${displayRound(user.hp)} / ${displayRound(s.base.hp)} \n`+
			`🗡️ ${displayRound(s.total.atk)} (${displayRound(s.base.atk)} + ${displayRound(s.gear.atk)})\n`+
			`🛡️ ${displayRound(s.total.def)} (${displayRound(s.base.def)} + ${displayRound(s.gear.def)})\n`+
			`⚡ ${displayRound(s.total.acc)} (${displayRound(s.base.acc)} + ${displayRound(s.gear.acc)})\n`
			,true);
			embed.addBlankField(false);

			let equipmentString = "";
			for (const e of user.equipment)
			{
				if (e[1].item) 
				{
					const item = DataManager.getItem(e[1].item.id) as DbEquipmentItem;
					equipmentString += `${item.icon} ${item.name}`;
					if (e[0]== 1 && item.twoHand) equipmentString += ` [2H]`;
					equipmentString += `\n`;
				}
				///If we're wearing twohand then skip the offhand cycle
				else if (e[0] == 2 && user.isWearingTwoHand()) continue;
				else equipmentString += `❌\n`;
			}
			embed.addField("Equipment:",equipmentString,true);

			let currencyString = "";
			for (const c of user.currencies)
			{
				const currencyData = DataManager.getCurrency(c[0]);
				currencyString += `${currencyData?.icon} **${currencyData?.name}**: ${displayRound(c[1].value)}\n`;
			}
			embed.addField("Currencies:",currencyString,true)
			.setThumbnail(targetUser.user.avatarURL)
			.setTimestamp()
			.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
			
			msg.channel.send(embed);
		},
	},
	{
		name: 'equipment',
		category: CC.UserInfo,
		executeWhileTravelling: true,
		aliases: ['gear','gpf','eqpf'],
		description: 'Shows a user equipment in detail.',
		usage: `[prefix]equipment [optional: @User]`,
		execute(msg: Discord.Message) 
		{	
			let targetUser: Discord.GuildMember;

			//check if there is a mentioned user to get the profile from.
			if (msg.mentions.members.size > 0 && msg.mentions.members.first()) targetUser = msg.mentions.members.first();
			else targetUser = msg.member;

			const user = DataManager.getUser(targetUser.id);
			if (!user) return msg.channel.send(`\`${targetUser.user.username}\` is not registered.`);

			//Create an embedd with the profile data.
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow
			.setTitle(`User equipment: ${user.class.icon} ${targetUser.user.username}`);

			let equipmentString = "";
			for (const e of user.equipment)
			{
				if (e[1].item) 
				{
					const item = DataManager.getItem(e[1].item.id) as DbEquipmentItem;
					equipmentString += `${item._id} - ${item.icon} __${item.name}__`;
					if (item.twoHand) equipmentString += ` [2H]`;
					equipmentString += e[1].item.getDataString();
				}
				//If we're wearing twohand then skip the offhand cycle
				else if (e[0] == 2 && user.isWearingTwoHand()) continue;
				else equipmentString += `❌\n`;
			}
			embed.setDescription(equipmentString)
			.setTimestamp()
			.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
			
			msg.channel.send(embed);
		},
	},
	{
		name: 'professions',
		category: CC.UserInfo,
		executeWhileTravelling: true,
		aliases: ['pfs','ps'],
		description: 'Shows a users professions and their skill.',
		usage: `[prefix]profession [optional: @User]`,
		execute(msg: Discord.Message) 
		{	
			let targetUser: Discord.GuildMember;

			//check if there is a mentioned user to get the profile from.
			if (msg.mentions.members.size > 0 && msg.mentions.members.first()) targetUser = msg.mentions.members.first();
			else targetUser = msg.member;

			const user = DataManager.getUser(targetUser.id);
			if (!user) return msg.channel.send(`\`${targetUser.user.username}\` is not registered.`);

			//Create an embedd with the profile data.
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow
			.setTitle(`User Professions: ${targetUser.user.username}`);

			const professionStrings = [];
			for (const p of user.professions)
			{
				const pd = DataManager.getProfessionData(p[0]);
				professionStrings.push(`${pd?.icon} **${pd?.name}** [${p[1].skill}/${pd?.maxSkill}]`);
			}
			embed.setDescription(professionStrings.join("\n"))
			.setTimestamp()
			.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
			
			msg.channel.send(embed);
		},
	},
	{
		name: 'currencies',
		category: CC.UserInfo,
		executeWhileTravelling: true,
		mustBeRegistered: true,
		aliases: ['$','curr'],
		description: 'Shows your currencies',
		usage: `[prefix]currencies`,
		execute(msg: Discord.Message, args, user: User) 
		{	
			//Create an embedd with the currencies.
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow
			.setTitle(`User currencies: ${msg.author.username}`);

			let currencyString = "";
			for (const c of user.currencies)
			{
				const currencyData = DataManager.getCurrency(c[0]);
				currencyString += `${currencyData?.icon} **${currencyData?.name}**: ${displayRound(c[1].value)}\n`;
			}
			embed.addField("Currencies:",currencyString);
			msg.channel.send(embed);
		},
	},
	{
		name: 'experience',
		category: CC.UserInfo,
		executeWhileTravelling: true,
		mustBeRegistered: true,
		aliases: ['exp','lvl','level','xp'],
		description: 'Shows your progress in your level.',
		usage: `[prefix]experience`,
		execute(msg, args, user: User) 
		{	
			//Create an embedd with the currencies.
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow
			.setTitle(`User experience: ${user.class.icon} ${msg.author.username}`);

			const levelPercentage = (user.exp / user.getRequiredExp()) * 100;
			const progressBar = "<:expBar:674948948103790610>".repeat(Math.ceil(levelPercentage/(20/3))) + "<:emptyBar:674948948087013376>".repeat(15 - Math.ceil(levelPercentage/(20/3))); 


			embed.setDescription(
				`<:level:674945451866325002> ${user.level}\n`+
				`**exp:** ${displayRound(user.exp)}/${displayRound(user.getRequiredExp())}\n\n`+
				`${displayRound(levelPercentage)}%\n`+
				`${progressBar}`
				);
			
			msg.channel.send(embed);
		},
	},
	{
		name: 'health',
		category: CC.UserInfo,
		executeWhileTravelling: true,
		mustBeRegistered: true,
		aliases: ['hp'],
		description: 'Shows your remaining health.',
		usage: `[prefix]health`,
		execute(msg, args, user: User) 
		{	
			//Create an embedd with the currencies.
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow
			.setTitle(`User health: ${user.class.icon} ${msg.author.username}`);

			const hpPercentage = (user.hp / user.getStats().base.hp) * 100;
			const progressBar = "<:healthBar:674948947684622337>".repeat(Math.ceil(hpPercentage/(20/3))) + "<:emptyBar:674948948087013376>".repeat(15 - Math.ceil(hpPercentage/(20/3))); 

			embed.setDescription(
				`<:level:674945451866325002> ${user.level}\n`+
				`**HP:** ${displayRound(user.hp)}/${displayRound(user.getStats().base.hp)}\n\n`+
				`${displayRound(hpPercentage)}%\n`+
				`❤️ ${progressBar}`
				);
			
			msg.channel.send(embed);
		},
	},
	{
		name: 'inventory',
		category: CC.UserInfo,
		executeWhileTravelling: true,
		mustBeRegistered: true,
		aliases: ['inv','bag','bags'],
		description: 'Shows your progress in your level.',
		usage: `[prefix]inventory [page] -[query1] -[query2]...`,
		execute(msg, args, user: User) 
		{	
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403'); //Yelow

			const pages = [];
			let itemString = "";
			let maxItems = 8;
			let itemCounter = 0;
			let selectedPage = 1;

			//check for input of page to display
			if (!isNaN(+args[0])) {selectedPage = +args[0]; args.splice(0,1);}

			//check for input of -params
			for(const p of args.join(" ").split('-').slice(1).map(x => x.trim().split(" ")))
			{
				switch(p[0].toLowerCase())
				{
					case "maxitems":
						if (!isNaN(+p[1])) if (+p[1] < cf.inventory_maxItemsLimit && +p[1] > 0) maxItems = +p[1];
					break;
					case "sort":
						user.inventory = sortItemArray(p[1],user.inventory) as anyItem[];
					break;
				}
			}
			let cinventory = user.inventory.slice(); 
			for(const p of args.join(" ").split('-').slice(1).map(x => x.trim().split(" ")))
			cinventory = filterItemArray(p, cinventory) as anyItem[];
			
			for (const i of cinventory)
			{
				if (itemCounter >= maxItems) {pages.push(itemString); itemString = ""; itemCounter = 0;}
				const itemdata = i.getData()!;
				itemString += `${itemdata._id.toString().padEnd(3)} - ${itemdata.icon} __${itemdata.name}__`;
				if (i instanceof ConsumableItem || i instanceof MaterialItem || i instanceof EasterEgg) itemString += ` x${i.amount}`;
				itemString += `\n[${itemdata.getQuality().icon}`;
				if (i instanceof EquipmentItem) {const totalStats = i.getTotalStats(); itemString += `| 🗡️ ${displayRound(totalStats.atk)} | 🛡️ ${displayRound(totalStats.def)} | ⚡ ${displayRound(totalStats.acc)}`;}
				else if (i instanceof ConsumableItem) itemString += ``; 
				else if (i instanceof MaterialItem) itemString += ``;				
				itemString+= `]\n\n`;

				itemCounter++;
			}
			if (itemString.length > 0) pages.push(itemString);

			if (pages.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you have no items that fit your query.`);
			//clamp the selectedpage to the min and max values
			selectedPage = clamp(selectedPage, 1, pages.length);

			embed.setTitle(`__User inventory: ${msg.author.username}__ | Page ${selectedPage}/${pages.length}`);
			embed.setDescription(pages[selectedPage-1]);
			msg.channel.send(embed);
		},
	},
	{
		name: 'spellbook',
		category: CC.UserInfo,
		executeWhileTravelling: true,
		mustBeRegistered: true,
		aliases: [],
		description: 'Shows the abilities available to your class.',
		usage: `[prefix]spellbook [page] -[query1] -[query2]...`,
		execute(msg, args, user: User) 
		{	
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403'); //Yelow

			let showAll = false;
			const pages = [];
			let abilityString = "";
			let maxAbilities = 8;
			let abilityCounter = 0;
			let selectedPage = 1;

			//check for input of page to display
			if (!isNaN(+args[0])) {selectedPage = +args[0]; args.splice(0,1);}

			//check for input of -params
			for(const p of args.join(" ").split('-').slice(1).map(x => x.trim().split(" ")))
			{
				
				switch(p[0].toLowerCase())
				{
					case "maxitems":
						if (!isNaN(+p[1])) if (+p[1] < cf.inventory_maxItemsLimit && +p[1] > 0) maxAbilities = +p[1];
					break;
					case "all":
						showAll = true;
					break;
				}
			}
			const spellbook = showAll ? user.class.spellbook.slice() : user.class.spellbook.filter(x => x.level <= user.level).slice();

			for (const a of spellbook)
			{
				if (abilityCounter >= maxAbilities) {pages.push(abilityString); abilityString = ""; abilityCounter = 0;}
				const ad = DataManager.getAbility(a.ability);

				abilityString += `${ad.id} - ${ad.icon} __${ad.name}__\n`;
				abilityString += `${constructAbilityDataString(ad,a.level)}\n\n`;
				abilityCounter++;
			}
			if (abilityString.length > 0) pages.push(abilityString);

			if (pages.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you have no abilities that fit your query.`);

			//clamp the selectedpage to the min and max values
			selectedPage = clamp(selectedPage, 1, pages.length);

			embed.setTitle(`__User Spellbook: ${msg.author.username}__ | Page ${selectedPage}/${pages.length}`);
			embed.setDescription(pages[selectedPage-1]);
			msg.channel.send(embed);
		},
	},
	{
		name: 'spells',
		category: CC.UserInfo,
		executeWhileTravelling: true,
		mustBeRegistered: true,
		aliases: ['abilities'],
		description: 'Shows your current equipped abilities.',
		usage: `[prefix]spells`,
		execute(msg, args, user: User) 
		{	
			const embed = new Discord.RichEmbed()
			.setTitle(`Equipped Spells ${msg.author.username}`)
			.setColor(colors.yellow); //Yelow
			
			const abStrings: string[] = [];
			for (const ab of user.abilities)
			{
				if (!ab[1].ability) abStrings.push(`${numberToIcon(ab[0])} - ❌ __None__ ❌`);
				else abStrings.push(`${numberToIcon(ab[0])} - __${ab[1].ability.data.icon} ${ab[1].ability.data.name}__ <:cooldown:674944207663923219> ${ab[1].ability.data.cooldown}`);
			}
			embed.setDescription(abStrings.join("\n"));
			msg.channel.send(embed);
		},
	},
	{
		name: 'cooldown',
        aliases: ['cd'],
        category: CC.Cooldowns,
		description: 'Check your remaining cooldowns!',
        usage: `[prefix]cooldown`,
        executeWhileTravelling: true,
        mustBeRegistered: true,
		async execute(msg: Discord.Message, args, user: User) 
		{
			const cdCmds = commands.filter(x => x.cooldown != undefined);
			
			const embed = new Discord.RichEmbed()
            .setTitle(`User cooldowns -- ${msg.author.username}`)
            .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
            .setColor('#fcf403');
			let cdString = "";
			const alreadyDone: string[] = [];
			for (const cmd of cdCmds)
			{
				if (alreadyDone.includes(cmd[1].cooldown!.name)) continue;
				const remainingcd = user.getCooldown(cmd[1].cooldown!.name);
				if (remainingcd) cdString += `❌ - ${cmd[1].cooldown!.name} 🕙${remainingcd}\n`;
				else cdString += `✅ - ${cmd[1].cooldown!.name}\n`;
				alreadyDone.push(cmd[1].cooldown!.name);
			}
			const bosscd = user.getCooldown('boss');
			if (bosscd) cdString += `❌ - boss 🕙${bosscd}\n`;
			else cdString += `✅ - boss\n`;
			
			const votecd = user.getCooldown('vote');
			if (votecd) cdString += `❌ - vote 🕙${votecd}\n`;
			else cdString += `✅ - vote\n`;

			embed.setDescription(cdString);
			msg.channel.send(embed);
        }
	},
	{
		name: 'ready',
        aliases: ['rd','rdy'],
        category: CC.Cooldowns,
		description: 'Check the commands that are off cooldown!',
        usage: `[prefix]ready`,
        executeWhileTravelling: true,
        mustBeRegistered: true,
		async execute(msg: Discord.Message, args, user: User) 
		{
			const cdCmds = commands.filter(x => x.cooldown != undefined);
			
			const embed = new Discord.RichEmbed()
            .setTitle(`Ready commands -- ${msg.author.username}`)
            .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
            .setColor('#fcf403');
			let rdString = "";
			const alreadyDone: string[] = [];
			for (const cmd of cdCmds)
			{
				if (alreadyDone.includes(cmd[1].cooldown!.name)) continue;
				if (user.getCooldown(cmd[1].cooldown!.name) == undefined) rdString += `✅ - ${cmd[1].cooldown!.name}\n`;
				alreadyDone.push(cmd[1].cooldown!.name);
			} 
			if (user.getCooldown('boss') == undefined) rdString += `✅ - boss\n`;
			if (user.getCooldown('vote') == undefined) rdString += `✅ - vote\n`;
			
			embed.setDescription(rdString);
			msg.channel.send(embed);
        }
    },
];

export function SetupCommands() {for (const cmd of cmds) commands.set(cmd.name, cmd);}