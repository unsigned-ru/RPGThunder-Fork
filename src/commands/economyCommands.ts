import Discord from "discord.js";
import { commands } from "../main";
import { DataManager } from "../classes/dataManager";
import { CC, clamp, getItemAndAmountFromArgs, constructWarningMessageForItem, awaitConfirmMessage, constructCurrencyString, filterItemArray, getCurrencyAndAmountFromArgs, colors } from "../utils";
import { DbEquipmentItem, DbMaterialItem, DbConsumableItem, MaterialItem, EquipmentItem, ConsumableItem, _anyItem, anyItem } from "../classes/items";
import { User } from "../classes/user";
import { CommandInterface } from "../interfaces";
import cf from "../config.json";

export const cmds: CommandInterface[] = 
[
    {
		name: 'shop',
		category: CC.Economy,
		executeWhileTravelling: false,
		mustBeRegistered: true,
		aliases: [],
		description: "Visit the shop and see what your current zone's town has in stock.",
		usage: `[prefix]shop [optional: page] -[optional: filters]`,
		execute(msg: Discord.Message, args, user: User) 
		{	
			const zone = user.getZone();
			const listings = zone.getShopListings();
			let listingItems = listings.map(x => x.itemdata!);
			const pages = [];
			let maxItems = 5;
			let itemCounter = 0;
			let selectedPage = 1;
			let listingsString = "";

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
					default:
						listingItems = filterItemArray(p, listingItems) as _anyItem[];
						break;
				}
			}

			for (const l of listingItems)
			{
				if (itemCounter >= maxItems) {pages.push(listingsString); listingsString = ""; itemCounter = 0;}
				const ld = listings.find(x => x.itemdata?._id == l._id);
				listingsString += `${l._id} - ${l.icon} __${l.name}__`+
				`${l.getDataString()}\n`;
				let ra: string[]= [];
				if (ld?.itemCosts) ra = ra.concat(ld?.itemCosts.map(x => `${x.amount} ${DataManager.getItem(x.id)!.icon}`));
				if (ld?.currencyCosts) ra = ra.concat(ld?.currencyCosts.map(x => `${x.amount} ${DataManager.getCurrency(x.id)?.icon}`));
				listingsString += `${ra.join(" | ")}\n\n`;
				itemCounter++;
			}
			if (listingsString.length > 0) pages.push(listingsString);

			if (pages.length == 0) return msg.channel.send(`\`${msg.author.username}\`, there are no shop items matching your query.`);
			//clamp the selectedpage to the min and max values
			selectedPage = clamp(selectedPage, 1, pages.length);
			
			const embed = new Discord.RichEmbed()
            .setTitle(`Shop -- ${zone.name} | Page ${selectedPage}/${pages.length}`)
			.setDescription(pages[selectedPage - 1])
			.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
			.setColor(colors.yellow)
			.setAuthor(`use $buy [itemName/itemID] to buy an item from the shop`,`http://159.89.133.235/DiscordBotImgs/logo.png`);
			msg.channel.send(embed);
		},
	},
	{
		name: 'buy',
		category: CC.Economy,
		executeWhileTravelling: false,
		mustBeRegistered: true,
		aliases: [],
		description: "Buy an item from your current zone's shop.",
		usage: `[prefix]buy [itemName/itemID] [optional: amount]`,
		async execute(msg: Discord.Message, args, user: User) 
		{	
			const listings = user.getZone().shop.listings;

			//check if args are correct
			if (args.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you did not provide what item to buy.\n${this.usage}`);
	
			//parse args
			const {item, amount} = getItemAndAmountFromArgs(args,user);
			
			//check if item exists and shop sells item
			if (!item) return msg.channel.send(`\`${msg.author.username}\`, could not find an item with that id/name`);
			if (!listings.some(x => x.item == item?._id)) return msg.channel.send(`\`${msg.author.username}\`, this zone's shop does not sell the item ${item.getDisplayString()}__.`);

			const listing = listings.find(x => x.item == item?._id)!;
			const missingStrings: string[] = [];
			const costStrings: string[] = [];

			//check if user has the required items and currencies.
			for (const cc of listing.currencyCosts)
			{
				const cd = DataManager.getCurrency(cc.id);
				if (user.getCurrency(cc.id).value < (cc.amount * amount)) missingStrings.push(`${cd?.icon} ${(cc.amount * amount) - user.getCurrency(cc.id).value} ${cd?.name}`);
				else costStrings.push(`${cd?.icon} ${cc.amount * amount} ${cd?.name}`);
			}
			for (const ic of listing.itemCosts)
			{
				const id = DataManager.getItem(ic.id)!;
				if (id instanceof DbEquipmentItem && !user.inventory.some(x => x.id == id._id)) missingStrings.push(`${id._id} - ${id.icon} __${id.name}__`);
				else if (id instanceof DbConsumableItem || id instanceof DbMaterialItem)
				{
					if (!user.inventory.some(x => x.id == id._id)) missingStrings.push(`${id._id} - ${id.icon} __${id.name}__ x${ic.amount * amount}`);
					else 
					{ 
						const invEntry = user.inventory.find(x => x.id == ic.id) as ConsumableItem | MaterialItem;
						if (invEntry.amount < (ic.amount * amount)) missingStrings.push(`${id._id} - ${id.icon} __${id.name}__ x${(ic.amount * amount) - invEntry.amount}`); 
						else costStrings.push(`${id._id} - ${id.icon} __${id.name}__ x${ic.amount * amount}`);
					}
				}
			}
			if (missingStrings.length > 0) return msg.channel.send(`\`${msg.author.username}\`, you are missing the following to buy the item:\n${missingStrings.join("\n")}`);
			
			//construct confirm message
			const warningMessage = constructWarningMessageForItem(item,user);
			if (!await awaitConfirmMessage(`\`${msg.author.username}\`, are you sure you would like to buy ${item.getDisplayString()}__x${amount}?`, `**Costs:**\n${costStrings.join("\n")}\n\n${warningMessage.length > 0 ? `⚠️ **Warnings:** ⚠️\n${warningMessage}` : ""}`, msg,user)) return;
			
			//take the currencies and materials from the user.
			for (const cc of listing.currencyCosts) user.getCurrency(cc.id).value -= amount * cc.amount; 
			for (const ic of listing.itemCosts) user.removeItemFromInventoryFromId(ic.id,amount);
			//add the item to the users inventory
			user.addItemToInventoryFromId(item._id, amount);

			msg.channel.send(`\`${msg.author.username}\` has successfully bought ${item.getDisplayString()}__x${amount}!`);
		},
	},
	{
		name: 'sell',
		category: CC.Economy,
		executeWhileTravelling: false,
		mustBeRegistered: true,
		aliases: [],
		description: "Sell one or more items for its default selling price.",
		usage: `[prefix]sell [itemName1/itemID1] [optional: amount], [itemName2/itemID2] [optional: amount]`,
		async execute(msg: Discord.Message, args, user: User) 
		{	
			//parse args to a usable format
			const pargs = args.join(" ").split(",").map(x => x.trim().split(" "));
			const warningMessages = [];
			const entriesToSell = [];

			for (const parg of pargs) 
			{
				if (!parg[0]) continue;
				// eslint-disable-next-line prefer-const
				let {item, amount, errormsg} = getItemAndAmountFromArgs(parg,user);
				if (!item) {warningMessages.push(errormsg); continue;}
				const invEntry = user.inventory.find(x => x.id == item?._id);
				if (!invEntry) {warningMessages.push(`You don't own the item: ${item.icon} ${item.name}`); continue;}
				if ((invEntry instanceof ConsumableItem || invEntry instanceof MaterialItem))
				{
					if (amount < 1) {warningMessages.push(`selling amount cannot be smaller than 1 (for item ${item.icon} ${item.name})`); continue;}
					if (invEntry.amount < amount) {warningMessages.push(`You are trying to sell more than you own for item ${item.icon} ${item.name} (You only own ${invEntry.amount})`); continue;}
					if (entriesToSell.filter(x => x.item._id == item?._id).reduce((pv,v) => v.amount,0) + amount > invEntry.amount) {warningMessages.push(`You are trying to sell more than you own for item ${item.icon} ${item.name} (You only own ${invEntry.amount})`); continue;}

				}
				if (invEntry instanceof EquipmentItem)
				{
					if (entriesToSell.filter(x => x.item._id == invEntry?.id).length + 1 > user.inventory.filter(x => x.id == invEntry?.id).length) {warningMessages.push(`You are trying to sell more than you own for item ${item.icon} ${item.name} (You only own ${user.inventory.filter(x => x.id == invEntry?.id).length})`); continue;}
				}
				if (!amount) amount = 1;
				entriesToSell.push({item: item, amount: amount});
			}
			if (warningMessages.length == 0 && entriesToSell.length == 0) return msg.channel.send(`\`${msg.author.username}\`, nothing to sell.`);
			const totalPrice = entriesToSell.reduce((pv, v) => v.item.sellPrice * v.amount, 0);
			//construct confirm message and return if not reacted.
			if (!await awaitConfirmMessage(
			`\`${msg.author.username}\` are you sure you would like to sell the following items for a total of ${constructCurrencyString(1, totalPrice)}?`,
			`**Items**:\n${entriesToSell.map(x=> `${x.item._id} - ${x.item.icon} ${x.item.name} x${x.amount} for ${constructCurrencyString(1,x.item.sellPrice * x.amount)}`).join("\n")}\n\n⚠️ **Warnings** ⚠️\n${warningMessages.join("\n")}`
			,msg,user)) return;
			if (entriesToSell.length == 0) return msg.channel.send(`\`${msg.author.username}\`, no items were sold.`);
			for (const i of entriesToSell) user.removeItemFromInventoryFromId(i.item._id, i.amount);
			user.getCurrency(1).value += totalPrice;
			
			msg.channel.send(`\`${msg.author.username}\` has successfully sold their items for ${constructCurrencyString(1, totalPrice)}.`);
		},
	},
	{
		name: 'sellall',
		category: CC.Economy,
		executeWhileTravelling: false,
		mustBeRegistered: true,
		aliases: [],
		description: "Sell an item for its default selling price.",
		usage: `[prefix]sellall -[filter1] -[filter2] -[filter3]...`,
		async execute(msg: Discord.Message, args, user: User) 
		{	
			let cinventory = user.inventory.slice(); 
			for(const p of args.join(" ").split('-').slice(1).map(x => x.trim().split(" "))) cinventory = filterItemArray(p, cinventory) as anyItem[];
			
			if (cinventory.length == 0) return msg.channel.send(`\`${msg.author.username}\` you have no items that fit your query.`);
			
			const totalPrice = cinventory.reduce((pv, v) => {
				if (v instanceof ConsumableItem || v instanceof MaterialItem) return pv + v.amount * v.getData()!.sellPrice;
				else return pv + v.getData()!.sellPrice;
			},0);
			let itemsString = cinventory.slice(0,20).map(x => {
				const id = x.getData();
				if (x instanceof ConsumableItem || x instanceof MaterialItem) return `${id?._id} - ${id?.icon} ${id?.name} x${x.amount} for ${constructCurrencyString(1,x.amount * id?.sellPrice!)}`;
				return `${id?._id} - ${id?.icon} ${id?.name} for ${constructCurrencyString(1,id?.sellPrice!)}`;
			}).join("\n");
			if (cinventory.length > 20) itemsString += `\n**And more...**`;
			if (!await awaitConfirmMessage(`\`${msg.author.username}\`, are you sure you want to sell the items for ${constructCurrencyString(1,totalPrice)}?`, `**Items:**\n${itemsString}`,msg,user)) return;

			for (const e of cinventory) user.removeEntryFromInventory(e);
			user.getCurrency(1).value += totalPrice;

			msg.channel.send(`\`${msg.author.username}\` has sold their items for ${constructCurrencyString(1,totalPrice)}.`);
		},
	},
	{
		name: 'giveitem',
		category: CC.Economy,
		executeWhileTravelling: false,
		mustBeRegistered: true,
		aliases: ['giftitem','senditem','gifti','sendi','givei'],
		description: "Give an item to a player.",
		usage: `[prefix]giveitem [itemID/itemName] [optional: amount] [@user]`,
		execute(msg: Discord.Message, args, suser: User) 
		{	
			//get mentioned user
			if (!msg.mentions.users.first()) return msg.channel.send(`\`${msg.author.username}\`, please mention a user to send the item to.`);
			const ruser = DataManager.users.get(msg.mentions.users.first().id);
			if (!ruser) return msg.channel.send(`\`${msg.author.username}\`, receiver \`${msg.mentions.users.first().username}\` is not registered.`);
			args.splice(args.indexOf(msg.mentions.users.first.toString()),1);

			//parse args amount and item
			const {item, amount, errormsg} = getItemAndAmountFromArgs(args,suser);
			if (!item) return msg.channel.send(`\`${msg.author.username}\`, ${errormsg}`);

			//check if user has enough / has item
			if ((item instanceof DbMaterialItem || item instanceof DbConsumableItem)) 
			{
				const invEntry = suser.inventory.find(x => x.id == item?._id) as ConsumableItem | MaterialItem | undefined;
				if (!invEntry) return msg.channel.send(`\`${msg.author.username}\`, you do not own the item ${item.getDisplayString()}__`);
				if (amount > invEntry.amount) return msg.channel.send(`\`${msg.author.username}\`, you do not own enough of the item ${item.getDisplayString()}__ (sending: ${amount} | you own: ${invEntry.amount})`);
				
				//delete from sender, add to receiver.
				suser.removeItemFromInventoryFromId(invEntry.id, amount);
				ruser.addItemToInventoryFromId(invEntry.id, amount);
			}
			if (item instanceof DbEquipmentItem)
			{
				const invEntries = suser.inventory.filter(x => x.id == item?._id);
				if (invEntries.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you do not own the item ${item.getDisplayString()}__`);
				if (amount > invEntries.length) return msg.channel.send(`\`${msg.author.username}\`, you do not own enough of the item ${item.getDisplayString()}. (sending: ${amount} | you own: ${invEntries.length})`);

				//delete from sender, add to receiver.
				for (const invEntry of invEntries)
				{
					suser.removeEntryFromInventory(invEntry);
					ruser.addItemToInventory(invEntry);
				}
			}
			msg.channel.send(`\`${msg.author.username}\` has sucessfully sent \`${ruser.getUser().username}\` ${item.getDisplayString()}__ x${amount}`);
		},
	},
	{
		name: 'givecurrency',
		category: CC.Economy,
		executeWhileTravelling: false,
		mustBeRegistered: true,
		aliases: ['gift$','giftcurrency','sendcurrency','send$','givecurr','sendcurr','giftcurr'],
		description: "Give currency to a player.",
		usage: `[prefix]givecurrency [currencyName] [optional: amount] [@user]`,
		execute(msg: Discord.Message, args, suser: User) 
		{	
			//get mentioned user
			if (!msg.mentions.users.first()) return msg.channel.send(`\`${msg.author.username}\`, please mention a user to send the item to.`);
			const ruser = DataManager.users.get(msg.mentions.users.first().id);
			if (!ruser) return msg.channel.send(`\`${msg.author.username}\`, receiver \`${msg.mentions.users.first().username}\` is not registered.`);
			args.splice(args.indexOf(msg.mentions.users.first.toString()),1);

			//parse args amount and item
			const {currency, amount, errormsg} = getCurrencyAndAmountFromArgs(args,suser);
			if (!currency) return msg.channel.send(`\`${msg.author.username}\`, ${errormsg}`);

			//check if user has enough
			const c = suser.getCurrency(currency._id).value;
			if (c < amount) return msg.channel.send(`\`${msg.author.username}\`, you do not own enough of the currency ${currency._id} - ${currency.icon} __${currency.name}__ (sending: ${amount} | you own: ${c})`);

			//delete from user, add to other user.
			suser.getCurrency(currency._id).value -= amount;
			ruser.getCurrency(currency._id).value += amount;

			msg.channel.send(`\`${msg.author.username}\` has sucessfully sent \`${ruser.getUser().username}\` ${constructCurrencyString(currency._id, amount)}`);
		},
	},
	{
		name: 'sell',
		category: CC.Economy,
		executeWhileTravelling: false,
		mustBeRegistered: true,
		aliases: [],
		description: "Sell one or more items for its default selling price.",
		usage: `[prefix]sell [itemName1/itemID1] [optional: amount], [itemName2/itemID2] [optional: amount]`,
		async execute(msg: Discord.Message, args, user: User) 
		{	
			//parse args to a usable format
			const pargs = args.join(" ").split(",").map(x => x.trim().split(" "));
			const warningMessages = [];
			const entriesToSell = [];

			for (const parg of pargs) 
			{
				if (!parg[0]) continue;
				// eslint-disable-next-line prefer-const
				let {item, amount, errormsg} = getItemAndAmountFromArgs(parg,user);
				if (!item) {warningMessages.push(errormsg); continue;}
				const invEntries = user.inventory.filter(x => x.id == item?._id);
				if (invEntries.length == 0) {warningMessages.push(`You don't own the item: ${item.icon} ${item.name}`); continue;}
				if ((invEntries[0] instanceof ConsumableItem || invEntries[0] instanceof MaterialItem))
				{
					const invEntry = invEntries[0];
					if (amount < 1) {warningMessages.push(`selling amount cannot be smaller than 1 (for item ${item.icon} ${item.name})`); continue;}
					if (invEntry.amount < amount) {warningMessages.push(`You are trying to sell more than you own for item ${item.icon} ${item.name} (You only own ${invEntry.amount})`); continue;}
					if (entriesToSell.filter(x => x.item._id == item?._id).reduce((pv,v) => v.amount,0) + amount > invEntry.amount) {warningMessages.push(`You are trying to sell more than you own for item ${item.icon} ${item.name} (You only own ${invEntry.amount})`); continue;}
				}
				if (item instanceof DbEquipmentItem && amount > invEntries.length) {warningMessages.push(`You are trying to sell more than you own for item ${item.icon} ${item.name} (You only own ${invEntries.length})`); continue;}
				if (!amount) amount = 1;
				
				entriesToSell.push({item: item, amount: amount});
			}
			if (warningMessages.length == 0 && entriesToSell.length == 0) return msg.channel.send(`\`${msg.author.username}\`, nothing to sell.`);
			const totalPrice = entriesToSell.reduce((pv, v) => pv + v.item.sellPrice * v.amount, 0);

			//construct confirm message and return if not reacted.
			if (!await awaitConfirmMessage(
			`\`${msg.author.username}\` are you sure you would like to sell the following items for a total of ${constructCurrencyString(1, totalPrice)}?`,
			`**Items**:\n${entriesToSell.map(x=> `${x.item._id} - ${x.item.icon} ${x.item.name} x${x.amount} for ${constructCurrencyString(1,x.item.sellPrice * x.amount)}`).join("\n")}\n\n⚠️ **Warnings** ⚠️\n${warningMessages.join("\n")}`
			,msg,user)) return;
			if (entriesToSell.length == 0) return msg.channel.send(`\`${msg.author.username}\`, no items were sold.`);
			for (const i of entriesToSell) user.removeItemFromInventoryFromId(i.item._id, i.amount);
			user.getCurrency(1).value += totalPrice;
			
			msg.channel.send(`\`${msg.author.username}\` has successfully sold their items for ${constructCurrencyString(1, totalPrice)}.`);
		},
	},
	{
		name: 'lottery',
		category: CC.Economy,
		executeWhileTravelling: false,
		mustBeRegistered: true,
		aliases: [],
		description: "Enter the lottery for a chance on the big price!",
		usage: `[prefix]lottery [buy/tickets/price/prize] [amount]`,
		async execute(msg: Discord.Message, args, user: User) 
		{
			if (args.length == 0) return msg.channel.send(`\`${msg.author.username}\`, please specify what lottery command you want to use: \nUsage: \`${this.usage}\``);

			const lottery = DataManager.activeLottery;
			switch(args[0])
			{
				case "buy":
				{
					if (isNaN(+args[1])) return msg.channel.send(`\`${msg.author.username}\`, please enter the amount of tickets to buy`);
					const amount = +args[1];
					if (user.getCurrency(1).value < amount * lottery.ticketCost) return msg.channel.send(`\`${msg.author.username}\`, you need ${constructCurrencyString(1,(amount * lottery.ticketCost) - user.getCurrency(1).value)} more to buy ${amount} tickets.`);
					if (lottery.getTicketsForUser(msg.author.id) + amount > cf.lottery_max_tickets) return msg.channel.send(`\`${msg.author.username}\`, you cannot buy ${amount} tickets. You are only allowed to buy a total of ${cf.lottery_max_tickets} tickets for each lottery. (You own ${lottery.getTicketsForUser(msg.author.id)} tickets)`);
					//await confirmation
					if (!await awaitConfirmMessage(`\`${msg.author.username}\`, are you sure you want to purchase these lottery tickets?`,`The price for ${amount} tickets is ${constructCurrencyString(1,amount * lottery.ticketCost)}.`,msg, user)) return;

					user.getCurrency(1).value -= (amount * lottery.ticketCost);
					lottery.addTicketsForUser(msg.author.id,amount);
					return msg.channel.send(`\`${msg.author.username}\` has bought ${amount} tickets`);
				}

				case "tickets": return msg.channel.send(`\`${msg.author.username}\`, you own ${lottery.getTicketsForUser(msg.author.id)} tickets to the current lottery.`);

				case "price":
					return msg.channel.send(`\`${msg.author.username}\`, the current lottery ticket price is: ${constructCurrencyString(1,lottery.ticketCost)}`);
				case "prize":
					return msg.channel.send(`\`${msg.author.username}\`, the current lottery prize pool is: ${constructCurrencyString(1,lottery.getPrize())}`);
				default:
					return msg.channel.send(`\`${msg.author.username}\`, unknown lottery command.\nUsage: \`${this.usage}\``);
			}
		},
	},
];

export function SetupCommands() {for (const cmd of cmds) commands.set(cmd.name, cmd);}