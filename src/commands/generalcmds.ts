import Discord from 'discord.js';
import {client, con, capitalizeFirstLetter} from '../main';
import { MysqlError } from 'mysql';
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
	//TODO: Maybe add this in a seperate commandfile.
	{
		name: 'register',
		description: 'Registers user!',
		execute(msg: Discord.Message, args: string[]) {
			//Check if user already in database.
			con.query(`SELECT * FROM users WHERE userID='${msg.author.id}'`,function(err,result: object[])
			{
				if (result.length != 0)
				{
					msg.reply("You have already registered.");
					return;
				}

				//note: can only be executed in DM with the bot.
				if (msg.channel.type != 'dm') 
				{
					msg.reply("This command can only be executed in the DM with the bot.");
					return;
				}

				var classID: number;
				switch (args[0].toLowerCase())
				{
					case "swordsman":
						msg.reply("Creating your user as the swordsman class!");
						classID = 1;
							break;
					case "archer":
						msg.reply("Creating your user as the archer class!");
						classID = 2;
						break;
					default:
						msg.reply("Could not find a class with that name.");
						return;
				}	

				var insertUser = `INSERT INTO users(userID,classID,datetimeJoined) VALUES ('${msg.author.id}',${classID},${con.escape(new Date())});`
				var insertStats = `INSERT INTO user_stats(userID) VALUES ('${msg.author.id}');`
			
				con.query(insertUser, (err: MysqlError,result) => {
					if (err)
					{
						msg.reply("An error occured while comminicating with the database, please try again. If the error persists please open a ticket.");
						console.log(err);
						return;
					}

					con.query(insertStats, (err: MysqlError,result) => {
						if (err)
						{
							msg.reply("An error occured while comminicating with the database, please try again. If the error persists please open a ticket.");
							console.log(err);
							return;
						}
						
						var classStr = capitalizeFirstLetter(args[0].toLowerCase());
						msg.reply("You have successfully registered as an "+ classStr+" !");
					});

				});
				
				
			});
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