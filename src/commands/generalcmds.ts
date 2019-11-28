import Discord from 'discord.js';
import {client, con} from '../main';
import {getInventory} from "../calculations";
export const commands = [
	{
		name: 'ping',
		description: 'Ping!',
		execute(msg: Discord.Message, args: string[]) {
			msg.reply("pong!");
		},
	},
	{
		name: 'jointest', //TODO: remove
		description: 'TestCommand!',
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