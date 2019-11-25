import Discord from 'discord.js';
import {client, con, capitalizeFirstLetter} from '../main';
import { MysqlError } from 'mysql';
import { connect } from 'http2';
export const commands = [
	{
		name: 'profile',
		description: 'Shows the users profile.',
		execute(msg: Discord.Message, args: string[]) {
			var user: Discord.GuildMember;
			//check if there is a mentioned arg.
			var usingMention = false;
			if (msg.mentions.members.size > 0)
			{
				user = msg.mentions.members.first();
			}
			else
			{
				user = msg.member;
			}
			//Get the users data from the database:
			var sql = `SELECT * FROM users WHERE user_id=${user.id};SELECT * FROM user_stats WHERE user_id='${user.id}';`;
			con.query(sql, function(err, results){
				console.log(results);
				if (err) 
				{
					return;
				}
				if (results[0].length == 0)
				{
					msg.channel.sendMessage("User is not registered.");
					return;
				}
				
				//Create an embedd with the profile data.
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //TODO: change maybe
				.setTitle(`User profile: ${user.displayName}`)
				
				.addField("Info:",
				`
				**Class:**
				**Level:**
				**Exp:**
				`,true)

				.addField(" ឵឵",
				`
				${results[0][0].class_id}
				${results[1][0].level}
				${results[1][0].exp}

				`,true)
				.addBlankField(false)
				.addField("Stats:",
				`
				**HP:**
				`
				, true)

				.addField(" ឵឵",
				`
				${results[1][0].current_hp}

				`
				, true)

				.setThumbnail(user.user.avatarURL)

				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

				msg.channel.send(embed);

			});
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