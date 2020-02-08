import { commands } from "../main";
import { _equipmentItem, _materialItem, _consumableItem } from "../classes/items";
import { _command } from "../interfaces";
import cf from "../config.json"
import { CC, randomIntFromInterval, getCurrencyAndAmountFromArgs } from "../utils";
import { DataManager } from "../classes/dataManager";
import { User } from "../classes/user";
import { BlackjackSesssion } from "../classes/BlackjackSession";
import { TextChannel } from "discord.js";

export const cmds: _command[] = 
[
	{
		name: 'coinflip',
		category: CC.Gambling,
		executeWhileTravelling: true,
		cooldown: {name: "gambling", duration: 5},
		mustBeRegistered: true,
		aliases: ['cf'],
		description: `Gamble a amount of your coins with a 50/50 coinflip!`,
		usage: `[prefix]coinflip [h/t](heads or tails) [amount (number/half/full)]`,
		execute(msg, args, user: User) 
		{
			const cd = DataManager.getCurrency(1);

			//check for args.
			if (args.length == 0 || (args[0] != "h" && args[0] != "t")) return msg.channel.send(`\`${msg.author.username}\`, the arguements you provided for the command were incorrect.\nUsage: \`${this.usage}\``);
			
			var amount = 0;

			if (args[1].toLowerCase() == "full" || args[1].toLowerCase() == "all") amount = user.getCurrency(1).value;
			else if (args[1].toLowerCase() == "half") amount = Math.round(user.getCurrency(1).value/2);
			else if (!isNaN(+args[1])) amount = Math.round(+args[1]);
			
			if (amount > user.getCurrency(1).value) return msg.channel.send(`\`${msg.author.username}\`, you do not own enough ${cd.icon} to gamble that amount. (bet: ${cd.icon} ${amount} | balance: ${cd.icon} ${user.getCurrency(1).value})`)
			if (amount <= 0) return msg.channel.send(`\`${msg.author.username}\`, you cannot bet nothing or negative amounts!`);
			
			const result = randomIntFromInterval(0,1,true) == 0 ? "h" : "t";

			let msgString = `The coin landed **${result == 'h' ? "heads" : "tails"}**!\n\`${msg.author.username}\` has `

			if (result == args[0]) 
			{
				user.getCurrency(1).value += amount;
				msgString += `**won** `;
			}
			else
			{
				user.getCurrency(1).value -= amount;
				msgString += `**lost** `
			}
			msgString += `${cd.icon} ${amount} ${cd.name}!\nTheir new balance is: ${cd.icon} ${user.getCurrency(1).value} ${cd.name}.`;
			msg.channel.send(msgString);
		},
	},
	{
		name: 'blackjack',
		category: CC.Gambling,
		executeWhileTravelling: true,
		cooldown: {name: "gambling", duration: 5},
		mustBeRegistered: true,
		aliases: ['bj'],
		description: `Gamble a amount of your coins in a blackjack game!`,
		usage: `[prefix]blackjack [[amount (number/half/full)]`,
		execute(msg, args, user: User) 
		{
			const cd = DataManager.getCurrency(1);
			//check for amount
			var amount = 0;

			if (args[0].toLowerCase() == "full" || args[0].toLowerCase() == "all") amount = user.getCurrency(1).value;
			else if (args[0].toLowerCase() == "half") amount = Math.round(user.getCurrency(1).value/2);
			else if (!isNaN(+args[0])) amount = Math.round(+args[0]);
			
			if (amount > user.getCurrency(1).value) return msg.channel.send(`\`${msg.author.username}\`, you do not own enough ${cd.icon} to gamble that amount. (bet: ${cd.icon} ${amount} | balance: ${cd.icon} ${user.getCurrency(1).value})`)
			if (amount <= 0) return msg.channel.send(`\`${msg.author.username}\`, you cannot bet nothing or negative amounts!`);
			
			let bjs = new BlackjackSesssion(msg.author, user, msg.channel as TextChannel, amount);
			DataManager.sessions.set(msg.author.id, bjs);
			bjs.initialize();
		},
	},
]

export function SetupCommands() {for (let cmd of cmds) commands.set(cmd.name, cmd);}