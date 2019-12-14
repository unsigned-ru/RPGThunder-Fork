import Discord from 'discord.js';
import {client} from '../main';
import {equipment_slots, item_qualities, item_types} from '../staticdata';
import {_class, _item, _item_type, _shop_item, _consumable, _enemy} from '../interfaces';
import * as cf from "../config.json";
import {getItemData} from '../utils';

export const commands = [
	{
		name: 'itemdata',
		aliases: ['id'],
		description: 'Shows all the information about an item.',
		usage: `${cf.prefix}itemdata [itemID]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (args.length == 0 || parseInt(args[0]) == undefined){ throw "Please enter a valid id."}
				const item = await getItemData(parseInt(args[0])) as _item
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`Item #${item!.id}: ${item!.name}`)
				.addField("Desciption:", item!.description)

				.addField("Info:",
				`**Quality:** ${item_qualities.find(quality => quality.id == item!.quality)!.name}\n`+
				`**Slot:** ${equipment_slots.find(slot => slot.id == item!.slot)!.name}\n`+
				`**Type:** ${item_types.find(type => type.id == item!.type)!.name}\n`+
				`**Level Req:** ${item!.level_req}\n`,true)
				
				.addField("Stats:",
				`**ATK:** ${item!.atk}\n`+
				`**DEF:** ${item!.def}\n`+
				`**ACC:** ${item!.acc}\n`,true)

				.setThumbnail("http://159.89.133.235/DiscordBotImgs/logo.png")
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				msg.channel.send(embed);
			}
			catch(err)
			{
				msg.channel.send(err);
			}
		},
	},

	{
		name: 'help',
		aliases: ['commands'],
		description: 'List help for all commands.',
		usage: `${cf.prefix}help`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				const commands = client.commands.array();
				var commandStrings: string[] = [];
				var commandString = "";
				for (var command of commands)
				{

					const aliases = command.aliases.map((el:string) => "`"+el+"`");
					const stringToAdd = 
					`➥ **Command: _${command.name}_**\n`+
					`__Description:__ ${command.description}\n`+
					`__Usage:__ \`${command.usage}\n\``+
					`__Aliases:__ ${aliases.length == 0 ? "None" : aliases.join("/")}\n\n`

					if (commandString.length + stringToAdd.length >= 1024) {commandStrings.push(commandString); commandString = "";}
					commandString += stringToAdd;
				}
				if (commandString.length > 0 ) commandStrings.push(commandString);
				

				//create embed
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`${client.c.user.username} -- Help`)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				var first = true;
				for (var string of commandStrings)
				{
					if (first) {embed.addField("📰Commands:",string); first = false;}
					else embed.addField(" ឵឵",string);
				}

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