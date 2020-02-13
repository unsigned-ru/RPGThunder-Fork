import Discord from "discord.js"
import { commands, dbl } from "../main";
import { DataManager } from "../classes/dataManager";
import { round, CC, clamp, filterItemArray, sortItemArray, constructAbilityDataString, colors, numberToIcon } from "../utils";
import { _equipmentItem, _materialItem, _consumableItem, MaterialItem, EquipmentItem, ConsumableItem, anyItem } from "../classes/items";
import { User } from "../classes/user";
import { _command } from "../interfaces";
import cf from "../config.json"

export const cmds: _command[] = 
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
			var targetUser: Discord.GuildMember;

			//check if there is a mentioned user to get the profile from.
			if (msg.mentions.members.size > 0) targetUser = msg.mentions.members.first();
			else targetUser = msg.member;

			var user = DataManager.getUser(targetUser.id);
			if (!user) return msg.channel.send(`\`${targetUser.user.username}\` is not registered.`);

			//Create an embedd with the profile data.
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow
			.setTitle(`User profile: ${targetUser.user.username}`)
			
			.addField("Info:",
			`**Class:** ${user.class.icon} ${user.class.name}\n`+
			`**Level:** ${user.level}\n`+
			`**Exp:** ${round(user.exp)}/${user.getRequiredExp()}\n`+
			`**Zone:** ${user.getZone().name}\n`
			,true)

			var s = user.getStats();
			embed.addField("Stats:",
			`❤️ ${round(user.hp)} / ${round(s.base.hp)} \n`+
			`🗡️ ${round(s.total.atk)} (${round(s.base.atk)} + ${round(s.gear.atk)})\n`+
			`🛡️ ${round(s.total.def)} (${round(s.base.def)} + ${round(s.gear.def)})\n`+
			`⚡ ${round(s.total.acc)} (${round(s.base.acc)} + ${round(s.gear.acc)})\n`
			,true);
			embed.addBlankField(false);

			var equipmentString = "";
			for (let e of user.equipment)
			{
				if (e[1].item) 
				{
					let item = DataManager.getItem(e[1].item.id) as _equipmentItem;
					equipmentString += `${item.icon} ${item.name}`
					if (e[0]== 1 && item.two_hand) equipmentString += ` [2H]`
					equipmentString += `\n`;
				}
				///If we're wearing twohand then skip the offhand cycle
				else if (e[0] == 2 && user.isWearingTwoHand()) continue;
				else equipmentString += `❌\n`
			}
			embed.addField("Equipment:",equipmentString,true);

			var currencyString = "";
			for (var c of user.currencies)
			{
				var currencyData = DataManager.getCurrency(c[0]);
				currencyString += `${currencyData.icon} **${currencyData.name}**: ${c[1].value}\n`
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
			var targetUser: Discord.GuildMember;

			//check if there is a mentioned user to get the profile from.
			if (msg.mentions.members.size > 0) targetUser = msg.mentions.members.first();
			else targetUser = msg.member;

			var user = DataManager.getUser(targetUser.id);
			if (!user) return msg.channel.send(`\`${targetUser.user.username}\` is not registered.`);

			//Create an embedd with the profile data.
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow
			.setTitle(`User equipment: ${user.class.icon} ${targetUser.user.username}`)

			var equipmentString = "";
			for (let e of user.equipment)
			{
				if (e[1].item) 
				{
					let item = DataManager.getItem(e[1].item.id) as _equipmentItem;
					equipmentString += `${item._id} - ${item.icon} __${item.name}__`;
					if (item.two_hand) equipmentString += ` [2H]`;
					equipmentString += e[1].item.getDataString();
				}
				//If we're wearing twohand then skip the offhand cycle
				else if (e[0] == 2 && user.isWearingTwoHand()) continue;
				else equipmentString += `❌\n`
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
			var targetUser: Discord.GuildMember;

			//check if there is a mentioned user to get the profile from.
			if (msg.mentions.members.size > 0) targetUser = msg.mentions.members.first();
			else targetUser = msg.member;

			var user = DataManager.getUser(targetUser.id);
			if (!user) return msg.channel.send(`\`${targetUser.user.username}\` is not registered.`);

			//Create an embedd with the profile data.
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow
			.setTitle(`User Professions: ${targetUser.user.username}`)

			var professionStrings = []
			for (let p of user.professions)
			{
				let pd = DataManager.getProfessionData(p[0]);
				professionStrings.push(`${pd?.icon} **${pd?.name}** [${p[1].skill}/${pd?.max_skill}]`);
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

			var currencyString = "";
			for (var c of user.currencies)
			{
				var currencyData = DataManager.getCurrency(c[0]);
				currencyString += `${currencyData.icon} **${currencyData.name}**: ${c[1].value}\n`
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

			var levelPercentage = (user.exp / user.getRequiredExp()) * 100;
			let progressBar = "<:expBar:674948948103790610>".repeat(Math.ceil(levelPercentage/(20/3))) + "<:emptyBar:674948948087013376>".repeat(15 - Math.ceil(levelPercentage/(20/3))); 


			embed.setDescription(
				`<:level:674945451866325002> ${user.level}\n`+
				`**exp:** ${round(user.exp)}/${user.getRequiredExp()}\n\n`+
				`${round(levelPercentage)}%\n`+
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

			var hpPercentage = (user.hp / user.getStats().base.hp) * 100;
			let progressBar = "<:healthBar:674948947684622337>".repeat(Math.ceil(hpPercentage/(20/3))) + "<:emptyBar:674948948087013376>".repeat(15 - Math.ceil(hpPercentage/(20/3))); 

			embed.setDescription(
				`<:level:674945451866325002> ${user.level}\n`+
				`**HP:** ${round(user.hp)}/${user.getStats().base.hp}\n\n`+
				`${round(hpPercentage)}%\n`+
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
			.setColor('#fcf403') //Yelow

			let pages = []
			let itemString = "";
			let maxItems = 8;
			let itemCounter = 0;
			let selectedPage = 1;

			//check for input of page to display
			if (!isNaN(+args[0])) {selectedPage = +args[0]; args.splice(0,1)}

			//check for input of -params
			for(let p of args.join(" ").split('-').slice(1).map(x => x.trim().split(" ")))
			{
				
				switch(p[0].toLowerCase())
				{
					case "maxitems":
						if (!isNaN(+p[1])) if (+p[1] < cf.inventory_maxItemsLimit && +p[1] > 0) maxItems = +p[1];
					break;
					case "sortby":
						user.inventory = sortItemArray(p[1],user.inventory) as anyItem[];
					break;
				}
			}
			let cinventory = user.inventory.slice(); 
			for(let p of args.join(" ").split('-').slice(1).map(x => x.trim().split(" ")))
			{
				if(p[0].toLowerCase() == "filter")
				{
					let filter = p[1].toLowerCase().trim().split("=");
					if (filter.length < 2) return;
					cinventory = filterItemArray(filter, cinventory) as anyItem[];
				}
			}
			
			for (let i of cinventory)
			{
				if (itemCounter >= maxItems) {pages.push(itemString); itemString = ""; itemCounter = 0;}
				let itemdata = i.getData()!;
				itemString += `${itemdata._id.toString().padEnd(3)} - ${itemdata.icon} __${itemdata.name}__`;
				if (i instanceof ConsumableItem || i instanceof MaterialItem) itemString += ` x${i.amount}`;
				itemString += `\n[${itemdata.getQuality().icon}`;
				if (i instanceof EquipmentItem) {let totalStats = i.getTotalStats(); itemString += `| 🗡️ ${round(totalStats.atk)} | 🛡️ ${round(totalStats.def)} | ⚡ ${round(totalStats.acc)}`}
				else if (i instanceof ConsumableItem) itemString += `` 
				else if (i instanceof MaterialItem) itemString += ``				
				itemString+= `]\n\n`;

				itemCounter++
			}
			if (itemString.length > 0) pages.push(itemString);

			if (pages.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you have no items that fit your query.`)
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
			.setColor('#fcf403') //Yelow

			let showAll = false;
			let pages = []
			let abilityString = "";
			let maxAbilities = 8;
			let abilityCounter = 0;
			let selectedPage = 1;

			//check for input of page to display
			if (!isNaN(+args[0])) {selectedPage = +args[0]; args.splice(0,1)}

			//check for input of -params
			for(let p of args.join(" ").split('-').slice(1).map(x => x.trim().split(" ")))
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
			let spellbook = showAll ? user.class.spellbook.slice() : user.class.spellbook.filter(x => x.level <= user.level).slice();

			for (let a of spellbook)
			{
				if (abilityCounter >= maxAbilities) {pages.push(abilityString); abilityString = ""; abilityCounter = 0;}
				let ad = DataManager.getAbility(a.ability);

				abilityString += `${ad.id} - ${ad.icon} __${ad.name}__\n`;
				abilityString += `${constructAbilityDataString(ad,a.level)}\n\n`;
				abilityCounter++;
			}
			if (abilityString.length > 0) pages.push(abilityString);

			if (pages.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you have no abilities that fit your query.`)

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
			.setColor(colors.yellow) //Yelow
			
			let abStrings :string[] = []
			for (let ab of user.abilities)
			{
				if (!ab[1].ability) abStrings.push(`${numberToIcon(ab[0])} - ❌ __None__ ❌`);
				else abStrings.push(`${numberToIcon(ab[0])} - __${ab[1].ability.data.name}__ <:cooldown:674944207663923219> ${ab[1].ability.data.cooldown}`)
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
			let cd_cmds = commands.filter(x => x.cooldown != undefined);
			
			var embed = new Discord.RichEmbed()
            .setTitle(`User cooldowns -- ${msg.author.username}`)
            .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
            .setColor('#fcf403')
			let cdString = "";
			let alreadyDone :string[] = [];
			for (let cmd of cd_cmds)
			{
				if (alreadyDone.includes(cmd[1].cooldown!.name)) continue;
				let remainingcd = user.getCooldown(cmd[1].cooldown!.name);
				if (remainingcd) cdString += `❌ - ${cmd[1].cooldown!.name} 🕙${remainingcd}\n`
				else cdString += `✅ - ${cmd[1].cooldown!.name}\n`;
				alreadyDone.push(cmd[1].cooldown!.name);
			}
			let bosscd = user.getCooldown('boss');
			if (bosscd) cdString += `❌ - boss 🕙${bosscd}\n`
			else cdString += `✅ - boss\n`;
			try { cdString += (await dbl.hasVoted(msg.author.id)) == false ? `✅ - vote\n`: `❌ - vote\n`; }
			catch(err) { cdString += "❌ - Vote [**API DOWN**]\n" }

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
			let cd_cmds = commands.filter(x => x.cooldown != undefined);
			
			var embed = new Discord.RichEmbed()
            .setTitle(`Ready commands -- ${msg.author.username}`)
            .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
            .setColor('#fcf403')
			let rdString = "";
			let alreadyDone :string[] = [];
			for (let cmd of cd_cmds)
			{
				if (alreadyDone.includes(cmd[1].cooldown!.name)) continue;
				if (user.getCooldown(cmd[1].cooldown!.name) == undefined) rdString += `✅ - ${cmd[1].cooldown!.name}\n`;
				alreadyDone.push(cmd[1].cooldown!.name);
			} 
			if (user.getCooldown('boss') == undefined) rdString += `✅ - boss\n`
			try { rdString += (await dbl.hasVoted(msg.author.id)) == false ? `✅ - vote\n`: ``; } catch(err) {}
			
			embed.setDescription(rdString);
			msg.channel.send(embed);
        }
    },
]

export function SetupCommands() {for (let cmd of cmds) commands.set(cmd.name, cmd);}