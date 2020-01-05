import Discord from 'discord.js';
import {client} from '../main';
import { blacklistedChannels } from '../staticdata';
import { queryPromise } from '../utils';

export const commands = [
	{
		name: 'blacklist',
		execute_while_travelling: true,
		category: "admin",
		aliases: [],
		description: 'Blacklist a channel in your server and prevent commands from executing there. Execute this again to undo the blacklisting./',
		usage: `[prefix]blacklist [ChannelName]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				//check for permission
				if (!msg.member.permissions.has("ADMINISTRATOR")) throw "You must be a server administrator to run that command."
				//check args
				if (args.length == 0) throw "please enter then name of the channel you wish to blacklist / remove from blacklists"

				const channel = msg.guild.channels.find(x => x.name.toLowerCase() == args[0]);
				if (channel == undefined) throw "Could not find a channel with that name."

				if (blacklistedChannels.includes(channel.id)) 
				{
					await queryPromise(`DELETE FROM blacklisted_channels WHERE channel_id=${channel.id}`);
					blacklistedChannels.splice(blacklistedChannels.indexOf(channel.id));

					msg.channel.send(`Channel with name ${channel.name} has been opened for bot commands.`);
					return;
				}

				blacklistedChannels.push(channel.id);
				await queryPromise(`INSERT INTO blacklisted_channels(channel_id) VALUES (${channel.id})`);
				msg.channel.send(`Channel \`${channel.name}\` has been blacklisted for bot commands.`);
			}
			catch(err)
			{
				console.log(err)
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