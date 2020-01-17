import Discord, { Channel } from "discord.js"
import { commands } from "../main";
import { DataManager } from "../dataManager";
import { randomIntFromInterval, clamp, getTotalWeightForLevel, round } from "../utils";
import { _equipmentItem, _consumableItem, _materialItem } from "../classes/items";

export const cmds = 
[
    {
		name: 'itemdata',
		catergory: "statistics",
		execute_while_travelling: true,
		aliases: ['id'],
		description: 'Shows all the information about an item.',
		usage: `[prefix]itemdata [itemID/ItemName]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (args.length == 0 && parseInt(args[0])) return msg.channel.send(`Please enter the id of the item.`)
                
                var item = DataManager.getItem(parseInt(args[0]));
                if (item instanceof _equipmentItem)
                {
                    const embed = new Discord.RichEmbed()
                    .setColor('#fcf403') //Yelow
                    .setTitle(`Item #${item._id}: ${item.icon} ${item.name}`)
                    .addField("Desciption:", item.description)

                    .addField("Info:",
                    `**Quality:** ${item.getQuality().icon} ${item.getQuality().name}\n`+
                    `**Slot(s):** ${item.slots.join(" or ")}\n`+
                    `**Type:** ${item.getType().name}\n`+
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

                }
                else if (item instanceof _materialItem)
                {
                    
                }
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
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