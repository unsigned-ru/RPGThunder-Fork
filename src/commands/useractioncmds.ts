import { client, con, explore_command_cooldown, zoneBossSessions, rest_command_cooldown, zoneBoss_command_cooldown, traveling } from "../main";
import cf from "../config.json"
import Discord from "discord.js"
import { isRegistered, queryPromise, getItemData, getCurrencyDisplayName, getCurrencyIcon, getMaterialDisplayName, getMaterialIcon, getEquipmentSlotDisplayName, editCollectionNumberValue, randomIntFromInterval, setCooldownForCollection, getCooldownForCollection, formatTime } from "../utils";
import { classes, equipment_slots, item_types, enemies, enemies_item_drop_data, enemies_currency_drop_data, item_qualities, enemies_material_drop_data, zones, consumables, bosses, bosses_currency_drop_data, bosses_item_drop_data, bosses_material_drop_data, currencies, materials } from "../staticdata";
import { consumablesModule, UserData, userDataModules, basicModule, equipmentModule, statsModule, inventoryModule, abilityModule, currencyModule, materialsModule } from "../classes/userdata";
import { Enemy } from "../classes/enemy";
import { _item, _consumable, _zone } from "../interfaces";
import { ZoneBossSession } from "../classes/zoneBossSession";
import { Boss } from "../classes/boss";

export const commands = 
[
	{
		name: 'equip',
		category: "items",
		aliases: [],
		description: 'Equips an item or a set of items from your inventory.',
		usage: `[prefix]equip [invSlot1] [invSlot2] [invSlot3]...`,
		async execute(msg: Discord.Message, args: string[])
		{
			var sucess_output :string = "";
			const [basicMod,inventoryMod,equipmentMod] = <[basicModule,inventoryModule,equipmentModule]> await new UserData(msg.author.id,[userDataModules.basic,userDataModules.inventory,userDataModules.equipment]).init();

			try
			{

				//Turn args into numbers and add them to array
				var already_equipped_slots :number[] = []
				var slot_ids :number[] = [];

				//check if there are args
				if (args.length == 0) {throw "Please enter the inventory slots of the item you wish to equip."}

				for (let arg of args)
				{
					var id = parseInt(arg);
					if (id)
					{
						slot_ids.push(id);
					}
				}

				//Check if the user is registered.
				if (!await isRegistered(msg.author.id)) throw "You must be registered to equip an item."
				
				//Get the users class and data
				if (inventoryMod.isEmpty) throw "Your inventory is empty, you cannot equip any items."
							

				//Iterate over each invslot
				for (var slot_id of slot_ids)
				{
					//Check if user has the item in inventory.
					const invEntryToEquip = inventoryMod.inventory.get(slot_id);
					if (!invEntryToEquip) throw "You do not own an item in the inventory slot: "+slot_id
					const slot = equipment_slots.find(slot => slot.id == invEntryToEquip.item.slot)!;

					//check if the user has already equipped an item of that slot
					if (already_equipped_slots.includes(invEntryToEquip.item.slot)) { throw "You have already equipped an item in the slot: "+ slot.display_name}
					
					//check if the users level is high enough
					if (invEntryToEquip.item.level_req > basicMod.level!) throw `You are not high enough level to equip item ${invEntryToEquip.item.icon_name} ${invEntryToEquip.item.name} (requirement: ${invEntryToEquip.item.level_req})`;

					//check if the user is allowed to wear this type.
					if (!basicMod.class!.allowed_item_types.split(",").includes(invEntryToEquip.item.type.toString())) throw `You cannot equip item __ ${invEntryToEquip.item.icon_name} ${invEntryToEquip.item.name}__ because your class is not allowed to equip the type: \`${item_types.get(invEntryToEquip.item!.type)!.name}\``

					await UserData.equipItemFromInventory(msg.author.id,equipmentMod,inventoryMod,slot.database_name,invEntryToEquip.item,invEntryToEquip.bonus_atk,invEntryToEquip.bonus_def,invEntryToEquip.bonus_acc);
					//add the equipped type to already_equipped_slots.
					already_equipped_slots.push(invEntryToEquip.item.slot);
					sucess_output += `You have sucessfully equipped: __${invEntryToEquip.item.icon_name} ${invEntryToEquip.item.name}__ in the slot: ${slot.display_name}!\n`
				}
				await equipmentMod.update(msg.author.id);
				msg.channel.send(sucess_output);
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(sucess_output + err);
				await equipmentMod.update(msg.author.id);
			}
		}
	},
	{
		name: 'consume',
		category: "items",
		aliases: ['csm','eat','use'],
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
				var inputName = args.join(" ").trim().toLowerCase(); 
				var cons;
				if (parseInt(args[0]))
				{
					cons = consumablesMod.consumables.get(parseInt(args[0]))
					args.splice(0,1);
				}
				else cons = consumablesMod.consumables.find(x => x.cons.name.toLowerCase() == inputName);

				var amount = 1;
				if (parseInt(args[args.length-1])) amount = parseInt(args[args.length-1]);

				//check if user owns the consumable
				if(!cons || !cons.cons) throw `\`${msg.author.username}\` does not own the consumable: ${inputName}`
				if (cons.count < amount) throw `\`${msg.author.username}\` does not own enough of that consumable.`
				//update our stats
				const [basicMod,, statMod] = <[basicModule,equipmentModule,statsModule]> await new UserData(msg.author.id,[userDataModules.basic,userDataModules.equipment,userDataModules.stats]).init();
				UserData.heal(basicMod,statMod,cons.cons.hp * amount);
				basicMod.update(msg.author.id);

				//remove from user inventory
				for (let i = 0; i < amount; i++) UserData.removeConsumable(msg.author.id,consumablesMod,cons.cons);
				
				msg.channel.send(`\`${msg.author.username}\` has sucessfully consumed ${cons.cons.icon_name} ${cons.cons.name} x${amount}!`);
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
		async execute(msg: Discord.Message) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command.";

				const [consumablesMod, basicMod,, statMod] = <[consumablesModule,basicModule,equipmentModule,statsModule]> await new UserData(msg.author.id,[userDataModules.consumables,userDataModules.basic,userDataModules.equipment,userDataModules.stats]).init();
				
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
						//update the health
						basicMod.update(msg.author.id);
						return;
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
		category: "fighting",
		aliases: [],
		description: 'Rest for a night, restore your health daily.',
		usage: `[prefix]rest`,
		async execute(msg: Discord.Message) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command.";

				const [basicMod,, statMod] = <[basicModule,equipmentModule,statsModule]> await new UserData(msg.author.id,[userDataModules.basic,userDataModules.equipment,userDataModules.stats]).init();

				if (basicMod.current_hp! == statMod.stats.get("max_hp")!) throw "You are already full health!"

				//Check for cooldown.
				if (rest_command_cooldown.has(msg.author.id)) throw `Ho there!\nThat command is on cooldown for another ${formatTime(getCooldownForCollection(msg.author.id,rest_command_cooldown))}!`;

				setCooldownForCollection(msg.author.id, cf.rest_cooldown, rest_command_cooldown);

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
		name: 'daily',
		category: "statistics",
		aliases: [],
		execute_while_travelling: true,
		description: 'Claim a reward daily.',
		usage: `[prefix]daily`,
		async execute(msg: Discord.Message) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command.";

				const [basicMod] = <[basicModule]> await new UserData(msg.author.id,[userDataModules.basic]).init();


				if (!basicMod.daily_isReady) 
				{
					var d = new Date((await queryPromise(`SELECT EXECUTE_AT FROM INFORMATION_SCHEMA.EVENTS WHERE EVENT_NAME = '${msg.author.id}_daily'`))[0].EXECUTE_AT);
					throw `That command is on cooldown for another ${(formatTime(Math.abs(d.getTime() - (new Date().getTime()))))}`;
				}

				const [currencyMod, materialMod] = <[currencyModule,materialsModule]> await new UserData(msg.author.id,[userDataModules.currencies,userDataModules.materials]).init();

				var embed = new Discord.RichEmbed()
				.setTitle(`Daily Reward -- ${msg.author.username}`)
				.setDescription(`You have claimed your daily reward!`)
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
				.setColor('#fcf403')

				var rewardString = "";
				//coins
				var coins = randomIntFromInterval(100,300);
				if (randomIntFromInterval(0,100) < 1) coins = 5000;
				editCollectionNumberValue(currencyMod.currencies,"coins",coins);
				rewardString += `${getCurrencyIcon("coins")} ${coins} ${getCurrencyDisplayName("coins")}\n`
				
				var material = materials.filter(x => x.id == 1 || x.id == 2 || x.id == 5 || x.id == 6 || x.id == 7 || x.id == 8 || x.id == 9 || x.id == 10).random();
				var materialAmount = randomIntFromInterval(1,10);
				editCollectionNumberValue(materialMod.materials, material.id, materialAmount);
				rewardString += `${material.icon_name} ${materialAmount} ${material.display_name}\n`

				var potionAmount = randomIntFromInterval(1,3);
				var cons = consumables.get(1)!;
				if (randomIntFromInterval(0,200) < 1) potionAmount = 20;
				UserData.addConsumable(msg.author.id,undefined,1,potionAmount);
				rewardString += `${cons.icon_name} ${potionAmount} ${cons.name}\n`

				if (randomIntFromInterval(0,100) < 1)
				{
					var rareMat = materials.filter(x => x.id == 3 || x.id == 4).random();
					var rareMatAmount = randomIntFromInterval(1,5);
					editCollectionNumberValue(materialMod.materials, rareMat.id, rareMatAmount);
					rewardString += `${rareMat.icon_name} ${rareMatAmount} ${rareMat.display_name}\n`
				}

				currencyMod.update(msg.author.id);
				materialMod.update(msg.author.id);
				
				embed.addField("Rewards:",rewardString)
				msg.channel.send(embed);

				await queryPromise(
				`CREATE EVENT ${msg.author.id}_daily
				ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 1 DAY
				ON COMPLETION NOT PRESERVE
				ENABLE
				DO UPDATE users SET daily_ready=1 WHERE user_id = ${msg.author.id};
				UPDATE users SET daily_ready=0 WHERE user_id = ${msg.author.id};`)
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'weekly',
		category: "statistics",
		aliases: [],
		execute_while_travelling: true,
		description: 'Claim a reward weekly.',
		usage: `[prefix]weekly`,
		async execute(msg: Discord.Message) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command.";

				const [basicMod] = <[basicModule]> await new UserData(msg.author.id,[userDataModules.basic]).init();


				if (!basicMod.weekly_isReady) 
				{
					var d = new Date((await queryPromise(`SELECT EXECUTE_AT FROM INFORMATION_SCHEMA.EVENTS WHERE EVENT_NAME = '${msg.author.id}_weekly'`))[0].EXECUTE_AT);
					throw `That command is on cooldown for another ${(formatTime(Math.abs(d.getTime() - (new Date().getTime()))))}`;
				}

				const [currencyMod, materialMod] = <[currencyModule,materialsModule]> await new UserData(msg.author.id,[userDataModules.currencies,userDataModules.materials]).init();

				var embed = new Discord.RichEmbed()
				.setTitle(`Weekly Reward -- ${msg.author.username}`)
				.setDescription(`You have claimed your weekly reward!`)
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
				.setColor('#fcf403')

				var rewardString = "";
				//coins
				var coins = randomIntFromInterval(500,1500);
				if (randomIntFromInterval(0,100) < 1) coins = 10000;
				editCollectionNumberValue(currencyMod.currencies,"coins",coins);
				rewardString += `${getCurrencyIcon("coins")} ${coins} ${getCurrencyDisplayName("coins")}\n`

				//valor
				var valor = randomIntFromInterval(1,5);
				if (randomIntFromInterval(0,100) < 1) valor = 20;
				editCollectionNumberValue(currencyMod.currencies,"valor",valor);
				rewardString += `${getCurrencyIcon("valor")} ${valor} ${getCurrencyDisplayName("valor")}\n`
				
				var material = materials.filter(x => x.id == 1 || x.id == 2 || x.id == 5 || x.id == 6 || x.id == 7 || x.id == 8 || x.id == 9 || x.id == 10).random();
				var materialAmount = randomIntFromInterval(5,20);
				editCollectionNumberValue(materialMod.materials, material.id, materialAmount);
				rewardString += `${material.icon_name} ${materialAmount} ${material.display_name}\n`

				var potionAmount = randomIntFromInterval(2,7);
				var cons = consumables.get(1)!;
				if (randomIntFromInterval(0,200) < 1) potionAmount = 25;
				UserData.addConsumable(msg.author.id,undefined,1,potionAmount);
				rewardString += `${cons.icon_name} ${potionAmount} ${cons.name}\n`

				if (randomIntFromInterval(0,100) < 2)
				{
					var rareMat = materials.filter(x => x.id == 3 || x.id == 4).random();
					var rareMatAmount = randomIntFromInterval(1,5);
					editCollectionNumberValue(materialMod.materials, rareMat.id, rareMatAmount);
					rewardString += `${rareMat.icon_name} ${rareMatAmount} ${rareMat.display_name}\n`
				}

				currencyMod.update(msg.author.id);
				materialMod.update(msg.author.id);
				
				embed.addField("Rewards:",rewardString)
				msg.channel.send(embed);

				await queryPromise(
				`CREATE EVENT ${msg.author.id}_weekly
				ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 1 WEEK
				ON COMPLETION NOT PRESERVE
				ENABLE
				DO UPDATE users SET weekly_ready=1 WHERE user_id = ${msg.author.id};
				UPDATE users SET weekly_ready=0 WHERE user_id = ${msg.author.id};`)
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'travel',
		category: "statistics",
		aliases: ['travelling'],
		description: 'Travel to another zone.',
		usage: `[prefix]travel [Zone]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				const [basicMod] = <[basicModule]> await new UserData(msg.author.id, [userDataModules.basic]).init();

				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command.";
				if (args.length == 0)
				{
					//show the unlocked zones.
					var zoneString = "";

					for (var uc of basicMod.unlockedZones)
					{
						let zone = zones.get(uc)!;
						zoneString += `**${zone.name}** | lvl: ${zone.level_suggestion}\n`;
					}

					var embed = new Discord.RichEmbed()
					.setTitle(`Travelling -- Unlocked zones: ${msg.author.username}`)
					.setDescription(`To travel you must enter what zone you'd like to travel to, here is a list of your unlocked zones.`)
					.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
					.setColor('#fcf403')

					zoneString.length > 0 ? embed.addField("Zones:", zoneString) : embed.addField("Zones:", "You have no unlocked zones");

					return msg.channel.send(embed);
				}

				var inputName = args.map(x => x.trim()).join(" ").toLowerCase();
				var zone = zones.find(x => x.name.toLowerCase() == inputName);

				if (!zone) throw `Could not find a zone with name: \`${inputName}\``;

				if (basicMod.zone == zone.id) throw `You are already in the zone: \`${zone.name}\``;

				if (!basicMod.unlockedZones.includes(zone.id)) throw `You have not unlocked the zone \`${zone.name}\` yet.`;

				var currentZone = zones.get(basicMod.zone!);

				var distance = Math.abs(currentZone!.x_loc - zone.x_loc) + Math.abs(currentZone!.y_loc - zone.y_loc);

				//Todo: add perks for travel time reduction here

				var travelTime = cf.travel_time_per_chunk * distance; //in seconds

				var embed = new Discord.RichEmbed()
				.setTitle(`Travel to ${zone.name} - ${msg.author.username}`)
				.setDescription(`The travel time will be **${travelTime}s**.\n*During this period you will not be able to use any other commands.*\n**Are you sure you would like to travel to ${zone.name}?**`)
				.setFooter("Yes / No", 'http://159.89.133.235/DiscordBotImgs/logo.png')
				.setColor('#fcf403')

				var confirmMessage = await msg.channel.send(embed) as Discord.Message;
				await confirmMessage.react("✅");
				await confirmMessage.react("❌");
				var rr = await confirmMessage.awaitReactions((m:Discord.MessageReaction) => m.users.has(msg.author.id),{time: 20000, max: 1});
				

				if (rr.first().emoji.name != '✅') return;

				//Add to traveling cds
				var d = new Date();
				d.setSeconds(d.getSeconds() + travelTime);
				traveling.set(msg.author.id,d);
				
				//Set timeout
				setTimeout((basicMod:basicModule, msg: Discord.Message, zone:_zone, traveling:any) => 
				{
					msg.channel.send(`\`${msg.author.username}\` has arrived at ${zone.name}`);
					basicMod.zone = zone.id;
					basicMod.update(msg.author.id);
					traveling.delete(msg.author.id);

				}, travelTime*1000, basicMod, msg, zone,  traveling)

				msg.channel.send("You have started travelling!");

			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'gift',
		category: "economy",
		aliases: [],
		description: 'Gift a player currency / items / materials / consumables',
		usage: `[prefix]gift [@User] [Name/invSlot] [Amount]`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use this command.";

				//Check for mentioned user
				if (!args[0]) throw "Please mention the user you wish to gift to!"
				var target = client.c.users.get(args[0].replace(/[\\<>@#&!]/g, ""))
				var userMentionString = args.splice(0,1);
				if (!target) throw "Could not find the user " + userMentionString;
				if (target.id == msg.author.id) throw "You cannot gift to yourself you dummie!";
				//check if mentioned user is registered:
				if (!await isRegistered(target.id)) throw "Cannot gift to a non registered user. Get them to register first!";

				//Start checking if the user owns the item.
				const [,consumablesMod,currencyMod,inventoryMod,materialMod] = <[basicModule,consumablesModule,currencyModule,inventoryModule,materialsModule]> await new UserData(msg.author.id, [userDataModules.basic,userDataModules.consumables,userDataModules.currencies,userDataModules.inventory,userDataModules.materials]).init();

				var slot_id = parseInt(args[0]);
				if (slot_id)
				{
					if (inventoryMod.inventory.has(slot_id))
					{
						var inventoryEntry = inventoryMod.inventory.get(slot_id)!;
						
						const [targetInventoryMod] = <[inventoryModule]> await new UserData(target.id, [userDataModules.inventory]).init();
						await UserData.addItemToInventory(target.id,targetInventoryMod, inventoryEntry.item.id, inventoryEntry.bonus_atk,inventoryEntry.bonus_def,inventoryEntry.bonus_acc);
						await UserData.removeItemFromInventory(msg.author.id,inventoryMod,inventoryMod.inventory.findKey(x => x == inventoryEntry));

						return await msg.channel.send(`You have sucessfully gifted \`${target.username}\` ${inventoryEntry.item.icon_name} ${inventoryEntry.item.name}`);
					}
					else throw `You have no item in inventory slot ${slot_id}!`;
				}

				var amount = 1;
				//Check for amount args
				if (parseInt(args[args.length-1])) 
				{
					amount = parseInt(args[args.length-1]);
					args.splice(args.length-1,1);
				}
				
				//Check if amount is bigger than 0
				if (amount <= 0) throw "The amount must be bigger than 0!";

				//Parse args to a string
				var name = args.map(x => x.trim()).join(" ").toLowerCase();
				if (name.length == 0) throw "Please enter the name of the currency / material / consumable or the inventory slot of the item you wish to gift."

				if (currencies.find(x => x.display_name.toLowerCase() == name))
				{
					var currencyData = currencies.find(x => x.display_name.toLowerCase() == name)!;
					var currAmount = currencyMod.currencies.get(currencyData.database_name)!;

					//Check if we have enough to gift
					if (amount > currAmount) throw "You do not own enough of that currency to send that.";

					const [targetCurrencyMod] = <[currencyModule]> await new UserData(target.id, [userDataModules.currencies]).init();
					editCollectionNumberValue(currencyMod.currencies, currencyData.database_name,-amount);
					editCollectionNumberValue(targetCurrencyMod.currencies, currencyData.database_name,+amount);

					currencyMod.update(msg.author.id);
					targetCurrencyMod.update(target.id);

					return await msg.channel.send(`You have sucessfully gifted \`${target.username}\` ${currencyData.icon_name} ${amount} ${currencyData.display_name}`);
				}

				if (materials.find(x => x.display_name.toLowerCase() == name))
				{
					var materialData = materials.find(x => x.display_name.toLowerCase() == name)!;
					var materialAmount = materialMod.materials.get(materialData.id)!;

					//Check if we have enough to gift
					if (amount > materialAmount) throw "You do not own enough of that material to send that.";

					const [targetMaterialMod] = <[materialsModule]> await new UserData(target.id, [userDataModules.materials]).init();
					editCollectionNumberValue(materialMod.materials, materialData.id,-amount);
					editCollectionNumberValue(targetMaterialMod.materials, materialData.id,+amount);

					materialMod.update(msg.author.id);
					targetMaterialMod.update(target.id);

					return await msg.channel.send(`You have sucessfully gifted \`${target.username}\` ${materialData.icon_name} ${amount} ${materialData.display_name}`);
				}

				var cons = consumablesMod.consumables.find(x => x.cons.name.toLowerCase() == name);
				if (cons)
				{
					const [targetConsumableMod] = <[consumablesModule]> await new UserData(target.id, [userDataModules.consumables]).init();
					
					//Check if we have enough to gift
					if (amount > cons.count) throw `You do not own enough ${cons.cons.icon_name} ${cons.cons.name}(s) to send that.`;

					await UserData.removeConsumable(msg.author.id,consumablesMod,cons.cons,amount);
					await UserData.addConsumable(target.id,targetConsumableMod,cons.cons.id,amount);

					return await msg.channel.send(`You have sucessfully gifted \`${target.username}\` ${cons.cons.icon_name} ${cons.cons.name} x${amount}`);
				}


				return await msg.channel.send(`An error happened with your command! Are you using it correctly?\nUsage:\`${this.usage}\``);
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
		async execute(msg: Discord.Message) 
		{
			try
			{
				if (!await isRegistered(msg.author.id)) throw "You must be registered to explore.";

				//Check for cooldown.
				if (explore_command_cooldown.has(msg.author.id))
				{
					throw `Ho there!\nThat command is on cooldown for another ${formatTime(getCooldownForCollection(msg.author.id,explore_command_cooldown))}!`;
				}

				//get users data
				const [basicMod, equipMod,statsMod] = <[basicModule, equipmentModule, statsModule]> await new UserData(msg.author.id,[userDataModules.basic,userDataModules.equipment,userDataModules.stats]).init();

				//TODO: when horses are added let the horse stop you from marching to your death
				// if (basicMod.current_hp! <= statsMod.stats.get("max_hp")! / 100 * 10) throw "Your health is too low to adventure!"
				
				const previousHp = basicMod.current_hp!;

				//Find a enemy from the static loaded data.
				const enemyData = enemies.filter(x => x.encounter_zones.split(',').find(x => parseInt(x) == basicMod.zone!) != undefined && x.min_encounter_level <= basicMod!.level!).random();
				if (!enemyData) throw "There are no enemies in this zone.";
				const item_drops = enemies_item_drop_data.filter(x => x.enemy_id == enemyData.id).array();
				const currency_drops = enemies_currency_drop_data.filter(x => x.enemy_id == enemyData.id).array();
				const material_drops = enemies_material_drop_data.filter(x => x.enemy_id == enemyData.id).array();
				const enemy = new Enemy(enemyData,currency_drops,item_drops,material_drops,basicMod.level!);

				setCooldownForCollection(msg.author.id, cf.explore_cooldown, explore_command_cooldown);

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
							rewardEmbedString += `${itemDropData.icon_name} ${itemDropData.name} [${item_qualities.find(x => x.id == itemDropData.quality)!.name} ${getEquipmentSlotDisplayName(itemDropData.slot)}]\n`
						}
						var materialQueryString = ""
						for (var materialDrop of enemy.material_drops)
						{
							materialQueryString += `${materials.get(materialDrop.material_id)!.database_name} = ${materials.get(materialDrop.material_id)!.database_name} + ${materialDrop.amount.toFixed(0)},`;
							rewardEmbedString += `${getMaterialIcon(materials.get(materialDrop.material_id)!.database_name)} ${getMaterialDisplayName(materials.get(materialDrop.material_id)!.database_name)} ${materialDrop.amount.toFixed()}\n`
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
						if (hasLeveled) extraInfo += `${msg.author.username} has reached level ${basicMod.level}. HP was regenerated.\n`
						if (!basicMod.foundBosses.includes(zones.get(basicMod.zone!)!.boss_id))
						{
							if (randomIntFromInterval(0,100) <= 2) 
							{
								basicMod.foundBosses.push(zones.get(basicMod.zone!)!.boss_id);
								extraInfo += `**💀You have found the location of the boss! You can now fight it!💀**\n`;
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
		async execute(msg: Discord.Message) 
		{
			try
			{
				//check if is in guild.
				if (msg.channel.type == "dm") throw "You can only initiate a session in a discord server.";

				if (!await isRegistered(msg.author.id)) throw "You must be registered use this command.";

				const [basicMod,,currencyMod,equipmentMod,inventoryMod,materialMod,statsMod,abilityMod] = <[basicModule,consumablesModule,currencyModule,equipmentModule,inventoryModule,materialsModule,statsModule,abilityModule]> await new UserData(msg.author.id, [userDataModules.basic,userDataModules.consumables,userDataModules.currencies,userDataModules.equipment,userDataModules.inventory,userDataModules.materials,userDataModules.stats,userDataModules.abilities]).init();

				var zone = zones.get(basicMod.zone!)!;
				
				//Check if the zone has a boss
				if (!bosses.has(zone.boss_id)) throw "This zone does not have a boss (yet).";

				//check if we have found the boss yet.
				if (!basicMod.foundBosses.includes(bosses.get(zone.boss_id)!.id)) throw "You have not found this zone's boss yet. Explore some more!";

				//check for an active session.
				if (zoneBossSessions.has(msg.author.id)) throw "You still have an open session please end your previous session!";
		
				//Check for cooldown.
				if (zoneBoss_command_cooldown.has(msg.author.id)) throw `Ho there!\nThat command is on cooldown for another ${formatTime(getCooldownForCollection(msg.author.id,zoneBoss_command_cooldown))}!`;

				//create an instance of the boss class.
				var bossdata = bosses.get(zone.boss_id)!;
				var currency_drops = bosses_currency_drop_data.filter(x => x.boss_id == bossdata.id).array();
				var item_drops = bosses_item_drop_data.filter(x => x.boss_id == bossdata.id).array();
				var material_drops = bosses_material_drop_data.filter(x => x.boss_id == bossdata.id).array();
				const boss = new Boss(bossdata,currency_drops,item_drops,material_drops);

				const bossSession = new ZoneBossSession(msg.channel as Discord.TextChannel,msg.author,boss,zone.name,basicMod,equipmentMod, statsMod, abilityMod,currencyMod,materialMod,inventoryMod);
				zoneBossSessions.set(msg.author.id,bossSession);
				await bossSession.initAsync();
			
				await msg.channel.send(`${msg.author.username} has started fighting the boss **${boss.name}** of zone **${zone.name}**\nClick the link below to join or watch!`);
				msg.channel.send(bossSession.invite!.url);

				//set the cooldown
				setCooldownForCollection(msg.author.id, cf.zoneBoss_cooldown, zoneBoss_command_cooldown);

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
		usage: `[prefix]register`,
		async execute(msg: Discord.Message) 
		{
			try
			{
				if (msg.channel.type == "dm") throw "This command can only be executed in a server.";

				if (await isRegistered(msg.author.id)) throw "You have already registered.";

				const embed = new Discord.RichEmbed()
				.setColor('#fcf403')
				.setTitle(`Welcome to RPG Thunder!`)
				.setDescription(`**To start off your adventure, you must pick a class! What class do you want to be?**`)
				.setThumbnail('http://159.89.133.235/DiscordBotImgs/logo.png')
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

				for (var c of classes) embed.addField(`**${c[1].icon_name} ${c[1].name}**`, c[1].description);

				msg.channel.send(embed);

				var rr = await msg.channel.awaitMessages((m:Discord.Message) => m.author.id == msg.author.id,{time: 100000, maxMatches: 1});

				const selectedClass = classes.find(element => rr.first().content.toLowerCase().includes(element.name.toLowerCase()));
				if (!selectedClass) throw "Did not find a class with that name. Please try again!";

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

				msg.channel.send(`You have sucessfully registered as an ${selectedClass.name}`);
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