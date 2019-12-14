import Discord from 'discord.js';
import {client} from '../main';
import cf from "../config.json";
import {isRegistered, queryPromise, getCurrencyDisplayName, getCurrencyIcon, editCollectionNumberValue} from "../utils";
import { consumable_shop_data, consumables } from '../staticdata';
import { _shop_item } from '../interfaces';
import { inventoryModule, userDataModules, UserData, currencyModule } from '../classes/userdata';

export const commands = 
[
	{
		name: 'shop',
		aliases: [],
		description: 'Shop for items or consumables',
		usage: `${cf.prefix}shop [category] (items/consumables)`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				if (!await isRegistered(msg.author.id))throw "You must be registered to use this command!";

				//Check args
				if (!args[0]) throw "Please enter the category you wish to browse.\n Usage: `"+this.usage+"`"

				//Create first page TODO
				var shopEmbed;
				switch(args[0].toLowerCase())
				{
					case "items":
						throw "This shop is still in development."
						break;
					case "consumables":
						var shopString = "";
						for (var cdata of consumable_shop_data)
						{
							var cons = consumables.get(cdata[0])!;
							shopString += `**${cdata[0]}** - ${cons.icon_name} ${cons.name} [${getCurrencyIcon("coins")} ${cdata[1].price} ${getCurrencyDisplayName("coins")}]\n`
						}
						shopEmbed = new Discord.RichEmbed()
						.setColor('#fcf403') //Yelow
						.setTitle(`Shop -- Consumables`)
						.addField("**Consumables**",shopString)
						.setAuthor("*Use the command `"+cf.prefix+"buy consumable [ID]` to buy a consumable.*")
						.setTimestamp()
						.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
						break;
				}
				
				msg.channel.send(shopEmbed);
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
		
	},
	{
		name: 'buy',
		aliases: ["purchase"],
		description: 'Buy an item from a shop catergory.',
		usage: `${cf.prefix}buy [category] (item/consumable) [ID] [AMOUNT]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				if (!await isRegistered(msg.author.id))throw "You must be registered to use this command!";

				//Check args
				if (!args[0]) throw "Please enter the category you wish to buy from.\nUsage: `"+this.usage+"`"
				if (!args[1] || !parseInt(args[1])) throw "Please enter the ID of the shop item you wish to buy\nUsage: `"+this.usage+"`";
				var amount = 1;
				if (parseInt(args[2])) amount = parseInt(args[2])

				//Get the correct database to check and get the item from.
				var dbNameString;
				switch(args[0].toLowerCase())
				{
					case "item":
						throw "Has yet to be implemented.";
						dbNameString = "item";
						break;
					case "consumable":
						dbNameString = "consumables";
						break;

					default:
						throw "Could not find a category with that name!\nUsage: `"+this.usage+"`";
				}

				//get listing and price and user balance
				const shopEntry:_shop_item = (await queryPromise(`SELECT consumable_id, price FROM ${dbNameString}_shop WHERE id=${args[1]}`))[0];
				const userBalance = (await queryPromise(`SELECT coins FROM user_currencies WHERE user_id=${msg.author.id}`))[0].coins;

				//check if listing exists. check if user has enough money
				if (!shopEntry) throw "Could not find a listing with that ID";
				if (userBalance < shopEntry.price * amount) throw "You do not own enough "+ getCurrencyIcon("coins") +getCurrencyDisplayName("coins")+ " to purchase that listing.";

				//remove money from user, add item to inventory
				await queryPromise(`UPDATE user_currencies SET coins = ${userBalance - (shopEntry.price * amount)} WHERE user_id=${msg.author.id}`);
				switch(args[0].toLowerCase())
				{
					case "item":
						await queryPromise(`INSERT INTO user_inventory (user_id,item) VALUES (${msg.author.id},${shopEntry.item_id});`.repeat(amount))
						break;
					case "consumable":
						await queryPromise(`INSERT INTO user_consumables (user_id,consumable_id) VALUES (${msg.author.id},${shopEntry.consumable_id});`.repeat(amount));
						break;
				}

				msg.channel.send(`Listing ${args[1]} has been successfully bought ${amount} times!`);

			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		}
	},
	{
		name: 'sell',
		aliases: ["sell"],
		description: 'Sell items for their standard sell price.',
		usage: `${cf.prefix}sell [itemID1] [itemID2] [itemID3] ...`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				//Check if user is registered
				if (!await isRegistered(msg.author.id))throw "You must be registered to use this command!";

				const item_ids = args.map(x => parseInt(x));
				//Check args
				if (item_ids.length == 0) throw "Please enter the id's of the items you wish to sell.\nUsage: `"+this.usage+"`"

				//Get data
				const [inventoryMod, currencyMod] = <[inventoryModule,currencyModule]> await new UserData(msg.author.id, [userDataModules.inventory,userDataModules.currencies]).init();
				if (inventoryMod.isEmpty) throw "Your inventory is empty.";

				var errormsg = "";
				var currencyGained = 0;
				for (var item_id of item_ids)
				{
					//check if user owns item
					if (!inventoryMod.inventory.has(item_id)) 
					{
						errormsg += `- You do not own the item with id \`${item_id}\`. You may have already sold it.\n`;
						continue;
					}
					var item = inventoryMod.inventory.get(item_id)!.item;

					//remove item
					await UserData.removeItemFromInventory(msg.author.id,inventoryMod,item);
					
					//give currency
					editCollectionNumberValue(currencyMod.currencies,"coins",item.sell_price);
					currencyGained += item.sell_price;
				}
				await currencyMod.update(msg.author.id)
				
				msg.channel.send(`You have sold the selected items for a total of ${getCurrencyIcon("coins")} ${currencyGained} ${getCurrencyDisplayName("coins")} ${errormsg.length > 0 ? `\nThe following errors occured:\n${errormsg}` : ""}`)

			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		}
	}
]

export function SetupCommands()
{
    commands.forEach(cmd =>
    {
		client.commands.set(cmd.name, cmd);
        console.log("command: '"+cmd.name+"' Registered.");
    });
}