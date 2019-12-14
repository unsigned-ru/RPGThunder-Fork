import Discord, { RichEmbed } from 'discord.js';
import {client, con, blackjackSessions} from '../main';
import {prefix} from "../config.json";
import {randomIntFromInterval, isRegistered, queryPromise, getCurrencyDisplayName, getCurrencyIcon, editCollectionNumberValue} from "../utils";
import { BlackJackSession } from '../classes/blackjacksession';
import { currencyModule, UserData, userDataModules } from '../classes/userdata';
export const commands = [
	{
		name: 'coinflip',
		aliases: ['cf'],
		description: `Gamble a amount of your ${getCurrencyDisplayName("coins")} with a 50/50 coinflip!`,
		usage: `${prefix}coinflip [h/t](heads or tails) [amount (number/half/full)]`,
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
		aliases: ['bj'],
		description: `Gamble a amount of your ${getCurrencyDisplayName("coins")} and start a blackjack session with the bot.`,
		usage: `${prefix}blackjack [amount (number/half/full)]`,
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
				//TODO: add link to the session here:

				const bjSession = new BlackJackSession(msg.channel as Discord.TextChannel,msg.author,amount);
				blackjackSessions.push(bjSession);
				await bjSession.initAsync();

				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
			
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
			
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
]

export function SetupCommands()
{
    commands.forEach(cmd =>
    {
		client.commands.set(cmd.name, cmd);
        console.log("command: '"+cmd.name+"' Registered.");
    });
}