import { client, con, explore_command_cooldown, zoneBossSessions, rest_command_cooldown, zoneBoss_command_cooldown } from "../main";
import cf from "../config.json"
import Discord, { User } from "discord.js"
import { isRegistered, queryPromise, createRegisterEmbed, capitalizeFirstLetter, getItemData, calculateReqExp, getCurrencyDisplayName, getCurrencyIcon, getMaterialDisplayName, getMaterialIcon, getEquipmentSlotDisplayName, editCollectionNumberValue, randomIntFromInterval } from "../utils";
import { classes, equipment_slots, item_types, enemies, enemies_item_drop_data, enemies_currency_drop_data, item_qualities, enemies_material_drop_data, zones, consumables, bosses, bosses_currency_drop_data, bosses_item_drop_data, bosses_material_drop_data } from "../staticdata";
import { consumablesModule, UserData, userDataModules, basicModule, equipmentModule, statsModule, inventoryModule, abilityModule, currencyModule, materialsModule } from "../classes/userdata";
import { Enemy } from "../classes/enemy";
import { _item, _consumable } from "../interfaces";
import { ZoneBossSession } from "../classes/zoneBossSession";
import { Boss } from "../classes/boss";

export const commands = 
[
	{
		name: 'equip',
		category: "items",
		aliases: [],
		description: 'Equips an item or a set of items from your inventory.',
		usage: `[prefix]equip [itemID1/ItemName1] [itemID2/ItemName2] ...`,
		async execute(msg: Discord.Message, args: string[])
		{
			var sucess_output :string = "";
			try
			{
				//Turn args into numbers and add them to array
				var already_equipped_slots :number[] = []
				var item_ids :number[] = [];

				//check if there are args
				if (args.length == 0) {throw "Please enter the ids or names of the items you wish to equip."}

				for (let arg of args)
				{
					var id = parseInt(arg);
					if (id)
					{
						item_ids.push(id);
					}
				}
				//remove resolved ids from args
				args.map((x) => 
				{
					if (item_ids.includes(parseInt(x))) args.splice(args.indexOf(x)); 
				})

				//Get the itemnames out of the args
				const itemNames = args.join(" ").toLowerCase().split(',').map(x => x.trim());

				
				//Check if the user is registered.
				if (!await isRegistered(msg.author.id)) throw "You must be registered to equip an item."
				
				//Get the users class
				const [basicMod,inventoryMod,equipmentMod] = <[basicModule,inventoryModule,equipmentModule]> await new UserData(msg.author.id,[userDataModules.basic,userDataModules.inventory,userDataModules.equipment]).init();
				if (inventoryMod.isEmpty) throw "Your inventory is empty, you cannot equip any items."
				
				//convert the Itemnames to id's
				console.log(itemNames);
				for (let itemName of itemNames)
				{
					if (itemName.length == 0) continue;
					const item = inventoryMod.inventory.find(x => x.item.name.toLowerCase() == itemName)
					if (item) item_ids.push(item.item.id);
					else throw "You do not own an item with the name: "+ itemName;
				}

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
					if (itemToEquip.item.level_req > basicMod.level!) throw `You are not high enough level to equip item ${itemToEquip.item.id} - ${itemToEquip.item.icon_name} ${itemToEquip.item.name}`;

					//check if the user is allowed to wear this type.
					if (!basicMod.class!.allowed_item_types.split(",").includes(itemToEquip.item.type.toString())) throw `You cannot equip item __${itemToEquip.item.id} - ${itemToEquip.item.icon_name} ${itemToEquip.item.name}__ because your class is not allowed to equip the type: \`${item_types.get(itemToEquip.item!.type)!.name}\``
					await UserData.equipItemFromInventory(msg.author.id,equipmentMod,inventoryMod,slot.database_name,itemToEquip.item);
					//add the equipped type to already_equipped_slots.
					already_equipped_slots.push(itemToEquip.item.slot);
					sucess_output += `You have sucessfully equipped: __${itemToEquip.item.id} - ${itemToEquip.item.icon_name} ${itemToEquip.item.name}__ in the slot: ${slot.display_name}!\n`
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
		category: "items",
		aliases: ['csm'],
		description: 'Consume a consumable',
		usage: `[prefix]consume [consumableID/consumableName]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command.";

				//check args
				if (args.length == 0) throw "Please enter the id of the consumable you wish to consume.\nUsage: `"+this.usage+"`";

				const [consumablesMod] =  <[consumablesModule]> await new UserData(msg.author.id,[userDataModules.consumables]).init();

				
				var cons = parseInt(args[0]) ? consumablesMod.consumables.get(parseInt(args[0])) : consumablesMod.consumables.find(x => x.cons.name.toLowerCase() == args.join(" ").trim().toLowerCase());

				//check if user owns the consumable
				if(!cons || !cons.cons) throw "You do not own the consumable: "+ args[0]; 
				
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
		name: 'heal',
		category: "items",
		aliases: [],
		description: 'Consume your smallest potions untill you reach full health.',
		usage: `[prefix]heal`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command.";

				const [consumablesMod, basicMod, equipmentMod, statMod] = <[consumablesModule,basicModule,equipmentModule,statsModule]> await new UserData(msg.author.id,[userDataModules.consumables,userDataModules.basic,userDataModules.equipment,userDataModules.stats]).init();
				
				if (consumablesMod.isEmpty) throw "You do not own any potions!";

				let consumedAmounts: Discord.Collection<number,number> = new Discord.Collection();

				if (basicMod.current_hp! == statMod.stats.get("max_hp")!) throw "You are already full health!"

				while (basicMod.current_hp! < statMod.stats.get("max_hp")!)
				{
					//get smallest consumable
					const cons = consumablesMod.consumables.get(1);
					//check if undefined or null
					if (!cons) 
					{
						let csmedString = "";
						for (let ca of consumedAmounts) csmedString += `${consumables.get(ca[0])!.icon_name} ${consumables.get(ca[0])!.name} x${ca[1]}\n`
						msg.channel.send(`You have run out of potions, your current health is ${basicMod.current_hp}/${statMod.stats.get("max_hp")}\nYou have consumed:\n${csmedString}`);
						break;
					}
					
					//Heal us up and remove consumable
					UserData.heal(basicMod,statMod,cons!.cons.hp);
					UserData.removeConsumable(msg.author.id,consumablesMod,cons!.cons);

					//Add to consumedAmounts
					if (consumedAmounts.has(cons!.cons.id)) editCollectionNumberValue(consumedAmounts,cons!.cons.id,1);
					else consumedAmounts.set(cons!.cons.id,1);
				}
				//update the health
				basicMod.update(msg.author.id);
				
				let csmedString = "";
				for (let ca of consumedAmounts) csmedString += `${consumables.get(ca[0])!.icon_name} ${consumables.get(ca[0])!.name} x${ca[1]}\n`
				msg.channel.send(`Your health has been restored to full. You have consumed:\n${csmedString}`);
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'rest',
		category: "",
		aliases: [],
		description: 'Rest for a night, restore you health daily.',
		usage: `[prefix]rest`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command.";

				const [basicMod, equipmentMod, statMod] = <[basicModule,equipmentModule,statsModule]> await new UserData(msg.author.id,[userDataModules.basic,userDataModules.equipment,userDataModules.stats]).init();

				if (basicMod.current_hp! == statMod.stats.get("max_hp")!) throw "You are already full health!"

				//Check for cooldown.
				if (rest_command_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - rest_command_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference < cf.rest_cooldown) throw `Ho there!\nThat command is on cooldown for another ${Math.round(cf.rest_cooldown - difference)} seconds!`;
					rest_command_cooldown.find(x=> x.user_id == msg.author.id)!.date = new Date();
				}
				else
				{
					rest_command_cooldown.push({user_id: msg.author.id, date: new Date()});
				}

				UserData.resetHP(basicMod,statMod);
				basicMod.update(msg.author.id);

				msg.channel.send(`You have rested and your health has been fully restored!`);
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
		category: "fighting",
		aliases: ['adventure'],
		description: 'Explore your zone! Be careful, you might end up fighting eou might end up fighting enemies!',
		usage: `[prefix]explore`,
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

				//TODO: when horses are added let the horse stop you from marching to your death
				// if (basicMod.current_hp! <= statsMod.stats.get("max_hp")! / 100 * 10) throw "Your health is too low to adventure!"
				
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

						//Construct a message
						const winEmbed = new Discord.RichEmbed()
						.setColor('#00ff7b') //green
						.setTitle(`⚔️ Exploration Success! ✅`)
						.setDescription(

						`**${msg.author.username}** explored **${zones.get(basicMod.zone!)!.name}** and **killed a level ${enemy.level} ${enemy.name}**\n`+
						`You have **lost ${(previousHp - basicMod.current_hp!) >= 0 ? (previousHp - basicMod.current_hp!).toFixed(0) : 0} HP** and have **earned ${enemy.exp} exp!**\n`+
						`Your **remaining hp** is **${basicMod.current_hp!.toFixed(0)}/${statsMod.stats.get("max_hp")}**\n`)
						.addField("**Rewards:**", rewardEmbedString.length == 0 ? "None" : rewardEmbedString)
						.setTimestamp()
						.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

						var extraInfo = "";
						if (hasLeveled) extraInfo += `${msg.author.username} has reached level ${basicMod.level}. HP was regenerated.`
						if (!basicMod.foundBosses.includes(zones.get(basicMod.zone!)!.boss_id))
						{
							if (randomIntFromInterval(0,100) <= 2) 
							{
								basicMod.foundBosses.push(zones.get(basicMod.zone!)!.boss_id);
								extraInfo += `You have found the location of the boss! You can now fight it!\n`;
							}
						}
						if (extraInfo.length != 0) winEmbed.addField("**Extra Info:**", extraInfo)
						basicMod.update(msg.author.id);
						msg.channel.send(winEmbed);
						break;

					case "lost":
						const lossEmbed = new Discord.RichEmbed()
						.setColor('#ff0000') //red
						.setTitle(`⚔️ Exploration Failed ❌`)
						.setDescription(
						`**${msg.author.username}** explored **${zones.get(basicMod.zone!)!.name}** and got killed by **a level ${enemy.level} ${enemy.name}**\n`+
						`**YOU LOST 1 LEVEL AS DEATH PENALTY**\n`+
						`Your health has been restored.`)
						.setTimestamp()
						.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
						msg.channel.send(lossEmbed);
						UserData.levelDeathPenalty(basicMod);
						await statsMod.init(basicMod, equipMod);		
						UserData.resetHP(basicMod,statsMod);
						basicMod.update(msg.author.id);
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
		name: 'boss',
		category: "fighting",
		aliases: [],
		description: 'Fight your the boss of your current zone.',
		usage: `[prefix]boss`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				//check if is in guild.
				if (msg.channel.type == "dm") throw "You can only initiate a session in a discord server.";

				if (!await isRegistered(msg.author.id)) throw "You must be registered use this command.";

				const [basicMod,consumablesMod,currencyMod,equipmentMod,inventoryMod,materialMod,statsMod,abilityMod] = <[basicModule,consumablesModule,currencyModule,equipmentModule,inventoryModule,materialsModule,statsModule,abilityModule]> await new UserData(msg.author.id, [userDataModules.basic,userDataModules.consumables,userDataModules.currencies,userDataModules.equipment,userDataModules.inventory,userDataModules.materials,userDataModules.stats,userDataModules.abilities]).init();

				var zone = zones.get(basicMod.zone!)!;
				
				//Check if the zone has a boss
				if (!bosses.has(zone.boss_id)) throw "This zone does not have a boss (yet).";

				//check if we have found the boss yet.
				if (!basicMod.foundBosses.includes(bosses.get(zone.boss_id)!.id)) throw "You have not found this zone's boss yet. Explore some more!";

				//check for an active session.
				if (zoneBossSessions.find(x => x.user.id == msg.author.id)) throw "You still have an open session please end your previous session!";
		
				//Check for cooldown.
				if (zoneBoss_command_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - zoneBoss_command_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference < cf.zoneBoss_cooldown) throw `Ho there!\nThat command is on cooldown for another ${Math.round(cf.zoneBoss_cooldown - difference)} seconds!`;
					zoneBoss_command_cooldown.find(x=> x.user_id == msg.author.id)!.date = new Date();
				}
				else
				{
					zoneBoss_command_cooldown.push({user_id: msg.author.id, date: new Date()});
				}

				//create an instance of the boss class.
				var bossdata = bosses.get(zone.boss_id)!;
				var currency_drops = bosses_currency_drop_data.filter(x => x.boss_id == bossdata.id).array();
				var item_drops = bosses_item_drop_data.filter(x => x.boss_id == bossdata.id).array();
				var material_drops = bosses_material_drop_data.filter(x => x.boss_id == bossdata.id).array();
				const boss = new Boss(bossdata,currency_drops,item_drops,material_drops);

				const bossSession = new ZoneBossSession(msg.channel as Discord.TextChannel,msg.author,boss,zone.name,basicMod,equipmentMod, statsMod, abilityMod,currencyMod,materialMod,inventoryMod);
				zoneBossSessions.push(bossSession);
				await bossSession.initAsync();
			
				await msg.channel.send(`${msg.author.username} has started fighting the boss **${boss.name}** of zone **${zone.name}**\nClick the link below to join or watch!`);
				msg.channel.send(bossSession.invite!.url);


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
		usage: `[prefix]register [class]`,
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

				var sql = 
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
				`INSERT INTO user_consumables(user_id,consumable_id) VALUES ('${msg.author.id}',1), ('${msg.author.id}',1), ('${msg.author.id}',1), ('${msg.author.id}',1), ('${msg.author.id}',1);`+
				//userMats creation
				`INSERT INTO user_materials(user_id) VALUES ('${msg.author.id}');`;

				switch(selectedClass.name.toLowerCase())
				{
					case "mage":
						sql += `INSERT INTO user_spellbook(user_id,ability_id) VALUES (${msg.author.id},1), (${msg.author.id},2);`
						sql += `INSERT INTO \`user_abilities\` (\`user_id\`, \`1\`, \`2\`) VALUES ('${msg.author.id}', '1', '2');`
						break;
					case "warrior":
						sql += `INSERT INTO user_spellbook(user_id,ability_id) VALUES (${msg.author.id},1), (${msg.author.id},3);`
						sql += `INSERT INTO \`user_abilities\` (\`user_id\`, \`1\`, \`2\`) VALUES ('${msg.author.id}', '1', '3');`
						break;
					case "archer":
						sql += `INSERT INTO user_spellbook(user_id,ability_id) VALUES (${msg.author.id},1), (${msg.author.id},4);`
						sql += `INSERT INTO \`user_abilities\` (\`user_id\`, \`1\`, \`2\`) VALUES ('${msg.author.id}', '1', '4');`
						break;
				}

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