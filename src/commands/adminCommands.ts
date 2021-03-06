import Discord from "discord.js";
import { CC, getServerPrefix, getItemAndAmountFromArgs, sleep, getItemDataEmbed } from "../utils";
import { DataManager } from "../classes/dataManager";
import { CommandInterface } from "../interfaces";
import { rateStack } from "../events/messageReceived";
import { commands } from "../RPGThunder";

export const cmds: CommandInterface[] = 
[
	{
		name: "op_listitems",
		aliases: [],
		category: CC.hidden,
		description: "Operator command, resyncronise ranks.",
		executeWhileTravelling: true,
		needOperator: true,
		usage: "[prefix]op_listitems",
		async execute(msg: Discord.Message, args: string[]) 
		{
			for (const i of DataManager.items.values()) 
			{
				msg.channel.send(getItemDataEmbed(i)).catch(err => console.log(err));
				await sleep(2);
			}
		},
	},
	{
		name: "op_syncranks",
		aliases: ['op_sr'],
		category: CC.hidden,
		description: "Operator command, resyncronise ranks.",
		executeWhileTravelling: true,
		needOperator: true,
		usage: "[prefix]op_syncranks",
		execute()
		{
			DataManager.syncroniseRanks();
		}
	},
	{
		name: "op_updatelottery",
		aliases: [],
		category: CC.hidden,
		description: "Operator command, resyncronise ranks.",
		executeWhileTravelling: true,
		needOperator: true,
		usage: "[prefix]op_syncranks",
		execute()
		{
			DataManager.activeLottery.updateMessage();
		}
	},
	{
		name: "op_listicons",
		aliases: [],
		category: CC.hidden,
		description: "Operator command, resyncronise ranks.",
		executeWhileTravelling: true,
		needOperator: true,
		usage: "[prefix]op_syncranks",
		async execute(msg)
		{
			//unique
			const icons = [...new Set(DataManager.items.map(x => x.icon).filter(x => x.length > 0))];
			
			const strings = [];
			
			let counter = 0;
			let string = "";
			for (const icon of icons)
			{
				if (counter % 27 == 0) { strings.push(string); string = "";}
				string += icon;
				counter++;
			}
			if (string.length > 0) strings.push(string);

			for (const s of strings)
			{
				msg.channel.send(s);
				await sleep(1);	
			}
		}
	},
	{
		name: "op_giveitem",
		aliases: ['op_gi'],
		category: CC.hidden,
		description: "Operator command, give item.",
		executeWhileTravelling: true,
		needOperator: true,
		usage: "[prefix]op_giveitem [ItemID/Name] [Amount] [@User]",
		execute(msg, args)
		{
			let targetUsers = msg.mentions.members;
			if (!targetUsers) targetUsers = new Discord.Collection([[msg.author.id, msg.member!]]);

			const pargs = args.filter(arg => !arg.startsWith('<@') && !arg.endsWith('>')).map(x => x.trim()).join(" ").split(",").map(x => x.split(" "));

			for (const u of targetUsers.values())
			{
				for (const parg of pargs)
				{
					const {item,amount,errormsg} = getItemAndAmountFromArgs(parg);
					if (errormsg) { msg.channel.send(`\`${msg.author.username}\`, ${errormsg}`); continue; }

					const uac = DataManager.getUser(u.id);
					if (uac) uac.addItemToInventoryFromId(item!._id, amount);
				}
			}
			
		}
	},

	{
		name: "op_givecurrency",
		aliases: ['op_gc'],
		category: CC.hidden,
		description: "Operator command, give currency.",
		executeWhileTravelling: true,
		needOperator: true,
		usage: "[prefix]op_givecurrency [currencyID/currencyName] [Amount] [@User]",
		execute(msg, args, user)
		{
			if (isNaN(+args[0]) && isNaN(+args[1])) return;
			let targetUsers = msg.mentions.members;
			if (!targetUsers) targetUsers = new Discord.Collection([[msg.author.id, msg.member!]]);
			
			for (const u of targetUsers.values()) DataManager.getUser(u.id)?.getCurrency(+args[0])!.value += +args[1];
		}
	},

	{
		name: "op_unstuck",
		aliases: [],
		category: CC.hidden,
		description: "Operator command, Unstuck a user.",
		executeWhileTravelling: true,
		needOperator: true,
		usage: "[prefix]op_unstuck [@User]",
		execute(msg, args)
		{
			const targetUser = msg.mentions.users.first();
			if (!targetUser) return;

			const user = DataManager.getUser(targetUser.id);
			if (!user) return msg.channel.send("User not registered.");

			//Check for sessions
			const s = DataManager.sessions.get(user.userID);
			if (s) s.destroySession();

			//check for confirmations
			if (user.reaction.isPending)
			{
				clearTimeout(user.reaction.timerID);
				user.reaction.isPending = false;
			}

			//check for macro confirms
			if (user.macroProtection.userLocked)
			{
				user.macroProtection.userLocked = false;
				user.macroProtection.questionActive = false;
				user.macroProtection.commandCounter = 0;
			}
			
			//check for rate limiter entry
			if (rateStack.has(user.userID)) rateStack.delete(user.userID);
		}
	},
	{
		name: "op_giveexp",
		aliases: ['op_exp'],
		category: CC.hidden,
		description: "Operator command, give item.",
		executeWhileTravelling: true,
		needOperator: true,
		usage: "[prefix]op_giveexp [Amount] [@User]",
		execute(msg, args)
		{
			let targetUser = msg.mentions.users.first();
			if (!targetUser) targetUser = msg.author;

			if (isNaN(+args[0])) return;
			DataManager.getUser(targetUser.id)?.gainExp(+args[0],msg);
		}
	},

	{
		name: "op_deleteaccount",
		aliases: [],
		category: CC.hidden,
		needOperator: true,
		description: "Operator command, give item.",
		executeWhileTravelling: true,
		usage: "[prefix]op_deleteaccount [@User]",
		execute(msg)
		{
			const targetUser = msg.mentions.users.first();
			if (!targetUser) return msg.channel.send(`\`${msg.author.username}\`, please @ a user to delete the account from.`);

			const user = DataManager.getUser(targetUser.id);
			if (!user) return msg.channel.send(`\`${msg.author.username}\`, that user has no account.`);

			DataManager.users.delete(user.userID);
		}
	},

	{
		name: "op_save",
		aliases: ['op_sv'],
		category: CC.hidden,
		description: "Operator command, save the local data and push it to the database.",
		executeWhileTravelling: true,
		needOperator: true,
		usage: "[prefix]op_save",
		execute()
		{
			DataManager.pushDatabaseUpdate();
		}
	},
	{
		name: "op_updatestatus",
		aliases: [],
		category: CC.hidden,
		description: "Operator command, save the local data and push it to the database.",
		executeWhileTravelling: true,
		needOperator: true,
		usage: "",
		execute()
		{
			DataManager.updateBotStatus();
		}
	},
	{
		name: "op_say",
		aliases: ['op_s'],
		category: CC.hidden,
		description: "Operator command, send a bot message.",
		executeWhileTravelling: true,
		needOperator: true,
		usage: "[prefix]op_say",
		execute(msg, args)
		{
			msg.delete();
			const textmsg = args.join(" ");
			if (textmsg.length > 0) msg.channel.send(textmsg);
		}
	},
    {
		name: "blacklist",
		aliases: [],
		category: CC.hidden,
		description: "blacklist",
		executeWhileTravelling: true,
		usage: "[prefix]blacklist [#Channel]",
		execute(msg)
		{
			if (!msg.member?.permissions.has("ADMINISTRATOR")) return msg.channel.send(`\`${msg.author.username}\`, you must have administrator permissions to execute this command.`);
			if (msg.mentions.channels.size == 0) return msg.channel.send(`\`${msg.author.username}\`, please mention the text channels you wish to blacklist.`);
			let successMessage = `\`${msg.author.username}\`,\n`;
			for (const c of msg.mentions.channels.values())
			{
				if (!DataManager.blacklistedChannels.includes(c.id)) 
				{
					DataManager.blacklistedChannels.push(c.id);
					successMessage += `blacklisted channel: ${c.toString()}\n`;
				}
				else
				{
					DataManager.blacklistedChannels.splice(DataManager.blacklistedChannels.indexOf(c.id),1);
					successMessage += `de-blacklisted channel: ${c.toString()}\n`;
				}
			}
			if (successMessage.length > 0) msg.channel.send(successMessage);
		}
	}
];

export function SetupCommands() {for (const cmd of cmds) commands.set(cmd.name, cmd);}

export function executeGlobalCommand(msg: Discord.Message, cmd: string, args: string[])
{
	if (!cmd) return msg.channel.send(`\`${msg.author.username}\`, please enter what command you want to run.\n\`rpgthunder [prefix/setprefix/resetprefix]\``);
    switch(cmd.toLowerCase())
    {
        case "prefix":
            msg.channel.send(`\`${msg.author.username}\`, this server's prefix is \`${getServerPrefix(msg)}\`.`);
            break;
        case "setprefix":
            if (!msg.member?.permissions.has("ADMINISTRATOR")) return msg.channel.send(`\`${msg.author.username}\`, you must have administrator permissions to execute this command.`);
            if (args.length == 0) return msg.channel.send(`\`${msg.author.username}\`, please enter a prefix.`);
            if (args.length > 1) return msg.channel.send(`\`${msg.author.username}\`, please enter a prefix without a space in it.`);
            if (args[0].length > 10) return msg.channel.send(`\`${msg.author.username}\`, custom prefixes may not be longer than 10 characters.`);
            if (msg.guild) DataManager.serverPrefixes.set(msg.guild.id,args[0]);
            msg.channel.send(`\`${msg.author.username}\`, the server's prefix has been set to \`${getServerPrefix(msg)}\``);
            break;
        case "resetprefix":
            if (!msg.member?.permissions.has("ADMINISTRATOR")) return msg.channel.send(`\`${msg.author.username}\`, you must have administrator permissions to execute this command.`);
            if (msg.guild && DataManager.serverPrefixes.has(msg.guild.id)) DataManager.serverPrefixes.delete(msg.guild.id);
            msg.channel.send(`\`${msg.author.username}\`, the prefix has been sucessfully reset to \`${getServerPrefix(msg)}\``);
            break;
    }
}