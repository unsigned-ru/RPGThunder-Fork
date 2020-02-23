import Discord from "discord.js"
import { commands } from "../main";
import { CC, getServerPrefix, getItemAndAmountFromArgs } from "../utils";
import { _equipmentItem, _materialItem, _consumableItem } from "../classes/items";
import { DataManager } from "../classes/dataManager";
import {_command } from "../interfaces";

export const cmds: _command[] = 
[
	{
		name: "op_syncranks",
		aliases: ['op_sr'],
		category: CC.hidden,
		description: "Operator command, resyncronise ranks.",
		executeWhileTravelling: true,
		needOperator: true,
		usage: "[prefix]op_syncranks",
		execute(msg, args)
		{
			DataManager.syncroniseRanks();
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
			let targetUser = msg.mentions.users.first();
			if (!targetUser) targetUser = msg.author;

			let {item,amount,errormsg} = getItemAndAmountFromArgs(args);
			if (errormsg) msg.channel.send(`\`${msg.author.username}\`, ${errormsg}`);

			DataManager.getUser(targetUser.id)?.addItemToInventoryFromId(item!._id, amount);
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
		execute(msg, args)
		{
			let targetUser = msg.mentions.users.first();
			if (!targetUser) return msg.channel.send(`\`${msg.author.username}\`, please @ a user to delete the account from.`)

			let user = DataManager.getUser(targetUser.id);
			if (!user) return msg.channel.send(`\`${msg.author.username}\`, that user has no account.`);

			DataManager.users.delete(user.user_id);
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
		execute(msg, args)
		{
			DataManager.pushDatabaseUpdate();
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
			let textmsg = args.join(" ");
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
		execute(msg, args)
		{
			if (!msg.member.permissions.has("ADMINISTRATOR")) return msg.channel.send(`\`${msg.author.username}\`, you must have administrator permissions to execute this command.`);
			if (msg.mentions.channels.size == 0) return msg.channel.send(`\`${msg.author.username}\`, please mention the text channels you wish to blacklist.`);
			let successMessage = `\`${msg.author.username}\`,\n`;
			for (let c of msg.mentions.channels.values())
			{
				if (!DataManager.blacklistedChannels.includes(c.id)) 
				{
					DataManager.blacklistedChannels.push(c.id)
					successMessage += `blacklisted channel: ${c.toString()}\n`
				}
				else
				{
					DataManager.blacklistedChannels.splice(DataManager.blacklistedChannels.indexOf(c.id),1);
					successMessage += `de-blacklisted channel: ${c.toString()}\n`
				}
			}
			if (successMessage.length > 0) msg.channel.send(successMessage);
		}
	}
]

export function SetupCommands() {for (let cmd of cmds) commands.set(cmd.name, cmd);}

export function executeGlobalCommand(msg: Discord.Message, cmd:string, args: string[])
{
	if (!cmd) return msg.channel.send(`\`${msg.author.username}\`, please enter what command you want to run.\n\`rpgthunder [prefix/setprefix/resetprefix]\``)
    switch(cmd.toLowerCase())
    {
        case "prefix":
            msg.channel.send(`\`${msg.author.username}\`, this server's prefix is \`${getServerPrefix(msg)}\`.`)
            break;
        case "setprefix":
            if (!msg.member.permissions.has("ADMINISTRATOR")) return msg.channel.send(`\`${msg.author.username}\`, you must have administrator permissions to execute this command.`);
            if (args.length == 0) return msg.channel.send(`\`${msg.author.username}\`, please enter a prefix.`);
            if (args.length > 1) return msg.channel.send(`\`${msg.author.username}\`, please enter a prefix without a space in it.`);
            if (args[0].length > 10) return msg.channel.send(`\`${msg.author.username}\`, custom prefixes may not be longer than 10 characters.`);
            DataManager.serverPrefixes.set(msg.guild.id,args[0]);
            msg.channel.send(`\`${msg.author.username}\`, the server's prefix has been set to \`${getServerPrefix(msg)}\``);
            break;
        case "resetprefix":
            if (!msg.member.permissions.has("ADMINISTRATOR")) return msg.channel.send(`\`${msg.author.username}\`, you must have administrator permissions to execute this command.`);
            if (DataManager.serverPrefixes.has(msg.guild.id)) DataManager.serverPrefixes.delete(msg.guild.id);
            msg.channel.send(`\`${msg.author.username}\`, the prefix has been sucessfully reset to \`${getServerPrefix(msg)}\``);
            break;
    }
}