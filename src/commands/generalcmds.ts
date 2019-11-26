import Discord from 'discord.js';
import {client, con} from '../main';
import {getUserStats} from "../calculations";
export const commands = [
	{
		name: 'ping',
		description: 'Ping!',
		execute(msg: Discord.Message, args: string[]) {
			msg.reply("pong!");
		},
	},
	{
		name: 'jointest',
		description: 'TestCommand!',
		execute(msg: Discord.Message, args: string[]) {
            msg.channel.send("emitting event...");
            client.c.emit("guildMemberAdd",msg.mentions.members.first());
		},
	},
	{
		name: 'stattest',
		description: 'TestCommand!',
		execute(msg: Discord.Message, args: string[]) {
			getUserStats(msg.author.id);
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