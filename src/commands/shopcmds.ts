import Discord, { User } from 'discord.js';
import {client} from '../main';
import cf from "../config.json";
import {isRegistered, queryPromise, getCurrencyDisplayName, getCurrencyIcon, editCollectionNumberValue, getEquipmentSlotDisplayName, getGuildPrefix} from "../utils";
import {zone_shops, shop_categories, zones, item_qualities } from '../staticdata';
import { _shop_item, _consumable, _item, _material } from '../interfaces';
import { inventoryModule, userDataModules, UserData, currencyModule, basicModule } from '../classes/userdata';

export const commands = 
[
	{
		name: 'shop',
		category: "economy",
		aliases: [],
		description: 'Shop for items or consumables',
		usage: `[prefix]shop`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				if (!await isRegistered(msg.author.id))throw "You must be registered to use this command!";

				const [basicMod] = <[basicModule]> await new UserData(msg.author.id, [userDataModules.basic]).init();

				const entries = zone_shops.filter(x => x.zone_id == basicMod.zone!);

				if (entries.size == 0) throw "This zone has no shop!"; 

				let shopStrings = [];
				let currentString = "";
				for(let entry of entries)
				{
					if (currentString.length > 900) 
					{
						shopStrings.push(currentString);
						currentString = "";
					}
					switch(shop_categories.get(entry[1].category_id)!.name)
					{
						case "item":
							const item: _item = (await queryPromise(`SELECT * from items WHERE id=${entry[1].entry_id}`))[0];
							currentString += `${item.icon_name} ${item.name} [${item_qualities.get(item.quality)!.name} ${getEquipmentSlotDisplayName(item.slot)}] - ${getCurrencyIcon("coins")} ${entry[1].entry_price} ${getCurrencyDisplayName("coins")}\n`
							break;
						case "consumable":
							const cons: _consumable = (await queryPromise(`SELECT * from consumables WHERE id=${entry[1].entry_id}`))[0];
							currentString += `${cons.icon_name} ${cons.name} [${cons.hp}HP] - ${getCurrencyIcon("coins")} ${entry[1].entry_price} ${getCurrencyDisplayName("coins")}\n`
							break;
						case "material":
							const material: _material = (await queryPromise(`SELECT * from materials WHERE id=${entry[1].entry_id}`))[0];
							currentString += `${material.icon_name} ${material.display_name} - ${getCurrencyIcon("coins")} ${entry[1].entry_price} ${getCurrencyDisplayName("coins")}\n`
							break;
					}
				}
				if (currentString.length > 0) shopStrings.push(currentString);

				const shopEmbed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`Shop -- ${zones.get(basicMod.zone!)!.name}`)
				.setAuthor("Vendor: Execute "+await getGuildPrefix(msg.guild.id)+"buy [ITEMNAME] [optional: AMOUNT] to buy an item!",'http://159.89.133.235/DiscordBotImgs/logo.png')
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

				for (let shopString of shopStrings) shopEmbed.addField("**\u200b**",shopString);

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
		category: "economy",
		aliases: ["purchase"],
		description: 'Buy an item from the shop',
		usage: `[prefix]buy [ITEMNAME] [AMOUNT]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				if (!await isRegistered(msg.author.id))throw "You must be registered to use this command!";

				var amount = 1;
				var itemName;
				//Check args
				if (args.length == 0) throw "Please enter the item you wish to buy!\nUsage: `"+this.usage+"`"

				if (parseInt(args[args.length -1]))
				{
					amount = parseInt(args[args.length -1]);
					itemName = args.slice(0, -1).join(" ").toLowerCase();
				}
				else
				{
					itemName = args.join(" ").toLowerCase();
				}

				if (amount <= 0) throw "You cannot buy amounts smaller than 0.";

				const [basicMod,currencyMod] = <[basicModule,currencyModule]> await new UserData(msg.author.id, [userDataModules.basic,userDataModules.currencies]).init();

				const entries = zone_shops.filter(x => x.zone_id == basicMod.zone!);

				//Get for all entries its name so we can backtrace the item.
				const shopEntriesWithData : Discord.Collection<string, _item | _consumable | _material> = new Discord.Collection();
				for(let entry of entries)
				{
					switch(shop_categories.get(entry[1].category_id)!.name)
					{
						case "item":
							const item: _item = (await queryPromise(`SELECT * from items WHERE id=${entry[1].entry_id}`))[0];
							item.objType = "item";
							shopEntriesWithData.set(item.name.toLowerCase(),item);
							break;
						case "consumable":
							const cons: _consumable = (await queryPromise(`SELECT * from consumables WHERE id=${entry[1].entry_id}`))[0];
							cons.objType = "consumable"
							shopEntriesWithData.set(cons.name.toLowerCase(),cons);
							break;
						case "material":
							const material: _material = (await queryPromise(`SELECT * from materials WHERE id=${entry[1].entry_id}`))[0];
							material.objType = "material";
							shopEntriesWithData.set(material.display_name.toLowerCase(),material);
							break;
					}
				}
				//Check if the users input item exists in the list
				if (!shopEntriesWithData.has(itemName)) throw "Could not find an item with that name in the shop."

				//get the item
				const entryData = shopEntriesWithData.get(itemName);
				const entry = entries.find(x=> shop_categories.get(x.category_id!)!.name == entryData!.objType && x.entry_id == entryData!.id);

				//Check if user has enough balance
				if (currencyMod.currencies.get("coins")! < amount * entry.entry_price) throw `You do not have enough ${getCurrencyIcon("coins")} ${getCurrencyDisplayName("coins")} to buy \`${itemName}\`x${amount}!`
				//Add it to the appropriate inventory.
				let sql = "";
				
				let price = amount * entry.entry_price;
				switch(entryData!.objType)
				{
					case "item":
						for (let i=0; i<amount; i++) sql += `(${msg.author.id}, ${entry.entry_id}),`
						await queryPromise("INSERT INTO user_inventory(user_id,item) VALUES "+sql.slice(0,-1)+";")
						msg.channel.send(`\`${msg.author.username}\` has sucessfully bought __[${(entryData as _item).icon_name} ${(entryData as _item).name}]__x${amount} for ${getCurrencyIcon("coins")} ${price} ${getCurrencyDisplayName("coins")}`);
						break;
					case "consumable":
						for (let i=0; i<amount; i++) sql += `(${msg.author.id}, ${entry.entry_id}),`
						await queryPromise("INSERT INTO user_consumables(user_id,consumable_id) VALUES "+sql.slice(0,-1)+";")
						msg.channel.send(`\`${msg.author.username}\` has sucessfully bought __[${(entryData as _consumable).icon_name} ${(entryData as _consumable).name}]__x${amount} for ${getCurrencyIcon("coins")} ${price} ${getCurrencyDisplayName("coins")}`);
						break;
					case "material":
						await queryPromise(`UPDATE user_materials SET ${(entryData as _material).database_name}=${(entryData as _material).database_name} + ${amount} WHERE user_id=${msg.author.id}`);
						msg.channel.send(`\`${msg.author.username}\` has sucessfully bought __[${(entryData as _material).icon_name} ${(entryData as _material).display_name}]__x${amount} for ${getCurrencyIcon("coins")} ${price} ${getCurrencyDisplayName("coins")}`);
						break;
				}
				editCollectionNumberValue(currencyMod.currencies,"coins",-price);
				currencyMod.update(msg.author.id);
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
		category: "economy",
		aliases: ["sell"],
		description: 'Sell items for their standard sell price.',
		usage: `[prefix]sell [invSlot1] [invSlot2] [invSlot3] ...`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				//Check if user is registered
				if (!await isRegistered(msg.author.id))throw "You must be registered to use this command!";

				const invSlot_ids = args.map(x => parseInt(x));
				//Check args
				if (invSlot_ids.length == 0) throw "Please enter the inventory slots of the items you wish to sell.\nUsage: `"+this.usage+"`"

				//Get data
				const [inventoryMod, currencyMod] = <[inventoryModule,currencyModule]> await new UserData(msg.author.id, [userDataModules.inventory,userDataModules.currencies]).init();
				if (inventoryMod.isEmpty) throw "Your inventory is empty.";

				var errormsg = "";
				var currencyGained = 0;
				for (var invSlot_id of invSlot_ids)
				{
					//check if user owns item
					if (!inventoryMod.inventory.has(invSlot_id)) 
					{
						errormsg += `- You do not own an item in the slot \`${invSlot_id}\`. You may have already sold it.\n`;
						continue;
					}
					var inventoryEntry = inventoryMod.inventory.get(invSlot_id)!;

					//remove item
					await UserData.removeItemFromInventory(msg.author.id,inventoryMod,inventoryMod.inventory.findKey(x => x == inventoryEntry));
					
					//give currency
					editCollectionNumberValue(currencyMod.currencies,"coins",inventoryEntry.item.sell_price);
					currencyGained += inventoryEntry.item.sell_price;
				}
				await currencyMod.update(msg.author.id)
				
				msg.channel.send(`${currencyGained > 0 ? `You have sold the selected items for a total of ${getCurrencyIcon("coins")}` : ``} ${currencyGained} ${getCurrencyDisplayName("coins")} ${errormsg.length > 0 ? `\nThe following errors occured:\n${errormsg}` : ""}`)

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