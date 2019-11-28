import Discord from 'discord.js';
import {client, con} from '../main';
import {classes, equipment_slots, item_qualities} from '../staticData';
import {_class,_user_data, _item} from '../interfaces';
import {currency_name} from "../config.json";
import {capitalizeFirstLetter} from '../utils';
import {getUserData,calculateReqExp, getInventory} from "../calculations";
export const commands = [
	{
		name: 'profile',
		description: 'Shows the users profile.',
		async execute(msg: Discord.Message, args: string[]) 
		{
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
			//Get UserData
			try {
				var data = await getUserData(user.id);
				//Create an embedd with the profile data.
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
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
				${data!.class!.name}
				${data!.level}
				${data!.exp} / ${calculateReqExp(data!.level)}
				${data!.currency}

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
				${data!.current_hp} / ${data!.max_hp}
				${data!.total_atk}
				${data!.total_def}
				${data!.total_acc}
				`
				, true)

				.addBlankField(false)

				.addField("Equipment:",
				`
				**Main Hand:**
				**Off Hand:**
				**Head:**
				**Chest:**
				**Legs:**
				**Feet:**
				**Trinket:**
				`
				,true)
				.addField(" ឵឵",
				`
				${data!.main_hand == null ? "None" : data!.main_hand.name}
				${data!.off_hand! == null ? "None" : data!.off_hand!.name}
				${data!.head! == null ? "None" : data!.head!.name}
				${data!.chest! == null ? "None" : data!.chest!.name}
				${data!.legs! == null ? "None" : data!.legs!.name}
				${data!.feet! == null ? "None" : data!.feet!.name}
				${data!.trinket! == null ? "None" : data!.trinket!.name}
				`
				,true)
				.setThumbnail(user.user.avatarURL)

				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

				msg.channel.send(embed);
			}
			catch(err){
				msg.channel.send(err);
			}
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
	},
	{
		name: 'inventory',
		description: 'TestCommand!',
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				const inv:_item[] | undefined = await getInventory(msg.author.id);
				var invString = "";
				var infoString = "";
				inv!.forEach(item => {
					invString += `${item.name}\n`

					var slotname = equipment_slots.find(slot => slot.id == item.slot)!.name;
					var qualityName = item_qualities.find(quality => quality.id == item.quality)!.name;
					infoString += `${qualityName} ${slotname}\n`;
				})
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`User inventory: ${msg.member.displayName}`)
				.addField("Items:", invString, true)
				.addField(" ឵឵", infoString, true)
				.setThumbnail(msg.author.avatarURL)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				msg.channel.send(embed);
			}
			catch(err)
			{
				msg.channel.send(err);
			}
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