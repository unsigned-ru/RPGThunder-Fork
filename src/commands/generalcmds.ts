import Discord from 'discord.js';
import {client, blackjackSessions} from '../main';
import {equipment_slots, item_qualities, item_types} from '../staticdata';
import {_class, _item, _item_type, _shop_item, _consumable, _enemy} from '../interfaces';
import {getItemData, getCurrencyDisplayName, getCurrencyIcon, queryPromise, getGuildPrefix} from '../utils';

export const commands = [
	{
		name: 'itemdata',
		catergory: "statistics",
		aliases: ['id'],
		description: 'Shows all the information about an item.',
		usage: `[prefix]itemdata [itemID/ItemName]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (args.length == 0) throw "Please enter an id/Name"

				let item : _item;
				parseInt(args[0]) ? item = await getItemData(parseInt(args[0])) as _item : item = (await queryPromise(`SELECT * FROM items WHERE LOWER(name)='${args.reduce((a, x) => a + " " + x.toString()).toLowerCase()}'`))[0];
				//Check if item's name exists within database.
				
				if (item == undefined) throw "Could not find that item."

				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`Item #${item!.id}: ${item!.icon_name} ${item!.name}`)
				.addField("Desciption:", item!.description)

				.addField("Info:",
				`**Quality:** ${item_qualities.find(quality => quality.id == item!.quality)!.name}\n`+
				`**Slot:** ${equipment_slots.find(x => x.id == item.slot).display_name}\n`+
				`**Type:** ${item_types.find(type => type.id == item!.type)!.name}\n`+
				`**Level Req:** ${item!.level_req}\n`+
				`**Sell Price:** ${getCurrencyIcon("coins")} ${item.sell_price} ${getCurrencyDisplayName("coins")}`,true)
				
				.addField("Stats:",
				`🗡️**ATK:** ${item!.atk} + (${item!.bonus_atk_min} ⟷ ${item!.bonus_atk_max})\n`+
				`🛡️**DEF:** ${item!.def} + (${item!.bonus_def_min} ⟷ ${item!.bonus_def_max})\n`+
				`⚡**ACC:** ${item!.acc} + (${item!.bonus_acc_min} ⟷ ${item!.bonus_acc_max})\n`,true)
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
		name: 'help',
		aliases: ['commands'],
		description: 'List help for all commands.',
		usage: `[prefix]help`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				var prefix = await getGuildPrefix(msg.guild.id)
				const embed = new Discord.RichEmbed()
				.setAuthor(`Add ${prefix} before any command!`,'http://159.89.133.235/DiscordBotImgs/logo.png')
				.setColor('#fcf403') //Yelow⛏️
				.setTitle(`**Commands**`)
				.setDescription(`**Are you a new user? Type \`${prefix}register\` to get started!**`)
				.addField("⚙️**Statistic commands**⚙️",client.commands.filter((x) => {return x.category && x.category.toLowerCase() == "statistics"}).map(x => `\`${x.name}\``).join(","))
				.addField("**Item commands**",client.commands.filter((x) => {return x.category && x.category.toLowerCase() == "items"}).map(x => `\`${x.name}\``).join(","))
				.addField("⚔️**Fighting commands**⚔️",client.commands.filter((x) => {return x.category && x.category.toLowerCase() == "fighting"}).map(x => `\`${x.name}\``).join(","))
				.addField("⛏️**Gathering commands**⛏️",client.commands.filter((x) => {return x.category && x.category.toLowerCase() == "gathering"}).map(x => `\`${x.name}\``).join(","))
				.addField("💰**Economy commands**💰",client.commands.filter((x) => {return x.category && x.category.toLowerCase() == "economy"}).map(x => `\`${x.name}\``).join(","))
				.addField("🎲**Gambling commands**🎲",client.commands.filter((x) => {return x.category && x.category.toLowerCase() == "gambling"}).map(x => `\`${x.name}\``).join(","))
				.addField("🕵️**Admin commands**🕵️",client.commands.filter((x) => {return x.category && x.category.toLowerCase() == "admin"}).map(x => `\`${x.name}\``).join(",")+ ",`rpgthunder setprefix`,`rpgthunder prefix`") 
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
]

export function SetupCommands()
{
    commands.forEach(cmd =>
    {
        client.commands.set(cmd.name, cmd);
        console.log("command: '"+cmd.name+"' Registered.");
    });
}