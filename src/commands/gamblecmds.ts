import Discord, { Message, MessageEmbed, TextChannel } from 'discord.js';
import {client, blackjackSessions, coinflip_cooldown} from '../main';
import {randomIntFromInterval, isRegistered, getCurrencyDisplayName, getCurrencyIcon, editCollectionNumberValue, getCooldownForCollection, setCooldownForCollection, formatTime, queryPromise} from "../utils";
import { BlackJackSession } from '../classes/blackjacksession';
import { currencyModule, UserData, userDataModules } from '../classes/userdata';
import * as cf from '../config.json';
import { _lottery, _lottery_entry } from '../interfaces';
import { resetLotteryJob } from '../events/generalevents';
export const commands = [
	{
		name: 'coinflip',
		category: "gambling",
		execute_while_travelling: true,
		aliases: ['cf'],
		description: `Gamble a amount of your coins with a 50/50 coinflip!`,
		usage: `[prefix]coinflip [h/t](heads or tails) [amount (number/half/full)]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				const coins_display_name = getCurrencyDisplayName("coins");

				//check if registered
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command!"

				//check for args.
				if (args.length == 0 || (args[0] != "h" && args[0] != "t")) throw "Please enter what side of the coin you wish to bet on.\nUsage: `"+ this.usage+"`";
				if (args.length == 0) throw "Please enter an amount you wish to gamble.\nUsage: `"+ this.usage+"`";
				if (coinflip_cooldown.has(msg.author.id)) throw `That command is on cooldown for another ${formatTime(getCooldownForCollection(msg.author.id,coinflip_cooldown))}`;

				setCooldownForCollection(msg.author.id, cf.cf_cooldown, coinflip_cooldown);

				//get the amount of coins the user has
				const [currencyMod] = <[currencyModule]> await new UserData(msg.author.id, [userDataModules.currencies]).init();

				var amount = 0;

				if (args[1].toLowerCase() == "full") amount = currencyMod.currencies.get("coins")!;
				else if (args[1].toLowerCase() == "half") amount = Math.round(currencyMod.currencies.get("coins")!/2);
				else if (parseFloat(args[1])) 
				{
					amount = parseFloat(args[1]);
					if (amount > currencyMod.currencies.get("coins")!) throw "You do not own enough coins to gamble that amount.";
				}

				if (amount <=0) throw "Cannot bet nothing or negative amounts!";
				
				var result;
				randomIntFromInterval(0,1) == 0 ? result = "h" : result = "t";

				if (result == args[0]) 
				{
					editCollectionNumberValue(currencyMod.currencies,"coins", +amount)
					msg.channel.send(`Congratulations! You have **won** ${getCurrencyIcon("coins")} ${amount.toFixed(0)} ${coins_display_name}!\nYour new balance is: ${getCurrencyIcon("coins")} ${currencyMod.currencies.get("coins")!.toFixed(0)} ${coins_display_name}`)
				}
				else
				{
					editCollectionNumberValue(currencyMod.currencies,"coins", -amount)
					msg.channel.send(`Unlucky! You **lost** ${getCurrencyIcon("coins")} ${amount.toFixed(0)} ${coins_display_name}!\nYour new balance is: ${getCurrencyIcon("coins")} ${currencyMod.currencies.get("coins")!.toFixed(0)} ${coins_display_name}`)
				}
				currencyMod.update(msg.author.id);

			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
			
		},
	},
	{
		name: 'blackjack',
		category: "gambling",
		execute_while_travelling: true,
		aliases: ['bj'],
		description: `Gamble a amount of your coins and start a blackjack session with the bot.`,
		usage: `[prefix]blackjack [amount (number/half/full)]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				const coins_display_name = getCurrencyDisplayName("coins");
				//check if is in guild.
				if (msg.channel.type == "dm") throw "You can only initiate a Blackjack session in a discord server.";

				//check if registered
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command!"

				//check for args.
				if (args.length == 0) throw "Please enter an amount you wish to gamble.\nUsage: `"+ this.usage+"`";

				//get the amount of coins the user has
				const [currencyMod] = <[currencyModule]> await new UserData(msg.author.id, [userDataModules.currencies]).init();
				var amount = 0;

				//convert args to actual amount of coins.

				if (args[0].toLowerCase() == "full") amount = currencyMod.currencies.get("coins")!;
				else if (args[0].toLowerCase() == "half") amount = Math.round(currencyMod.currencies.get("coins")!/2);
				else if (parseFloat(args[0])) 
				{
					amount = parseFloat(args[0]);
					if (amount > currencyMod.currencies.get("coins")!) throw `You do not own enough ${coins_display_name} to gamble that amount.`;
				}

				//check if the amount is not 0 or below
				if (amount <= 0) throw "You bet must be bigger then 0!";

				//check if user has no active session
				if (blackjackSessions.find(x => x.user.id == msg.author.id)) throw "You still have an open session please end your previous session!"

				const bjSession = new BlackJackSession(msg.channel as Discord.TextChannel,msg.author,amount);
				blackjackSessions.push(bjSession);
				await bjSession.initAsync();
			
				await msg.channel.send(`${msg.author.username} has started a Blackjack Session ${getCurrencyIcon("coins")} ${amount} ${coins_display_name}!\nClick the link below to join or watch!`);
				msg.channel.send(bjSession.invite!.url)
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'lottery',
		category: "gambling",
		execute_while_travelling: true,
		aliases: ['lt'],
		description: `Enter the daily lottery by buying a ticket!`,
		usage: `[prefix]lottery [amountOfTickets]\n[prefix]lottery tickets`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				//check if registered
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command!"

				//check for args.
				if (args.length == 0) throw `Please enter the amount of tickets you wish to buy!\nUsage: \`${this.usage}\``

				//get the active lottery from the database.
				var lottery: _lottery = (await queryPromise("SELECT * FROM lotteries WHERE is_finished=0 LIMIT 1"))[0]
				
				if (args[0].toLowerCase() == "tickets")
				{
					var data = (await queryPromise(`SELECT tickets FROM lottery_entries WHERE user_id=${msg.author.id} AND lottery_id=${lottery.id}`))[0];
					if (!data) return msg.channel.send("You do not own any tickets for the current lottery!");
					else return msg.channel.send(`You own ${data.tickets} tickets in the current lottery!`);
				}

				//get the amount of coins the user has
				const [currencyMod] = <[currencyModule]> await new UserData(msg.author.id, [userDataModules.currencies]).init();
				var amount = 0;

				//convert args to actual amount of coins.
				if (parseFloat(args[0])) amount = parseFloat(args[0]);

				//check if user has enough currency
				if (amount * lottery.ticket_cost > currencyMod.currencies.get("coins")!) throw `You do not own enough coins to buy ${amount} tickets.`;

				//check if the amount is not 0 or below
				if (amount <= 0) throw "You must buy atleast 1 ticket!";

				//confirm
				var confirmEmbed = new Discord.RichEmbed()
				.setTitle(`Lottery Entry Confirmation -- ${msg.author.username}`)
				.setDescription(`**Are you sure you would like to buy __${amount} Tickets for Lottery#${lottery.id}?__** *(${getCurrencyIcon("coins")} ${amount * lottery.ticket_cost} ${getCurrencyDisplayName("coins")})*`)
				.setTimestamp()
				.setFooter("Yes / No", 'http://159.89.133.235/DiscordBotImgs/logo.png')
				.setColor('#fcf403')
				msg.channel.send(confirmEmbed);

				var rr = await msg.channel.awaitMessages((m:Discord.Message) => m.author.id == msg.author.id, {maxMatches: 1, time: 20000});
				if (rr.first().content.toLowerCase() != "yes") return;

				//check if we are inside of the database already
				if ((await queryPromise(`SELECT COUNT(*) FROM lottery_entries WHERE user_id=${msg.author.id} AND lottery_id=${lottery.id}`))[0]["COUNT(*)"] > 0)
				{
					//we are inside
					await queryPromise(`UPDATE lottery_entries SET tickets= tickets+${amount} WHERE user_id=${msg.author.id} AND lottery_id=${lottery.id}`);
				}
				else
				{
					//we are not inside
					await queryPromise(`INSERT INTO lottery_entries(user_id,lottery_id,tickets) VALUES (${msg.author.id}, ${lottery.id},${amount})`);
				}

				editCollectionNumberValue(currencyMod.currencies,"coins",-(amount*lottery.ticket_cost));
				currencyMod.update(msg.author.id);

				msg.channel.send(`\`${msg.author.username}\` has bought ${amount} tickets to Lottery#${lottery.id}`);
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
    commands.forEach(cmd =>
    {
		client.commands.set(cmd.name, cmd);
        console.log("command: '"+cmd.name+"' Registered.");
    });
}

export async function updateLotteryMessage()
{
	try
	{
		//Get Message
		var message = await (client.c.channels.get(cf.lottery_channel_id) as Discord.TextChannel).fetchMessage(cf.lottery_message_id);
		
		//Get all data from database
		var lottery: _lottery = (await queryPromise("SELECT * FROM lotteries WHERE is_finished=0 LIMIT 1"))[0]

		var lotteryEntries: _lottery_entry[] = await queryPromise(`SELECT * FROM lottery_entries WHERE lottery_id = ${lottery.id}`);

		var totalEntries = lotteryEntries.reduce((prev,curr) => prev + curr.tickets,0);
		var embed = new Discord.RichEmbed()
		.setTitle(`Lottery #${lottery.id} -- Prize: ${getCurrencyIcon("coins")} ${totalEntries * lottery.ticket_cost} ${getCurrencyDisplayName("coins")}`)
		.setTimestamp(resetLotteryJob.nextInvocation())
		.setFooter("Ends", 'http://159.89.133.235/DiscordBotImgs/logo.png')
		.setColor('#fcf403')

		var topEntryString = "";
		var i = 1;
		for (let entry of lotteryEntries.sort((a,b) => b.tickets - a.tickets))
		{
			topEntryString += `\`${client.c.users.get(entry.user_id)!.username}\` - **${entry.tickets} Tickets**\n`;
			if (i >= 10) break;
			i++;
		}

		if (topEntryString.length > 0) embed.addField(`**Top Entries __(Total: ${totalEntries})__**`,topEntryString);

		message.edit(embed);
	}
	catch(err)
	{
		console.log(err);
	}
	

}

export async function resetLottery()
{
	//Get all data from database
	var lottery: _lottery = (await queryPromise("SELECT * FROM lotteries WHERE is_finished=0 LIMIT 1"))[0];
	var lotteryEntries: _lottery_entry[] = await queryPromise(`SELECT * FROM lottery_entries WHERE lottery_id = ${lottery.id}`);

	//make a pool of all tickets.
	var ticketPool :string[] = [];
	for (let entry of lotteryEntries) for (let i=0; i < entry.tickets; i++) ticketPool.push(entry.user_id);

	//select a random winner
	var winnerid = ticketPool[randomIntFromInterval(0,ticketPool.length-1)];

	//update database lottery entry to be finished with winner
	await queryPromise(`UPDATE lotteries SET is_finished=1, winner_id=${winnerid} WHERE id=${lottery.id}`);
	//give the price to winning user.
	await queryPromise(`UPDATE user_currencies SET coins=coins+${ticketPool.length*lottery.ticket_cost} WHERE user_id=${winnerid}`);
	//delete old entries from old lottery
	await queryPromise(`DELETE FROM lottery_entries WHERE lottery_id=${lottery.id}`);

	//create new lottery
	await queryPromise(`INSERT INTO lotteries (ticket_cost) VALUES (${randomIntFromInterval(100, 500)})`);

	//announce winner
	//get user.
	var announcementChannel = (client.c.channels.get(cf.announcements_channel_id)! as TextChannel)
	var user = client.c.users.get(winnerid);
	announcementChannel.send(`@everyone\n✨\`${user!.username}\` has won the lottery and received ${getCurrencyIcon("coins")} ${ticketPool.length*lottery.ticket_cost} ${getCurrencyDisplayName("coins")}✨`);
	user!.send(`✨ You have won the lottery and received ${getCurrencyIcon("coins")} ${ticketPool.length*lottery.ticket_cost} ${getCurrencyDisplayName("coins")}`);

	//update message
	updateLotteryMessage();
}