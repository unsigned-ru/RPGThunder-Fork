import Discord from 'discord.js';
import {client} from '../main';
export const commands = [
	{
		name: 'ping',
		description: 'Ping!',
		execute(msg: Discord.Message, args: string[]) {
			msg.reply("pong!");
		},
	},
	{
		name: 'test',
		description: 'TestCommand!',
		execute(msg: Discord.Message, args: string[]) {
			msg.channel.send('Test command registered.');
		},
	},
	{
		name: 'userjointest',
		description: 'TestCommand!',
		execute(msg: Discord.Message, args: string[]) {
            msg.reply("emitting event...");
            client.c.emit("guildMemberAdd",msg.mentions.users.first());
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