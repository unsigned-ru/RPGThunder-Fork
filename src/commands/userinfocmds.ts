import { client, gather_commands_cooldown, explore_command_cooldown, rest_command_cooldown, zoneBoss_command_cooldown, dbl} from "../main";
import cf from "../config.json"
import Discord from "discord.js"
import {calculateReqExp, isRegistered, getEquipmentSlotDisplayName, clamp, getCooldownForCollection, getEquipmentInfoString, formatTime, queryPromise} from "../utils";
import {basicModule, equipmentModule, currencyModule, statsModule, UserData, userDataModules, inventoryModule, consumablesModule, materialsModule, spellbookModule, abilityModule} from "../classes/userdata";
import { item_qualities, equipment_slots, zones, currencies, materials } from "../staticdata";

export const commands = 
[
    {
		name: 'profile',
		category: "statistics",
		execute_while_travelling: true,
		aliases: ['pf'],
		description: 'Shows a user profile containing their class, stats and currencies.',
		usage: `[prefix]profile [optional: @User]`,
		async execute(msg: Discord.Message, args: string[]) 
		{	
			var user: Discord.GuildMember;

			//check if there is a mentioned arg.
			if (msg.mentions.members.size > 0)
			{
				user = msg.mentions.members.first();
			}
			else
			{
				user = msg.member;
			}
			//Get UserData
			try {
				if (!await isRegistered(user.user.id)) throw "User must be registered to use that command.";

				var [basicMod,equipmentMod,statsMod,currenciesMod] = <[basicModule,equipmentModule,statsModule,currencyModule]> await new UserData(user.id,[userDataModules.basic,userDataModules.equipment,userDataModules.stats,userDataModules.currencies]).init();

				var currencyString = "";
				for (var c of currencies)
				{
					currencyString += `${c[1].icon_name} **${c[1].display_name}**: ${currenciesMod.currencies.get(c[1].database_name)}\n`
				}


				//Create an embedd with the profile data.
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`User profile: ${user.user.username}`)
				
				.addField("Info:",
				`**Class:** ${basicMod.class!.name}\n`+
				`**Level:** ${basicMod.level!}\n`+
				`**Exp:** ${basicMod.exp!.toFixed(0)} / ${calculateReqExp(basicMod.level!).toFixed(0)}\n`+
				`**Zone:** ${zones.get(basicMod.zone!)!.name}\n`,true)

				.addBlankField(true)

				.addField("Stats:",
				`❤️ **HP:** ${basicMod.current_hp!.toFixed(2)} / ${statsMod.stats.get("max_hp")!.toFixed(2)}\n`+
				`🗡️ **ATK:** ${statsMod.stats.get("total_atk")!.toFixed(0)}\n`+
				`🛡️ **DEF:** ${statsMod.stats.get("total_def")!.toFixed(0)}\n`+
				`⚡ **ACC:** ${statsMod.stats.get("total_acc")!.toFixed(0)}\n`,true)

				.addField("Currencies:",currencyString,false)

				// .addField("Equipment:",
				// `**Main Hand:**  ${equipmentMod.equipment.get("main_hand")!.item == null ? "" : equipmentMod.equipment.get("main_hand")!.item.icon_name} ${equipmentMod.equipment.get("main_hand")!!.item == null ? "None" : equipmentMod.equipment.get("main_hand")!.item.name}\n`+
				// `**Off Hand:** ${equipmentMod.equipment.get("off_hand")!.item == null ? "" : equipmentMod.equipment.get("off_hand")!.item.icon_name} ${equipmentMod.equipment.get("off_hand")!.item == null ? "None" : equipmentMod.equipment.get("off_hand")!.item.name}\n`+
				// `**Head:** ${equipmentMod.equipment.get("head")!.item == null ? "" : equipmentMod.equipment.get("head")!.item.icon_name} ${equipmentMod.equipment.get("head")!.item == null ? "None" : equipmentMod.equipment.get("head")!.item.name}\n`+
				// `**Chest:** ${equipmentMod.equipment.get("chest")!.item == null ? "" : equipmentMod.equipment.get("chest")!.item.icon_name} ${equipmentMod.equipment.get("chest")!.item == null ? "None" : equipmentMod.equipment.get("chest")!.item.name}\n`+
				// `**Legs:** ${equipmentMod.equipment.get("legs")!.item == null ? "" : equipmentMod.equipment.get("legs")!.item.icon_name} ${equipmentMod.equipment.get("legs")!.item == null ? "None" : equipmentMod.equipment.get("legs")!.item.name}\n`+
				// `**Feet:** ${equipmentMod.equipment.get("feet")!.item == null ? "" : equipmentMod.equipment.get("feet")!.item.icon_name} ${equipmentMod.equipment.get("feet")!.item == null ? "None" : equipmentMod.equipment.get("feet")!.item.name}\n`+
				// `**Trinket:** ${equipmentMod.equipment.get("trinket")!.item == null ? "" : equipmentMod.equipment.get("trinket")!.item.icon_name} ${equipmentMod.equipment.get("trinket")!.item == null ? "None" : equipmentMod.equipment.get("trinket")!.item.name}\n`)
				.setThumbnail(user.user.avatarURL)

				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

				msg.channel.send(embed);
			}
			catch(err){
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'equipment',
		category: "statistics",
		execute_while_travelling: true,
		aliases: ['gear','eq'],
		description: 'Shows a users equipment.',
		usage: `[prefix]equipment [optional: @User]`,
		async execute(msg: Discord.Message, args: string[]) 
		{	
			var user: Discord.GuildMember;

			//check if there is a mentioned arg.
			if (msg.mentions.members.size > 0)
			{
				user = msg.mentions.members.first();
			}
			else
			{
				user = msg.member;
			}
			//Get UserData
			try {
				if (!await isRegistered(user.user.id)) throw "User must be registered to use that command.";

				var [equipmentMod] = <[equipmentModule]> await new UserData(user.id,[userDataModules.equipment]).init();

				//Create an embedd with the profile data.
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`User equipment: ${user.user.username}`)

				.addField("Equipment:",
				`**Main Hand:** ${getEquipmentInfoString("main_hand",equipmentMod)}\n`+
				`**Off Hand:** ${getEquipmentInfoString("off_hand",equipmentMod)}\n`+
				`**Head:** ${getEquipmentInfoString("head",equipmentMod)}\n`+
				`**Chest:** ${getEquipmentInfoString("chest",equipmentMod)}\n`+
				`**Legs:** ${getEquipmentInfoString("legs",equipmentMod)}\n`+
				`**Feet:** ${getEquipmentInfoString("feet",equipmentMod)}\n`+
				`**Trinket:** ${getEquipmentInfoString("trinket",equipmentMod)}\n`)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

				msg.channel.send(embed);
			}
			catch(err){
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	// {
	// 	name: 'currencies',
	// 	category: "statistics",
	// 	aliases: ['$','curr','coins'],
	// 	execute_while_travelling: true,
	// 	description: 'Lists all currencies and their amounts.',
	// 	usage: `[prefix]currencies`,
	// 	async execute(msg: Discord.Message, args: string[]) 
	// 	{
	// 		try
	// 		{
	// 			if (!await isRegistered(msg.author.id)) throw "You must be registered to view your materials.";

	// 			//get userdata
	// 			const [currenciesMod] = <[currencyModule]> await new UserData(msg.author.id, [userDataModules.currencies]).init();

	// 			var currencyString = "";

	// 			for (var c of currencies)
	// 			{
	// 				currencyString += `${c[1].icon_name} **${c[1].display_name}**: ${currenciesMod.currencies.get(c[1].database_name)}\n`
	// 			}
				
	// 			const embed = new Discord.RichEmbed()
	// 			.setColor('#fcf403') //Yelow
	// 			.setTitle(`User currencies: ${msg.author.username}`)
	// 			.addField("Currencies:", currencyString)
	// 			.setThumbnail(msg.author.avatarURL)
	// 			.setTimestamp()
	// 			.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
	// 			msg.channel.send(embed);
	// 		}
	// 		catch(err)
	// 		{
	// 			console.log(err);
	// 			msg.channel.send(err);
	// 		}
	// 	},
	// },
	{
		name: 'materials',
		category: "statistics",
		execute_while_travelling: true,
		aliases: ['mats'],
		description: 'Lists all materials and their amounts.',
		usage: `[prefix]materials`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to view your materials.";

				//get userdata
				const [materialsMod] = <[materialsModule]> await new UserData(msg.author.id, [userDataModules.materials]).init();

				var materialsString = "";

				for (var m of materials)
				{
					if (materialsMod.materials.get(m[1].database_name)! > 0) materialsString += `${m[1].icon_name} **${m[1].display_name}**: ${materialsMod.materials.get(m[1].database_name)}\n`
				}
				
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`User materials: ${msg.author.username}`)
				.addField("Materials:", materialsString)
				.setThumbnail(msg.author.avatarURL)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				msg.channel.send(embed);
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'inventory',
		category: "statistics",
		execute_while_travelling: true,
		aliases: ['inv'],
		description: 'Lists all items in your inventory and their respective slot they are in.',
		usage: `[prefix]inventory [optional: Page]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to view your inventory."

				var page = 1;
				if (parseInt(args[0])) page = parseInt(args[0])

				const [inventoryMod] = <[inventoryModule]> await new UserData(msg.author.id, [userDataModules.inventory]).init();

				if (inventoryMod.isEmpty) throw "You do not own any items!"
				var invPages = []
				var invString = "";

				for (var id of inventoryMod.inventory)
				{
					invString += `**${id[0]}** ${id[1].item.icon_name} ${id[1].item.name} [${item_qualities.get(id[1].item.quality)!.name} ${getEquipmentSlotDisplayName(id[1].item.slot)}] 🗡️ ${id[1].item.atk + id[1].bonus_atk} | 🛡️ ${id[1].item.def + id[1].bonus_def} | ⚡ ${id[1].item.acc + id[1].bonus_acc}\n`
					if (invString.length > 900)
					{
						invPages.push(invString);
						invString = "";
					}
				}
				if (invString.length > 0) invPages.push(invString);

				if (page < 1 || page > invPages.length) throw `Page number must be bigger than 0 and smaller than ${invPages.length+1}`;

				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`User inventory: ${msg.member.displayName} | Page ${page}/${invPages.length}`)
				.addField("Items:", invPages[page-1])
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				msg.channel.send(embed);
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'spellbook',
		category: "statistics",
		execute_while_travelling: true,
		aliases: ['sb'],
		description: 'Lists all the abbilities you have learned.',
		usage: `[prefix]spellbook`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to execute that command."

				const [spellbookMod] = <[spellbookModule]> await new UserData(msg.author.id, [userDataModules.spellbook]).init();

				if (spellbookMod.isEmpty) throw "You do not own any abilities!"

				var spellbookString = "";

				for (var sd of spellbookMod.spellbook) spellbookString += `**${sd[1].id}** - **${sd[1].name}** [ATK_MP: \`${sd[1].atk_multiplier}\` | BASE_HIT: \`${sd[1].base_chance}\`]\n`

				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`User spellbook: ${msg.author.username}`)
				.addField("Abilities:", spellbookString)
				.setThumbnail(msg.author.avatarURL)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				msg.channel.send(embed);
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'abilities',
		category: "statistics",
		execute_while_travelling: true,
		aliases: ['abs'],
		description: 'Lists your current equipped abilities and their damage/hitchance values.',
		usage: `[prefix]abilities`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to execute that command."

				const [abilityMod,basicMod,equipmentMod,statsMod] = <[abilityModule,basicModule,equipmentModule,statsModule]> await new UserData(msg.author.id, [userDataModules.abilities,userDataModules.basic,userDataModules.equipment,userDataModules.stats]).init();

				var abilityStrings: string[] = [];
				var abilityIcons:string[] = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']

				for (var a of abilityMod.abilities)
				{
					var abilityString = a[1] == undefined ? 
					"❌ **NONE**" : 
					`${abilityIcons[a[0]-1]} **${a[1].name}** | 🗡️${clamp((a[1].atk_multiplier * statsMod.stats.get("total_atk")!),0,a[1].max_atk).toFixed(0)} | ⚡${(((a[1].base_chance /100) + (statsMod.stats.get("total_acc")! / (basicMod.level! * 10)) / 3)*100).toFixed(0)}\n`+
					`__ATK:__ \`${statsMod.stats.get("total_atk")} * ${a[1].atk_multiplier} <= ${a[1].max_atk} (max_dmg)\` => \`${clamp((a[1].atk_multiplier * statsMod.stats.get("total_atk")!),0,a[1].max_atk).toFixed(0)}\`\n`+
					`__HIT:__ \`(${a[1].base_chance} / 100) + ((${statsMod.stats.get("total_acc")!} / (${basicMod.level!} * 10)) / 3) * 100\` => \`${(((a[1].base_chance /100) + (statsMod.stats.get("total_acc")! / (basicMod.level! * 10)) / 3)*100).toFixed(0)}\``
					abilityStrings.push(abilityString);
				}


				//2️⃣ 3️⃣ 4️⃣
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`Equipped Abilities: ${msg.author.username}`)
				.addField("\u200B",abilityStrings[0])
				.addField("\u200B",abilityStrings[1])
				.addField("\u200B",abilityStrings[2])
				.addField("\u200B",abilityStrings[3])
				.setThumbnail(msg.author.avatarURL)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				msg.channel.send(embed);
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'consumables',
		category: "statistics",
		aliases: ['nomnoms','pots','food'],
		execute_while_travelling: true,
		description: 'Lists all consumables in your inventory and their respective ids.',
		usage: `[prefix]consumables`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to view your inventory.";

				//get userdata
				const [consumablesMod] = <[consumablesModule]> await new UserData(msg.author.id, [userDataModules.consumables]).init();

				if (consumablesMod.isEmpty) throw "You have no consumables."

				var consumableString = "";

				for (var cons of consumablesMod.consumables)
				{
					consumableString += `${cons[1].cons.id} - ${cons[1].cons.icon_name} ${cons[1].cons.name} x${cons[1].count}\n`
				}
				
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`User consumables: ${msg.member.displayName}`)
				.addField("Consumables:", consumableString)
				.setThumbnail(msg.author.avatarURL)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				msg.channel.send(embed);
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'cooldown',
		category: "statistics",
		execute_while_travelling: true,
		aliases: ['cd'],
		description: 'Check your cooldowns',
		usage: `[prefix]cooldown`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command!"

				const [basicMod] = <[basicModule]> await new UserData(msg.author.id, [userDataModules.basic]).init();


				//create embed
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`${msg.author.username}'s cooldowns`)
				.addField("✨ Progress",
				`${!gather_commands_cooldown.has(msg.author.id) ? `✅ - Mine/Chop/Harvest/Fish`: `❌ - Mine/Chop/Harvest/Fish **🕑${formatTime(getCooldownForCollection(msg.author.id,gather_commands_cooldown))}**`}\n`+
				`${!explore_command_cooldown.has(msg.author.id) ? `✅ - Explore`:`❌ - Explore **🕑${formatTime(getCooldownForCollection(msg.author.id,explore_command_cooldown))}**`}\n`+
				`${!rest_command_cooldown.has(msg.author.id) ? `✅ - Rest`: `❌ - Rest **🕑${formatTime(getCooldownForCollection(msg.author.id,rest_command_cooldown))}**`}\n`+
				`${!zoneBoss_command_cooldown.has(msg.author.id) ? `✅ - Zone Boss`:`❌ - Zone Boss **🕑${formatTime(getCooldownForCollection(msg.author.id,zoneBoss_command_cooldown))}**`}\n`+
				`${await async function() 
				{
					try
					{
						return await dbl.hasVoted(msg.author.id) == false ? `✅ - Vote`: `❌ - Vote`;
					}
					catch(err){return "❌ - Vote [**API DOWN**]"}
				}.call(this)}\n`+
				`${basicMod.daily_isReady ? `✅ - Daily` : `❌ - Daily **🕑${(formatTime(Math.abs(new Date((await queryPromise(`SELECT EXECUTE_AT FROM INFORMATION_SCHEMA.EVENTS WHERE EVENT_NAME = '${msg.author.id}_daily'`))[0].EXECUTE_AT).getTime() - (new Date().getTime()))))}**`}\n`+
				`${basicMod.weekly_isReady ? `✅ - Weekly` : `❌ - Weekly **🕑${(formatTime(Math.abs(new Date((await queryPromise(`SELECT EXECUTE_AT FROM INFORMATION_SCHEMA.EVENTS WHERE EVENT_NAME = '${msg.author.id}_weekly'`))[0].EXECUTE_AT).getTime() - (new Date().getTime()))))}**`}\n`
				)
				.setThumbnail(msg.author.avatarURL)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				msg.channel.send(embed);

			}
			catch(err)
			{
				console.log(err);
			}
		},
	},
	{
		name: 'ready',
		category: "statistics",
		aliases: ['rd'],
		execute_while_travelling: true,
		description: 'Check what cooldowns are ready.',
		usage: `[prefix]ready`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command!";

				const [basicMod] = <[basicModule]> await new UserData(msg.author.id, [userDataModules.basic]).init();


				var readyString = "";

				//Check for cooldowns.
				if (!gather_commands_cooldown.has(msg.author.id)) readyString+= "✅ - Mine/Chop/Harvest/Fish\n"
				
				if (!explore_command_cooldown.has(msg.author.id)) readyString+= "✅ - Explore\n"
				
				if (!rest_command_cooldown.has(msg.author.id)) readyString+= "✅ - Rest\n"
				
				if (!zoneBoss_command_cooldown.has(msg.author.id)) readyString+= "✅ - Zone Boss\n"

				readyString+= await async function() 
				{
					try
					{
						if (await dbl.hasVoted(msg.author.id) == false) return `✅ - Vote`;
					}
					catch(err){return "❌ - Vote [**API DOWN**]"}
					return "";
				}.call(this);

				if (basicMod.daily_isReady) readyString+= "✅ - Daily\n"
				if (basicMod.weekly_isReady) readyString+= "✅ - Weekly\n"

				if (readyString == "") {msg.channel.send("You have no ready commands!"); return}

				//create embed
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`${msg.author.username}'s ready commands.`)
				.addField("✨ Progress",readyString)
				.setThumbnail(msg.author.avatarURL)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				msg.channel.send(embed);

			}
			catch(err)
			{
				console.log(err);
				msg.channel.send("An error occured: \n" + err);
			}
		},
		
	},
]



export function SetupCommands()
{
    commands.forEach(cmd =>
    {
        client.commands.set(cmd.name, cmd);
        console.log("command: '"+cmd.name+"' Registered.");
    });
}