import { client, gather_commands_cooldown, explore_command_cooldown} from "../main";
import cf from "../config.json"
import Discord from "discord.js"
import {calculateReqExp, isRegistered, getEquipmentSlotDisplayName} from "../utils";
import {basicModule, equipmentModule, currencyModule, statsModule, UserData, userDataModules, inventoryModule, consumablesModule, materialsModule} from "../classes/userdata";
import { item_qualities, equipment_slots } from "../staticdata";

export const commands = 
[
    {
		name: 'profile',
		aliases: ['pf'],
		description: 'Shows a user profile containing their class, stats and equipment.',
		usage:`${cf.prefix}profile [optional: @User]`,
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
				var [basicMod,equipmentMod,currencyMod,statsMod] = <[basicModule,equipmentModule,currencyModule,statsModule]> await new UserData(user.id,[userDataModules.basic,userDataModules.equipment,userDataModules.currencies,userDataModules.stats]).init();

				//get all the currencies into a proper string:
				var currencyString = "";
				for (var cc of cf.currencies)
				{
					currencyString+= `**${cc.display_name}:** ${currencyMod.currencies.get(cc.database_name)}\n`;
				}

				//Create an embedd with the profile data.
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`User profile: ${user.user.username}`)
				
				.addField("Info:",
				`**Class:** ${basicMod.class!.name}\n`+
				`**Level:** ${basicMod.level!}\n`+
				`**Exp:** ${basicMod.exp!} / ${calculateReqExp(basicMod.level!)}\n`+
				`**Area:** ${basicMod.area!}\n`,true)

				.addField("Stats:",
				`❤️ **HP:** ${basicMod.current_hp!.toFixed(2)} / ${statsMod.stats.get("max_hp")!.toFixed(2)}\n`+
				`🗡️ **ATK:** ${statsMod.stats.get("total_atk")!.toFixed(0)}\n`+
				`🛡️ **DEF:** ${statsMod.stats.get("total_def")!.toFixed(0)}\n`+
				`⚡ **ACC:** ${statsMod.stats.get("total_acc")!.toFixed(0)}\n`,true)

				.addField("Equipment:",
				`**Main Hand:**  ${equipmentMod.equipment.get("main_hand")! == null ? "" : equipmentMod.equipment.get("main_hand")!.icon_name} ${equipmentMod.equipment.get("main_hand")! == null ? "None" : equipmentMod.equipment.get("main_hand")!.name}\n`+
				`**Off Hand:** ${equipmentMod.equipment.get("off_hand") == null ? "" : equipmentMod.equipment.get("off_hand")!.icon_name} ${equipmentMod.equipment.get("off_hand") == null ? "None" : equipmentMod.equipment.get("off_hand")!.name}\n`+
				`**Head:** ${equipmentMod.equipment.get("head") == null ? "" : equipmentMod.equipment.get("head")!.icon_name} ${equipmentMod.equipment.get("head") == null ? "None" : equipmentMod.equipment.get("head")!.name}\n`+
				`**Chest:** ${equipmentMod.equipment.get("chest") == null ? "" : equipmentMod.equipment.get("chest")!.icon_name} ${equipmentMod.equipment.get("chest") == null ? "None" : equipmentMod.equipment.get("chest")!.name}\n`+
				`**Legs:** ${equipmentMod.equipment.get("legs") == null ? "" : equipmentMod.equipment.get("legs")!.icon_name} ${equipmentMod.equipment.get("legs") == null ? "None" : equipmentMod.equipment.get("legs")!.name}\n`+
				`**Feet:** ${equipmentMod.equipment.get("feet") == null ? "" : equipmentMod.equipment.get("feet")!.icon_name} ${equipmentMod.equipment.get("feet") == null ? "None" : equipmentMod.equipment.get("feet")!.name}\n`+
				`**Trinket:** ${equipmentMod.equipment.get("trinket") == null ? "" : equipmentMod.equipment.get("trinket")!.icon_name} ${equipmentMod.equipment.get("trinket") == null ? "None" : equipmentMod.equipment.get("trinket")!.name}\n`)
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
		name: 'currencies',
		aliases: ['$','curr','coins'],
		description: 'Lists all currencies and their amounts.',
		usage: `${cf.prefix}currencies`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to view your materials.";

				//get userdata
				const [currenciesMod] = <[currencyModule]> await new UserData(msg.author.id, [userDataModules.currencies]).init();

				var currencyString = "";

				for (var c of cf.currencies)
				{
					
					currencyString += `${c.icon_name} **${c.display_name}**: ${currenciesMod.currencies.get(c.database_name)}\n`
				}
				
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`User currencies: ${msg.author.username}`)
				.addField("Currencies:", currencyString)
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
		name: 'materials',
		aliases: ['mats'],
		description: 'Lists all materials and their amounts.',
		usage: `${cf.prefix}materials`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to view your materials.";

				//get userdata
				const [materialsMod] = <[materialsModule]> await new UserData(msg.author.id, [userDataModules.materials]).init();

				var materialsString = "";

				for (var m of cf.materials)
				{
					
					materialsString += `${m.icon_name} **${m.display_name}**: ${materialsMod.materials.get(m.database_name)}\n`
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
		aliases: ['inv'],
		description: 'Lists all items in your inventory and their respective ids.',
		usage: `${cf.prefix}inventory`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to view your inventory."

				const [inventoryMod] = <[inventoryModule]> await new UserData(msg.author.id, [userDataModules.inventory]).init();

				if (inventoryMod.isEmpty) throw "You do not own any items!"

				var invString = "";

				for (var id of inventoryMod.inventory) invString += `**${id[0]}** - ${id[1].item.icon_name} ${id[1].item.name} [${item_qualities.get(id[1].item.quality)!.name} ${getEquipmentSlotDisplayName(equipment_slots.get(id[1].item.slot)!.name)}]\n`

				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`User inventory: ${msg.member.displayName}`)
				.addField("Items:", invString)
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
		aliases: ['nomnoms','pots','food'],
		description: 'Lists all consumables in your inventory and their respective ids.',
		usage: `${cf.prefix}consumables`,
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
		aliases: ['cd'],
		description: 'Check your cooldowns',
		usage: `${cf.prefix}cooldown`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command!"

				var gather_command_cooldown = 0;
				var explore_cmd_cooldown = 0;
				//Check for cooldown.
				if (gather_commands_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					
					if (difference < cf.command_cooldown) gather_command_cooldown = cf.command_cooldown - difference;
				}

				if (explore_command_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - explore_command_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					
					if (difference < cf.explore_cooldown) explore_cmd_cooldown = cf.explore_cooldown - difference;
				}


				//create embed
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`${msg.author.username}'s cooldowns`)
				.addField("✨ Progress",
				`${gather_command_cooldown == 0 ? `✅ - mine/chop/harvest/fish`:`❌ ~~~ mine/chop/harvest/fish **(${Math.round(gather_command_cooldown)}s)**`}`+
				`${explore_cmd_cooldown == 0 ? `✅ - explore`:`❌ ~~~ explore **(${Math.round(explore_cmd_cooldown)}s)**`}`
				)
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
	{
		name: 'ready',
		aliases: ['rd'],
		description: 'Check what cooldowns are ready.',
		usage: `${cf.prefix}ready`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command!";

				var readyString = "";

				//Check for cooldown.
				if (gather_commands_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference >= cf.command_cooldown) readyString+= "✅ ~~~ mine/chop/harvest/fish\n"

				}
				else
				{
					readyString+= "✅ ~~~ mine/chop/harvest/fish\n"
				}
				//Check for cooldown.
				if (explore_command_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - explore_command_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference >= cf.explore_cooldown) readyString+= "✅ ~~~ explore\n"
				}
				else
				{
					readyString+= "✅ ~~~ explore\n"
				}
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