import Discord from 'discord.js';
import {client, con} from '../main';
import {getInventory} from "../calculations";
import {prefix} from "../config.json";
export const commands = [
	{
		name: 'ping',
		description: 'Ping! Pong?! Wait what is this? ',
		usage: `${prefix}ping`,
		execute(msg: Discord.Message, args: string[]) {
			msg.reply("pong!");
		},
	},
	{
		name: 'jointest', //TODO: remove
		description: 'TestCommand!',
		usage: `${prefix}jointest [@User]`,
		execute(msg: Discord.Message, args: string[]) {
            msg.channel.send("emitting event...");
            client.c.emit("guildMemberAdd",msg.mentions.members.first());
		},
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