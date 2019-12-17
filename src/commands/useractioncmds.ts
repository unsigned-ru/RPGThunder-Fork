import { client, con, explore_command_cooldown } from "../main";
import cf from "../config.json"
import Discord from "discord.js"
import { isRegistered, queryPromise, createRegisterEmbed, capitalizeFirstLetter, getItemData, calculateReqExp, getCurrencyDisplayName, getCurrencyIcon, getMaterialDisplayName, getMaterialIcon, getEquipmentSlotDisplayName } from "../utils";
import { classes, equipment_slots, item_types, enemies, enemies_item_drop_data, enemies_currency_drop_data, item_qualities, enemies_material_drop_data, zones } from "../staticdata";
import { consumablesModule, UserData, userDataModules, basicModule, equipmentModule, statsModule, inventoryModule } from "../classes/userdata";
import { Enemy } from "../classes/enemy";
import { _item } from "../interfaces";

export const commands = 
[
	{
		name: 'equip',
		aliases: [],
		description: 'Equips an item or a set of items from your inventory.',
		usage: `${cf.prefix}equip [itemID1] [itemID2] ...`,
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
				if (!await isRegistered(msg.author.id)) throw "You must be registered to equip an item."
				
				//Get the users class
				const [basicMod,inventoryMod,equipmentMod] = <[basicModule,inventoryModule,equipmentModule]> await new UserData(msg.author.id,[userDataModules.basic,userDataModules.inventory,userDataModules.equipment]).init();
				
				//Iterate over each item_id
				for (var item_id of item_ids)
				{
					//Check if user has the item in inventory.
					const itemToEquip = inventoryMod.inventory.get(item_id);
					if (!itemToEquip) throw "You do not own an item with the id: "+item_id
				
					const slot = equipment_slots.find(slot => slot.id == itemToEquip.item.slot)!;

					//check if the user has already equipped an item of that slot
					if (already_equipped_slots.includes(itemToEquip.item.slot)) { throw "You have already equipped an item in the slot: "+ slot.display_name}
					
					console.log(itemToEquip);
					//check if the users level is high enough
					if (itemToEquip.item.level_req > basicMod.level!) throw "You are not high enough level to equip item with id: "+item_id

					//check if the user is allowed to wear this type.
					if (!basicMod.class!.allowed_item_types.split(",").includes(itemToEquip.item.type.toString())) throw `You cannot equip item with \`id: ${item_id}\` because your class is not allowed to equip the type: \`${item_types.get(itemToEquip.item!.type)!.name}\``
					await UserData.equipItemFromInventory(msg.author.id,equipmentMod,inventoryMod,slot.database_name,itemToEquip.item);
					//add the equipped type to already_equipped_slots.
					already_equipped_slots.push(itemToEquip.item.slot);
					sucess_output += `You have sucessfully equipped: ${itemToEquip.item.icon_name} ${itemToEquip.item.name} in the slot: ${slot.display_name}!\n`
				}
				await equipmentMod.update(msg.author.id);
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
		name: 'consume',
		aliases: ['devour'],
		description: 'Consume a consumable',
		usage: `${cf.prefix}consume [ID]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to view your inventory.";

				//check args
				if (!parseInt(args[0])) throw "Please enter the id of the consumable you wish to consume.\nUsage: `"+this.usage+"`";

				const [consumablesMod] =  <[consumablesModule]> await new UserData(msg.author.id,[userDataModules.consumables]).init();

				//check if user owns the consumable
				const cons = consumablesMod.consumables.get(parseInt(args[0]))
				if(!cons || !cons.cons) throw "You do not own a consumable with that id."; 
				
				//update our stats
				const [basicMod, equipmentMod, statMod] = <[basicModule,equipmentModule,statsModule]> await new UserData(msg.author.id,[userDataModules.basic,userDataModules.equipment,userDataModules.stats]).init();
				UserData.heal(basicMod,statMod,cons.cons.hp);
				basicMod.update(msg.author.id);

				//remove from user inventory
				UserData.removeConsumable(msg.author.id,consumablesMod,cons.cons);

				msg.channel.send(`You have sucessfully consumed ${cons.cons.icon_name} ${cons.cons.name}!`);
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'explore',
		aliases: ['adventure'],
		description: 'Explore your zone! Be careful, you might end up fighting eou might end up fighting enemies!',
		usage: `${cf.prefix}explore`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to explore.";

				//Check for cooldown.
				if (explore_command_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - explore_command_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference < cf.explore_cooldown) throw `Ho there!\nThat command is on cooldown for another ${Math.round(cf.explore_cooldown - difference)} seconds!`;
					explore_command_cooldown.find(x=> x.user_id == msg.author.id)!.date = new Date();
				}
				else
				{
					explore_command_cooldown.push({user_id: msg.author.id, date: new Date()});
				}

				//get users data
				const [basicMod, equipMod,statsMod] = <[basicModule, equipmentModule, statsModule]> await new UserData(msg.author.id,[userDataModules.basic,userDataModules.equipment,userDataModules.stats]).init();

				if (basicMod.current_hp! <= statsMod.stats.get("max_hp")! / 100 * 10) throw "Your health is too low to adventure!";
				const previousHp = basicMod.current_hp!;

				//Find a enemy from the static loaded data.
				const enemyData = enemies.filter(x => x.encounter_zones.split(',').find(x => parseInt(x) == basicMod.zone!) != undefined && x.min_encounter_level <= basicMod!.level!).random();
				const item_drops = enemies_item_drop_data.filter(x => x.enemy_id == enemyData.id).array();
				const currency_drops = enemies_currency_drop_data.filter(x => x.enemy_id == enemyData.id).array();
				const material_drops = enemies_material_drop_data.filter(x => x.enemy_id == enemyData.id).array();
				const enemy = new Enemy(enemyData,currency_drops,item_drops,material_drops,basicMod.level!);

				//fight it.
				var result;
				while(true){
					result = enemy.fight(basicMod,statsMod);
					if (result != "inProgress") break;
				}

				switch(result)
				{
					//Todo: make inserts more performant
					case "won":
						var hasLeveled = await UserData.grantExp(basicMod,equipMod,statsMod,enemy.exp);
						var currencyQueryString = ""
						var rewardEmbedString = "";
						for (var currencyDrop of enemy.currency_drops)
						{
							currencyQueryString += `${currencyDrop.currency_name} = ${currencyDrop.currency_name} + ${currencyDrop.amount.toFixed(0)},`;
							rewardEmbedString += `${getCurrencyIcon(currencyDrop.currency_name)} ${getCurrencyDisplayName(currencyDrop.currency_name)} ${currencyDrop.amount.toFixed(0)}\n`
						}
						if (enemy.currency_drops.length > 0) queryPromise("UPDATE user_currencies SET "+ currencyQueryString.slice(0,-1)+" WHERE user_id="+msg.author.id);
						const itemDropsItemData = await getItemData(enemy.item_drops) as _item[];
						for (var itemDrop of enemy.item_drops)
						{
							queryPromise(`INSERT INTO user_inventory (user_id,item) VALUES (${msg.author.id}, ${itemDrop})`);
							const itemDropData = itemDropsItemData.find(x=> x.id == itemDrop)!
							rewardEmbedString += `**${itemDrop}** - ${itemDropData.icon_name} ${itemDropData.name} [${item_qualities.find(x => x.id == itemDropData.quality)!.name} ${getEquipmentSlotDisplayName(itemDropData.slot)}]\n`
						}
						var materialQueryString = ""
						for (var materialDrop of enemy.material_drops)
						{
							materialQueryString += `${materialDrop.material_name} = ${materialDrop.material_name} + ${materialDrop.amount.toFixed(0)},`;
							rewardEmbedString += `${getMaterialIcon(materialDrop.material_name)} ${getMaterialDisplayName(materialDrop.material_name)} ${materialDrop.amount.toFixed()}\n`
						}
						if (enemy.material_drops.length >0) queryPromise("UPDATE user_materials SET "+ materialQueryString.slice(0,-1)+" WHERE user_id="+msg.author.id);
						

						basicMod.update(msg.author.id);

						//Construct a message
						const winEmbed = new Discord.RichEmbed()
						.setColor('#00ff7b') //green
						.setTitle(`Exploration Success!`)
						.setDescription(

						`**${msg.author.username}** explored **${zones.get(basicMod.zone!)!.name}** and **killed a level ${enemy.level} ${enemy.name}**\n`+
						`You have **lost ${(previousHp - basicMod.current_hp!) >= 0 ? (previousHp - basicMod.current_hp!).toFixed(0) : 0} HP** and have **earned ${enemy.exp} exp!**\n`+
						`Your **remaining hp** is **${basicMod.current_hp!.toFixed(0)}/${statsMod.stats.get("max_hp")}**\n`)
						.addField("**Rewards:**", rewardEmbedString.length == 0 ? "None" : rewardEmbedString)
						.setTimestamp()
						.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

						var extraInfo = "";
						if (hasLeveled) extraInfo += `${msg.author.username} has reached level ${basicMod.level}. HP was regenerated.`

						if (extraInfo.length != 0) winEmbed.addField("**Extra Info:**", extraInfo)

						msg.channel.send(winEmbed);
						break;

					case "lost":
						const lossEmbed = new Discord.RichEmbed()
						.setColor('#ff0000') //red
						.setTitle(`Exploration Failed`)
						.setDescription(
						`**${msg.author.username}** explored **${zones.get(basicMod.zone!)!.name}** and got killed by **a level ${enemy.level} ${enemy.name}**\n`+
						`**YOU LOST 1 LEVEL AS DEATH PENALTY**\n
						Your health has been restored.`)
						.setTimestamp()
						.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
						msg.channel.send(lossEmbed);
						if (basicMod.level! > 1) 
						{
							basicMod.level! -= 1;
							basicMod.exp! = (calculateReqExp(basicMod.level!-1) / 100 * basicMod.exp! / calculateReqExp(basicMod.level!)*100);
							await statsMod.init(basicMod, equipMod);
							basicMod.current_hp = statsMod.stats.get("max_hp");

							basicMod.update(msg.author.id);
						}						
						break;
				}
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
		
	},
	{
		name: 'register',
		aliases: [],
		description: 'Registers a user!',
		usage: `${cf.prefix}register [class]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (msg.channel.type == "dm") throw "This command can only be executed in a server.";

				if (await isRegistered(msg.author.id)) throw "You have already registered.";

				if (args.length == 0) 
				{
					const embed = await createRegisterEmbed(msg.member);
					msg.author.send(embed);
					return;
				}

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
				`INSERT INTO user_currencies(user_id,coins) VALUES ('${msg.author.id}',50);`+
				//user_consumables default 2hp pots
				`INSERT INTO user_consumables(user_id,consumable_id) VALUES ('${msg.author.id}',1);`+
				`INSERT INTO user_consumables(user_id,consumable_id) VALUES ('${msg.author.id}',1);`+
				//userMats creation
				`INSERT INTO user_materials(user_id) VALUES ('${msg.author.id}');`

				await queryPromise(sql);

				msg.channel.send(`You have sucessfully registered as an ${capitalizeFirstLetter(args[0].toLowerCase())}`);
			}
			catch(err)
			{
				console.log(err);
				msg.reply(err);
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