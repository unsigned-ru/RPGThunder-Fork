import Discord from 'discord.js';
import {client, con} from '../main';
import {classes, equipment_slots, item_qualities, item_types} from '../staticData';
import {_class,_user_data, _item, _item_type} from '../interfaces';
import {currency_name} from "../config.json";
import {capitalizeFirstLetter, queryPromise} from '../utils';
import {getUserData,calculateReqExp, getInventory, getItemData} from "../calculations";
import { isNullOrUndefined } from 'util';
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
					infoString += `${qualityName} ${slotname} [id:${item.id}]\n`;
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
	},
	{
		name: 'itemdata',
		description: 'TestCommand!',
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (args.length == 0 || parseInt(args[0]) == undefined){ throw "Please enter a valid id."}
				const item  = await getItemData(parseInt(args[0]));
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`Item #${item!.id}: ${item!.name}`)
				.addField("Desciption:", item!.description)

				.addField("Info:",
				`
				**Quality:**
				**Slot:**
				**Type:**
				**Level Req:**
				`
				,true)
				.addField(" ឵឵",
				`
				${item_qualities.find(quality => quality.id == item!.quality)!.name}
				${equipment_slots.find(slot => slot.id == item!.slot)!.name}
				${item_types.find(type => type.id == item!.type)!.name}
				${item!.level_req}
				`
				,true)

				.addBlankField()
				
				.addField("Stats:",
				`
				**ATK:**
				**DEF:**
				**ACC:**
				`
				,true)

				.addField(" ឵឵",
				`
				${item!.atk}
				${item!.def}
				${item!.acc}
				`
				,true)
				.setThumbnail("http://159.89.133.235/DiscordBotImgs/logo.png")
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				msg.channel.send(embed);
			}
			catch(err)
			{
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'equip',
		description: 'TestCommand!',
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				var item_id = parseInt(args[0]);
				if (args.length == 0 || item_id == undefined){ throw "Please enter a valid id."}
				const userResult: any[] = await queryPromise(`SELECT class_id, FROM users WHERE user_id=${msg.author.id}`);
				if (userResult.length == 0){throw "You must be registered to equip an item."}

				const selectedClass :_class = classes.find(x => x.id == userResult[0].class_id)!
				const itemCountResult  = (await queryPromise(`SELECT COUNT(*) FROM user_inventory WHERE item=${item_id} AND user_id=${msg.author.id}`))[0];
				const itemCount = itemCountResult[Object.keys(itemCountResult)[0]];
				if (itemCount == 0) {throw "You do not own that item."}

				//user owns the item, equip it and remove it from the inventory.
				const item = await getItemData(item_id);

				//check if the users level is high enough
				const currentLevel = (await queryPromise(`SELECT level FROM user_stats WHERE user_id=${msg.author.id}`))[0].level
				if (item!.level_req > currentLevel) {throw "You are not high enough level to equip this item."}
				//check if the user is allowed to wear this type.
				if (!selectedClass.allowed_item_types.split(",").includes(item!.type.toString())) {throw "Your class is not allowed to wear that item's type!"}
				console.log(selectedClass.allowed_item_types);
				//Equip it in the correct slot.
				var slot;
				switch(equipment_slots.find(slot => slot.id == item!.slot)!.name.toLowerCase())
				{
					case "main hand":
						slot = "main_hand"
						break;
					case "off hand":
						slot = "off_hand"
						break;
					case "head":
						slot = "head"
						break;
					case "chest":
						slot = "chest"
						break;
					case "legs":
						slot = "legs"
						break;
					case "feet":
						slot = "feet"
						break;
					case "trinket":
						slot = "trinket"
						break;
					
					default:
						throw "Error with finding correct equipment slot. Please contact an admin or open a ticket.";
				}
				//put the previous equipped item in the inventory.

				const currentItem = (await queryPromise(`SELECT ${slot} FROM user_equipment WHERE user_id=${msg.author.id};`))[0]
				console.log(currentItem)
				const current_item_id = currentItem[Object.keys(currentItem)[0]];
				if (current_item_id != null || current_item_id != undefined)
				{
					await queryPromise(`INSERT INTO user_inventory (user_id, item) VALUES ('${msg.author.id}', ${current_item_id})`);
				}
				//Equip it (send the query)
				await queryPromise(`UPDATE user_equipment SET ${slot}=${item!.id} WHERE user_id=${msg.author.id};`)
				
				//Remove the item from the inventory
				await queryPromise(`DELETE FROM user_inventory WHERE user_id=${msg.author.id} AND item=${item!.id} LIMIT 1`)

				msg.channel.send(`You have sucessfully equipped: ${item!.name}! The replaced item was moved to your inventory.`);
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