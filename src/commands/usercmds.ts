import Discord from 'discord.js';
import {client, con, gather_commands_cooldown} from '../main';
import {classes, equipment_slots, item_qualities, item_types} from '../staticData';
import {_class,_user_data, _item, _item_type} from '../interfaces';
import {currency_display_names, prefix, chop_wood_gain_min,chop_wood_gain_max, command_cooldown, 
	mine_coin_gain_max,mine_coin_gain_min,mine_ore_gain_max,mine_ore_gain_min, mine_rare_drops,
	mine_chance_for_coin,mine_chance_for_ore
} from "../config.json";
import {capitalizeFirstLetter, queryPromise, randomIntFromInterval} from '../utils';
import {getUserData,calculateReqExp, getInventory, getItemData} from "../calculations";
export const commands = [
	{
		name: 'profile',
		aliases: ['pf'],
		description: 'Shows a user profile containing their class, stats and equipment.',
		usage:`${prefix}profile [optional: @User]`,
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

				//get all the currencies into a proper string:
				var currencyNameString = "";
				var currencyValueString = "";
				for (const property in data.currencies)
				{
					if (property == "user_id") continue;
					if (property == "id") continue;
					currencyNameString+= `**${currency_display_names.find(x => x.database_name == property)!.display_name}:**\n`;
					currencyValueString+= data.currencies[property]+"\n"
				}


				//Create an embedd with the profile data.
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`User profile: ${user.displayName}`)
				
				.addField("Info:",
				`
				**Class:**
				**Level:**
				**Exp:**
				`,true)

				.addField(" ឵឵",
				`
				${data.class!.name}
				${data.level}
				${data.exp} / ${calculateReqExp(data.level)}`
				,true)

				.addBlankField(false)

				.addField("Currency:",
				`
				${currencyNameString}
				`,true)

				.addField(" ឵឵",
				`
				${currencyValueString}
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
				${data.current_hp} / ${data.max_hp}
				${data.total_atk}
				${data.total_def}
				${data.total_acc}
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
				${data.main_hand == null ? "None" : data.main_hand.name}
				${data.off_hand! == null ? "None" : data.off_hand!.name}
				${data.head! == null ? "None" : data.head!.name}
				${data.chest! == null ? "None" : data.chest!.name}
				${data.legs! == null ? "None" : data.legs!.name}
				${data.feet! == null ? "None" : data.feet!.name}
				${data.trinket! == null ? "None" : data.trinket!.name}
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
		aliases: [],
		description: 'Registers a user!',
		usage: `${prefix}register [class]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				//note: can only be executed in DM with the bot.
				if (msg.channel.type != 'dm') throw "This command can only be executed in the DM with the bot.";

				const userCountResult = (await queryPromise(`SELECT COUNT(*) FROM users WHERE user_id=${msg.author.id}`))[0]
				const userCount = userCountResult[Object.keys(userCountResult)[0]];
				if (userCount != 0) throw "You have already registered.";

				if (args.length == 0) throw "Please enter the class you wish to register as!"

				const selectedClass = classes.find(element => element.name.toLowerCase() == args[0].toLowerCase());
				if (!selectedClass) throw "Did not find a class with that name.";

				const sql = 
				//user creation.
				`INSERT INTO users(user_id,class_id,datetime_joined,current_hp) VALUES ('${msg.author.id}',${selectedClass.id},${con.escape(new Date())}, ${selectedClass.base_hp});` +
				//user_equipment creation + asigning starter gear.
				`INSERT INTO user_equipment(user_id,main_hand,off_hand,head,chest,legs,feet,trinket) VALUES`+
				`('${msg.author.id}',${selectedClass.starting_item_main_hand},${selectedClass.starting_item_off_hand},`+
				`${selectedClass.starting_item_head},${selectedClass.starting_item_chest},${selectedClass.starting_item_legs},`+
				`${selectedClass.starting_item_feet},${selectedClass.starting_item_trinket});`+
				//user_currencies creation.
				`INSERT INTO user_currencies(user_id) VALUES ('${msg.author.id}');`

				await queryPromise(sql);

				msg.channel.send(`You have sucessfully registered as an ${capitalizeFirstLetter(args[0].toLowerCase())}`);
			}
			catch(err)
			{
				console.log(err);
				msg.reply("An error occured: \n" + err);
			}
		},
	},
	{
		name: 'inventory',
		aliases: ['inv'],
		description: 'Lists all items in your inventory and their respective ids.',
		usage: `${prefix}inventory`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				const userCountResult = (await queryPromise(`SELECT COUNT(*) FROM users WHERE user_id=${msg.author.id}`))[0]
				const userCount = userCountResult[Object.keys(userCountResult)[0]];
				if (userCount == 0) {throw "You must be registered to view your inventory."}

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
		aliases: ['id'],
		description: 'Shows all the information about an item.',
		usage: `${prefix}itemdata [itemID1], [itemID[2], ...`,
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
		aliases: [],
		description: 'Equips an item or a set of items from your inventory.',
		usage: `${prefix}equip [itemID1] [itemID[2] ...`,
		async execute(msg: Discord.Message, args: string[])
		{
			var sucess_output :string = "";
			try
			{
				//Turn args into numbers and add them to array
				var already_equipped_slots :number[] = []
				var item_ids :number[] = [];

				//check if there are args
				if (args.length == 0) {throw "Please enter the ids of the items you wish to equip."}

				for (var arg of args)
				{
					var id = parseInt(arg);
					if (id != undefined)
					{
						item_ids.push(id);
					}
					else throw "One of the id's you entered was invallid.";
				}

				//Check if the user is registered.
				const userCountResult = (await queryPromise(`SELECT COUNT(*) FROM users WHERE user_id=${msg.author.id}`))[0]
				const userCount = userCountResult[Object.keys(userCountResult)[0]];
				if (userCount == 0) {throw "You must be registered to equip an item."}
				
				//Get the users class
				const userResult: any[] = await queryPromise(`SELECT class_id FROM users WHERE user_id=${msg.author.id}`);
				const selectedClass :_class = classes.find(x => x.id == userResult[0].class_id)!
				
				//Iterate over each item_id
				for (var item_id of item_ids)
				{
					//Check if user has the item in inventory.
					const itemCountResult = (await queryPromise(`SELECT COUNT(*) FROM user_inventory WHERE item=${item_id} AND user_id=${msg.author.id}`))[0];
					if (itemCountResult[Object.keys(itemCountResult)[0]] == 0) {throw "You do not own an item with the id: "+item_id}

					//get the item's data.
					const item = await getItemData(item_id);
					const slot = equipment_slots.find(slot => slot.id == item.slot)!;

					//check if the user has already equipped an item of that slot
					if (already_equipped_slots.includes(item!.slot)) { throw "You have already equipped an item in the slot: "+ slot.name}
					
					
					//check if the users level is high enough
					const currentLevel = (await queryPromise(`SELECT level FROM users WHERE user_id=${msg.author.id}`))[0].level
					if (item.level_req > currentLevel) {throw "You are not high enough level to equip item with id: "+item_id}

					//check if the user is allowed to wear this type.
					if (!selectedClass.allowed_item_types.split(",").includes(item!.type.toString())) {throw `You cannot equip item with id: ${item_id} because you class is not allowed to wear the type: ${item_types.find(type => type.id == item!.type)!.name}.`}

					//convert the slot to a query string for table user_equipment.
					var slotQueryString;
					switch(slot.name.toLowerCase())
					{
						case "main hand":
							slotQueryString = "main_hand"
							break;
						case "off hand":
							slotQueryString = "off_hand"
							break;
						case "head":
							slotQueryString = "head"
							break;
						case "chest":
							slotQueryString = "chest"
							break;
						case "legs":
							slotQueryString = "legs"
							break;
						case "feet":
							slotQueryString = "feet"
							break;
						case "trinket":
							slotQueryString = "trinket"
							break;

						default:
							throw "Error with finding correct equipment slot. Please contact an admin or open a ticket.";
					}

					//put the previous equipped item in the inventory.
					const currentItem = (await queryPromise(`SELECT ${slotQueryString} FROM user_equipment WHERE user_id=${msg.author.id};`))[0]
					const current_item_id = currentItem[Object.keys(currentItem)[0]];
					if (current_item_id != null || current_item_id != undefined)
					{
						await queryPromise(`INSERT INTO user_inventory (user_id, item) VALUES ('${msg.author.id}', ${current_item_id})`);
					}

					//Equip the new item in the correct slot.
					await queryPromise(`UPDATE user_equipment SET ${slotQueryString}=${item!.id} WHERE user_id=${msg.author.id};`)
					
					//Remove the equipped item from inventory.
					await queryPromise(`DELETE FROM user_inventory WHERE user_id=${msg.author.id} AND item=${item!.id} LIMIT 1`)

					//add the equipped type to already_equipped_slots.
					already_equipped_slots.push(item!.slot);
					sucess_output += `You have sucessfully equipped: ${item!.name} in the slot: ${slot.name}!\n`
				}
				msg.channel.send(sucess_output);
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(sucess_output + err);
			}
		}
	},
	{
		name: 'chop',
		aliases: [],
		description: 'Chop for some wood!',
		usage: `${prefix}Chop`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				const userCountResult = (await queryPromise(`SELECT COUNT(*) FROM users WHERE user_id=${msg.author.id}`))[0]
				const userCount = userCountResult[Object.keys(userCountResult)[0]];
				if (userCount == 0) throw "You must be registered to use this command!";

				//Check for cooldown.
				if (gather_commands_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference < command_cooldown) throw `Ho there!\nThat command is on cooldown for another ${Math.round(command_cooldown - difference)} seconds!`;
				}
				else
				{
					gather_commands_cooldown.push({user_id: msg.author.id, date: new Date()});
				}

				//Generate number between minwood and maxwood
				const amount = randomIntFromInterval(chop_wood_gain_min, chop_wood_gain_max);

				await queryPromise(`UPDATE user_currencies SET wood=wood + ${amount} WHERE user_id=${msg.author.id};`);

				msg.channel.send(`You have sucessfully chopped ${amount} wood!`);
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send("An error occured: \n" + err);
			}
		},
	},
	{
		name: 'mine',
		aliases: [],
		description: 'Mine for coins/ores/gems!',
		usage: `${prefix}mine`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				const userCountResult = (await queryPromise(`SELECT COUNT(*) FROM users WHERE user_id=${msg.author.id}`))[0]
				const userCount = userCountResult[Object.keys(userCountResult)[0]];
				if (userCount == 0) throw "You must be registered to use this command!";

				//Check for cooldown.
				if (gather_commands_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference < command_cooldown) throw `Ho there!\nThat command is on cooldown for another ${Math.round(command_cooldown - difference)} seconds!`;
					gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date = new Date();
				}
				else
				{
					gather_commands_cooldown.push({user_id: msg.author.id, date: new Date()});
				}

				//Coins or ore
				const typeFlip = randomIntFromInterval(0, 10000);
				if (typeFlip < mine_chance_for_coin*100)
				{
					//coins
					const amount = (randomIntFromInterval(mine_coin_gain_min*100,mine_coin_gain_max*100))/100; //*100 becuase they're floats then /100 to make them decimals again.
					await queryPromise(`UPDATE user_currencies SET coins=coins + ${amount} WHERE user_id=${msg.author.id};`);
					msg.channel.send(`You have sucessfully mined and received ${amount} coins!`);
				}
				else
				{
					//Check for chance of gems.
					const gemChanceFlip = randomIntFromInterval(0,10000);
					//Create a sum of all chances (*100)
					var chanceSum = mine_rare_drops.reduce((a,b) => a + (b.drop_chance*100), 0)
					for (var drop of mine_rare_drops.reverse())
					{
						if (gemChanceFlip < chanceSum)
						{
							await queryPromise(`UPDATE user_currencies SET ${drop.database_name}=${drop.database_name} +1 WHERE user_id=${msg.author.id};`)
							msg.channel.send(`You have sucessfully mined and received a rare drop: ${currency_display_names.find(x => x.database_name == drop.database_name)!.display_name}!`);
							return;
						}
						chanceSum -= (drop.drop_chance*100)
					}
					
					//ore
					const amount = randomIntFromInterval(mine_ore_gain_min,mine_ore_gain_max);
					await queryPromise(`UPDATE user_currencies SET iron_ore=iron_ore + ${amount} WHERE user_id=${msg.author.id};`);
					msg.channel.send(`You have sucessfully mined and received ${amount} iron ore!`);
				}
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send("An error occured: \n" + err);
			}
		},
	},
	{
		name: 'cooldown',
		aliases: ['cd'],
		description: 'Check your cooldowns',
		usage: `${prefix}cooldown`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				const userCountResult = (await queryPromise(`SELECT COUNT(*) FROM users WHERE user_id=${msg.author.id}`))[0]
				const userCount = userCountResult[Object.keys(userCountResult)[0]];
				if (userCount == 0) throw "You must be registered to use this command!";

				var gather_command_cooldown = 0;
				
				//Check for cooldown.
				if (gather_commands_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					
					if (difference < command_cooldown) gather_command_cooldown = command_cooldown - difference;
				}


				//create embed
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`${msg.author.username}'s cooldowns`)
				.addField("✨ Progress",
				`${gather_command_cooldown == 0 ? `✅ ~~~ mine/chop/harvest/fish`:`❌ ~~~ mine/chop/harvest/fish **(${Math.round(gather_command_cooldown)}s)**`}`)
				.setThumbnail(msg.author.avatarURL)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				msg.channel.send(embed);

			}
			catch(err)
			{
				console.log(err);
				msg.channel.send("An error occured: \n" + err);
			}
		},
	},
	{
		name: 'ready',
		aliases: ['rd'],
		description: 'Check what cooldowns are ready.',
		usage: `${prefix}ready`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				const userCountResult = (await queryPromise(`SELECT COUNT(*) FROM users WHERE user_id=${msg.author.id}`))[0]
				const userCount = userCountResult[Object.keys(userCountResult)[0]];
				if (userCount == 0) throw "You must be registered to use this command!";
				
				var readyString = "";

				//Check for cooldown.
				if (gather_commands_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference >= command_cooldown) readyString+= "✅ ~~~ mine/chop/harvest/fish\n"

				}
				else
				{
					readyString+= "✅ ~~~ mine/chop/harvest/fish\n"
				}
				if (readyString == "") {msg.channel.send("You have no ready commands!"); return}

				//create embed
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`${msg.author.username}'s ready commands.`)
				.addField("✨ Progress",readyString)
				.setThumbnail(msg.author.avatarURL)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				msg.channel.send(embed);

			}
			catch(err)
			{
				console.log(err);
				msg.channel.send("An error occured: \n" + err);
			}
		},
		
	},
	{
		name: 'help',
		aliases: ['commands'],
		description: 'List help for all commands.',
		usage: `${prefix}help`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				const commands = client.commands.array();
				var commandStrings: string[] = [];
				var commandString = "";
				for (var command of commands)
				{
					const aliases = command.aliases.map((el:string) => "`"+el+"`");
					const stringToAdd = 
					`➥ **Command: _${command.name}_**\n`+
					`__Description:__ ${command.description}\n`+
					`__Usage:__ \`${command.usage}\n\``+
					`__Aliases:__ ${aliases.length == 0 ? "None" : aliases.join("/")}\n\n`

					if (commandString.length + stringToAdd.length >= 1024) {commandStrings.push(commandString); commandString = "";}
					commandString += stringToAdd;
				}
				if (commandString.length > 0 ) commandStrings.push(commandString);
				

				//create embed
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`${client.c.user.username} -- Help`)
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				
				var first = true;
				for (var string of commandStrings)
				{
					if (first) {embed.addField("📰Commands:",string); first = false;}
					else embed.addField(" ឵឵",string);
				}

				msg.channel.send(embed);
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send("An error occured: \n" + err);
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