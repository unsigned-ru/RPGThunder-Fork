import Discord from 'discord.js';
import {client, con} from '../main';
import {classes} from '../staticData';
import {_class,_user_stats} from '../interfaces';
import {currency_name} from "../config.json";
import {capitalizeFirstLetter} from '../utils';
import {getUserStats,calculateReqExp} from "../calculations";
export const commands = [
	{
		name: 'profile',
		description: 'Shows the users profile.',
		execute(msg: Discord.Message, args: string[]) {
			var user: Discord.GuildMember;

			//check if there is a mentioned arg.
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
			con.query(sql, async function(err, results){
				if (err) 
				{
					return;
				}
				if (results[0].length == 0)
				{
					msg.channel.send("User is not registered.");
					return;
				}
				var stats = await getUserStats(user.id);
				
				//Create an embedd with the profile data.
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //TODO: change maybe
				.setTitle(`User profile: ${user.displayName}`)
				
				.addField("Info:",
				`
				**Class:**
				**Level:**
				**Exp:**
				**${capitalizeFirstLetter(currency_name)}:**
				`,true)

				.addField(" ឵឵",
				`
				${classes.find(element => element.id.valueOf() == results[0][0].class_id)!.name}
				${results[1][0].level}
				${results[1][0].exp} / ${calculateReqExp(stats!.level)}
				${results[1][0].currency}

				`,true)
				.addBlankField(false)
				.addField("Stats:",
				`
				**HP:**
				**ATK:**
				**DEF:**
				**ACC:**
				`
				, true)

				.addField(" ឵឵",
				`
				${stats!.hp} / ${stats!.max_hp}
				${stats!.total_atk}
				${stats!.total_def}
				${stats!.total_acc}
				`
				, true)

				.setThumbnail(user.user.avatarURL)

				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

				msg.channel.send(embed);

			});
		},
	},
	{
		name: 'register',
		description: 'Registers user!',
		execute(msg: Discord.Message, args: string[]) {
			//Check if user already in database.
			con.query(`SELECT * FROM users WHERE user_id='${msg.author.id}'`,function(err,result: object[])
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

				const selectedClass = classes.find(element => element.name.toLowerCase() == args[0].toLowerCase());
				if (selectedClass == undefined) 
				{ 
					msg.reply("Did not find a class with that name.")
					return;
				}
				var sql = 
				`INSERT INTO users(user_id,class_id,datetime_joined) VALUES ('${msg.author.id}',${selectedClass.id},${con.escape(new Date())});` +

				`INSERT INTO user_stats(user_id,current_hp) VALUES ('${msg.author.id}', ${selectedClass.base_hp});` +
						 
				`INSERT INTO user_equipment(user_id,main_hand,off_hand,head,chest,legs,feet,trinket) VALUES 
				('${msg.author.id}',${selectedClass.starting_item_main_hand},${selectedClass.starting_item_off_hand},
				${selectedClass.starting_item_head},${selectedClass.starting_item_chest},${selectedClass.starting_item_legs},
				${selectedClass.starting_item_feet},${selectedClass.starting_item_trinket});`
			
				con.query(sql, (err,result) => 
				{
					if (err)
					{
						msg.reply("An error occured while comminicating with the database, please try again. If the error persists please open a ticket.");
						console.log(err);
						return;
					}
					else
					{
						msg.reply(`You have sucessfully registered as an ${capitalizeFirstLetter(args[0].toLowerCase())}`);
					}
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