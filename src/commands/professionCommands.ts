import Discord from "discord.js"
import { commands } from "../main";
import { DataManager } from "../classes/dataManager";
import { CC, randomIntFromInterval, clamp, getItemAndAmountFromArgs, constructWarningMessageForItem, awaitConfirmMessage, filterItemArray, sortItemArray, createCraftedEquipment } from "../utils";
import { _equipmentItem, _materialItem, _consumableItem, MaterialItem, EquipmentItem, ConsumableItem, _anyItem } from "../classes/items";
import { User } from "../classes/user";
import { _command } from "../interfaces";
import cf from "../config.json"

export const cmds: _command[] = 
[
	{
		name: 'recipes',
		category: CC.Professions,
		executeWhileTravelling: true,
		mustBeRegistered: true,
		aliases: ['recipes','crafting','rp'],
		description: 'View your professions recipes',
		usage: `[prefix]recipes [profession] [page] -[filter1] -[filter2]...`,
		execute(msg, args) 
		{	
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow

			let pages = []
			let recipeString = "";
			let maxItems = 4;
			let itemCounter = 0;
			let selectedPage = 1;

			if (args.length == 0) return msg.channel.send(`\`${msg.author.username}\`, please enter the name of the profession you wish to see the recipes of.\nUsage: \`${this.usage}\``)
			//check for what profession to show recipes of
			let profession = DataManager.professions.find(x => x.name.toLowerCase() == args[0].toLowerCase());
			if (!profession) return msg.channel.send(`\`${msg.author.username}\`, could not find a profession with name: \`${args[0]}\``);
			args.splice(0,1);
			
			if (profession.recipes.length == 0) return msg.channel.send(`\`${msg.author.username}\`, that profession has no recipes.`); 

			//get the professions items
			let recipeItems = profession.recipes.map(x => DataManager.getItem(x.item_id)!)
			
			//check for input of page to display
			if (!isNaN(+args[0])) {selectedPage = +args[0]; args.splice(0,1)}

			//check for input of -params
			for(let p of args.join(" ").split('-').slice(1).map(x => x.trim().split(" ")))
			{
				switch(p[0].toLowerCase())
				{
					case "maxitems":
						if (!isNaN(+p[1])) if (+p[1] < cf.inventory_maxItemsLimit && +p[1] > 0) maxItems = +p[1];
					break;
					case "sortby":
						recipeItems = sortItemArray(p[1],recipeItems) as _anyItem[];
					break;
					case "filter":
						let filter = p[1].toLowerCase().trim().split("=");
						if (filter.length < 2) return;
						recipeItems = filterItemArray(filter, recipeItems) as _anyItem[];
					break;
				}
			}
			
			for (let i of recipeItems)
			{
				if (itemCounter >= maxItems) {pages.push(recipeString); recipeString = ""; itemCounter = 0;}
				recipeString += `${i._id.toString().padEnd(3)} - ${i.icon} __${i.name}__ ${i.getDataString()}\n`;
				
				//get the recipe
				let r = profession.recipes.find(x => x.item_id == i._id)
				recipeString += `❮ ${r?.costs.map(x => ` ${DataManager.getItem(x.item_id)?.icon} ${x.amount}`).join(" | ")} ❯\n⦕ <:skillgain:671758943357501467> ${r?.skill_gain} | <:skillrequirement:671760532495138846> ${r?.skill_req} | <:skillgreenzone:672082675678445573> ${r?.green_zone} | <:skillgrayzone:672083073302659092> ${r?.gray_zone} ⦖\n\n`;
				itemCounter++;
			}
			if (recipeString.length > 0) pages.push(recipeString);

			if (pages.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you have no recipes that fit your query.`)
			//clamp the selectedpage to the min and max values
			selectedPage = clamp(selectedPage, 1, pages.length);

			embed.setTitle(`__User recipes: ${msg.author.username}__ | Page ${selectedPage}/${pages.length}`);
			embed.setDescription(pages[selectedPage-1]);
			msg.channel.send(embed);
		},
	},
	{
		name: 'craft',
		category: CC.Professions,
		executeWhileTravelling: true,
		mustBeRegistered: true,
		aliases: ['make'],
		description: 'Craft a item from a recipe and gain skill in your profession by doing so.',
		usage: `[prefix]craft [itemName/ItemID] [Amount]`,
		async execute(msg, args, user: User) 
		{	
			if (args.length == 0) return msg.channel.send(`\`${msg.author.username}\`, the name/id of the item you wish to craft.\nUsage: \`${this.usage}\``);
			let {item, amount, errormsg} = getItemAndAmountFromArgs(args,user);

			if (!item) return msg.channel.send(`\`${msg.author.username}\`, ${errormsg}`);

			//find what profession own the item. and get the recipe
			let professionID = user.professions.keyArray().find(x => DataManager.getProfessionData(x)?.recipes.find(y => y.item_id == item?._id));
			if (!professionID) return msg.channel.send(`\`${msg.author.username}\`, could not find a recipe for item: ${item._id} - ${item.icon} - ${item.name}`);
			let userprof = user.getProfession(professionID);
			if (!userprof) return msg.channel.send(`\`${msg.author.username}\`, that recipe belongs to a profession you have not yet learned.`);
			let profdata = DataManager.getProfessionData(professionID);
			if (!profdata) return msg.channel.send(`\`${msg.author.username}\`, could not find a recipe for item: ${item._id} - ${item.icon} - ${item.name}`);
			let recipe = profdata.recipes.find(x => x.item_id == item?._id)!;

			//Check if skill is high enough to craft the recipe
			if (userprof.skill < recipe.skill_req) return msg.channel.send(`\`${msg.author.username}\`, your skill in ${profdata.name} is not high enough to craft that item. (Your skill: ${userprof.skill} | skill requirement: ${recipe.skill_req})`);
			
			//check if user has enough of the costs.
			let costErrorStrings = user.checkForItemsAndAmount(recipe.costs.map(function (x) {return {item: DataManager.getItem(x.item_id), amount: x.amount}}),amount);
			if (costErrorStrings.length > 0) return msg.channel.send(`\`${msg.author.username}\`, you need more of the following items:\n${costErrorStrings.join(`\n`)}`);

			//Make confirmation message with warning and costs.
			if (!await awaitConfirmMessage(`Crafting Confirmation \`${msg.author.username}\` | ${item.getDisplayString()}`,
			`**item:**\n${item.getDisplayString()} x${amount}${item.getDataString()}\n`+
			`**Costs:**\n ${recipe.costs.map(x => ` ${DataManager.getItem(x.item_id)?.getDisplayString()} x${x.amount * amount}`).join("\n")}\n`+
			`${constructWarningMessageForItem(item,user).length > 0 ? `⚠️ **Warnings** ⚠️\n${constructWarningMessageForItem(item,user)}` : ``}`
			,msg,user)) return;

			//give the item(s) and take the materials. return a message
			for (let c of recipe.costs) user.removeItemFromInventoryFromId(c.item_id,c.amount * amount);
			if (item instanceof _materialItem || item instanceof _consumableItem) user.addItemToInventoryFromId(item._id,amount);
			//if it's an equipment item add the rng bonus stats.
			if (item instanceof _equipmentItem) for(let i = 0; i < amount; i++) user.addItemToInventory(createCraftedEquipment(item));

			//add skill gains
			let totalSkillGains = 0
			let totalRecipes : _anyItem[] = [];
			for (let i = 0; i < amount; i++) 
			{
				let {skillgain, newRecipes} = user.gainProfessionSkill(profdata._id,recipe.skill_gain, recipe.green_zone, recipe.gray_zone);
				totalSkillGains += skillgain;
				totalRecipes = totalRecipes.concat(newRecipes);
			}
			msg.channel.send(`\`${msg.author.username}\` has sucessfully crafted ${item.getDisplayString()} x${amount}\n`+
			`${totalSkillGains != 0 ? `Their skill in ${profdata.name} has increased to ${user.getProfession(profdata._id)?.skill}\n` : ""}`+
			`${totalRecipes.length > 0 ? `You have learned how to craft the following item(s):\n${totalRecipes.map(x => x.getDisplayString()).join("\n")}` : ""}`);
		},
	},

	{
		name: 'mine',
		category: CC.Professions,
		executeWhileTravelling: false,
		mustBeRegistered: true,
		aliases: ['mn'],
		description: 'Mine in your current zone for its resources.',
		usage: `[prefix]mine`,
		cooldown: {name: "mine/chop/fish/harvest", duration: 60},
		execute(msg: Discord.Message, args, user: User) 
		{	
			var zone = user.getZone();
			let profSkill = zone.gathering.mining.skill;
			if (profSkill.req > user.getProfession(1)!.skill) return msg.channel.send(`\`${msg.author.username}\`, you need a ${DataManager.getProfessionData(1)?.name} skill of ${profSkill.req} or higher to mine in this zone.`);
			var miningDrops = zone.getMiningDrops().slice();
			if (miningDrops.length == 0) return msg.channel.send(`\`${msg.author.username}\`, there is nothing to gather in this zone.`)

			miningDrops.sort((a,b) => b.chance - a.chance);

			//get drop from chance
			let rng = randomIntFromInterval(0,100)
			while (miningDrops.length > 0 && rng > 0)
			{
				let d = miningDrops[0];
				if (rng <= d.chance) break;
				else rng-= d.chance;
				miningDrops.splice(0,1);
			}

			//calculate amount
			let drop = miningDrops[0];
			let amount = Math.round(randomIntFromInterval(drop.min, drop.max));
			let item = DataManager.getItem(drop.item)!;

			if (item instanceof _materialItem) user.addItemToInventory(new MaterialItem(item._id, amount));
			else if (item instanceof _consumableItem) user.addItemToInventory(new ConsumableItem(item._id, amount, item.effects));
			else if (item instanceof _equipmentItem) user.addItemToInventory(new EquipmentItem(item._id));

			//update skill and send result message
			msg.channel.send(`\`${msg.author.username}\` has mined in ${zone.name} and received ${item.icon} __${item.name}__ x${amount}\n${user.gainProfessionSkill(1,1,profSkill.greenZone, profSkill.grayZone,true).skillgain != 0 ? `Their skill in ${DataManager.getProfessionData(1)?.name} has increased to ${user.getProfession(1)?.skill}` : ""}`);
		},
	},
	{
		name: 'harvest',
		category: CC.Professions,
		executeWhileTravelling: false,
		mustBeRegistered: true,
		aliases: ['hv'],
		description: 'Scour your current zone for its harvestable materials.',
		usage: `[prefix]harvest`,
		cooldown: {name: "mine/chop/fish/harvest", duration: 60},
		execute(msg: Discord.Message, args, user: User) 
		{	
			var zone = user.getZone();
			let profSkill = zone.gathering.mining.skill;
			if (profSkill.req > user.getProfession(2)!.skill) return msg.channel.send(`\`${msg.author.username}\`, you need a ${DataManager.getProfessionData(2)?.name} skill of ${profSkill.req} or higher to harvest in this zone.`);
			var harvestDrops = zone.getHarvestingDrops().slice();
			if (harvestDrops.length == 0) return msg.channel.send(`\`${msg.author.username}\`, there is nothing to gather in this zone.`)

			harvestDrops.sort((a,b) => b.chance - a.chance);

			let rng = randomIntFromInterval(0,100)
			while (harvestDrops.length > 0 && rng > 0)
			{
				let d = harvestDrops[0];
				if (rng <= d.chance) break;
				else rng-= d.chance;
				harvestDrops.splice(0,1);
			}

			let drop = harvestDrops[0];
			let amount = Math.round(randomIntFromInterval(drop.min, drop.max));
			let item = DataManager.getItem(drop.item)!;

			if (item instanceof _materialItem) user.addItemToInventory(new MaterialItem(item._id, amount));
			else if (item instanceof _consumableItem) user.addItemToInventory(new ConsumableItem(item._id, amount, item.effects));
			else if (item instanceof _equipmentItem) user.addItemToInventory(new EquipmentItem(item._id));

			msg.channel.send(`\`${msg.author.username}\` has harvested in ${zone.name} and received ${item.icon} __${item.name}__ x${amount}\n${user.gainProfessionSkill(2,1,profSkill.greenZone, profSkill.grayZone,true).skillgain != 0 ? `Their skill in ${DataManager.getProfessionData(2)?.name} has increased to ${user.getProfession(2)?.skill}` : ""}`);
		}
	},
	{
		name: 'chop',
		category: CC.Professions,
		executeWhileTravelling: false,
		mustBeRegistered: true,
		aliases: [],
		description: 'Chop for wood in your current zone.',
		usage: `[prefix]chop`,
		cooldown: {name: "mine/chop/fish/harvest", duration: 60},
		execute(msg: Discord.Message, args, user: User)
		{	
			var zone = user.getZone();
			let profSkill = zone.gathering.mining.skill;
			if (profSkill.req > user.getProfession(3)!.skill) return msg.channel.send(`\`${msg.author.username}\`, you need a ${DataManager.getProfessionData(3)?.name} skill of ${profSkill.req} or higher to mine in this zone.`);
			var woodworkingDrops = zone.getWoodworkingDrops().slice();
			if (woodworkingDrops.length == 0) return msg.channel.send(`\`${msg.author.username}\`, there is nothing to gather in this zone.`)

			woodworkingDrops.sort((a,b) => b.chance - a.chance);

			let rng = randomIntFromInterval(0,100)
			while (woodworkingDrops.length > 0 && rng > 0)
			{
				let d = woodworkingDrops[0];
				if (rng <= d.chance) break;
				else rng-= d.chance;
				woodworkingDrops.splice(0,1);
			}

			let drop = woodworkingDrops[0];
			let amount = Math.round(randomIntFromInterval(drop.min, drop.max));
			let item = DataManager.getItem(drop.item)!;

			if (item instanceof _materialItem) user.addItemToInventory(new MaterialItem(item._id, amount));
			else if (item instanceof _consumableItem) user.addItemToInventory(new ConsumableItem(item._id, amount, item.effects));
			else if (item instanceof _equipmentItem) user.addItemToInventory(new EquipmentItem(item._id));

			msg.channel.send(`\`${msg.author.username}\` has chopped for wood in ${zone.name} and received ${item.icon} __${item.name}__ x${amount}\n${user.gainProfessionSkill(3,1,profSkill.greenZone, profSkill.grayZone,true).skillgain != 0 ? `Their skill in ${DataManager.getProfessionData(3)?.name} has increased to ${user.getProfession(3)?.skill}` : ""}`);
		}
	},
	{
		name: 'fish',
		category: CC.Professions,
		executeWhileTravelling: false,
		mustBeRegistered: true,
		aliases: [],
		description: 'Fish in a nearby lake.',
		usage: `[prefix]fish`,
		cooldown: {name: "mine/chop/fish/harvest", duration: 60},
		execute(msg: Discord.Message, args, user: User) 
		{	
			var zone = user.getZone();
			let profSkill = zone.gathering.mining.skill;
			if (profSkill.req > user.getProfession(4)!.skill) return msg.channel.send(`\`${msg.author.username}\`, you need a ${DataManager.getProfessionData(4)?.name} skill of ${profSkill.req} or higher to mine in this zone.`);
			var fishingdrops = zone.getFishingDrops().slice();
			if (fishingdrops.length == 0) return msg.channel.send(`\`${msg.author.username}\`, there is nothing to gather in this zone.`)

			fishingdrops.sort((a,b) => b.chance - a.chance);

			let rng = randomIntFromInterval(0,100)
			while (fishingdrops.length > 0 && rng > 0)
			{
				let d = fishingdrops[0];
				if (rng <= d.chance) break;
				else rng-= d.chance;
				fishingdrops.splice(0,1);
			}

			let drop = fishingdrops[0];
			let amount = Math.round(randomIntFromInterval(drop.min, drop.max));
			let item = DataManager.getItem(drop.item)!;

			if (item instanceof _materialItem) user.addItemToInventory(new MaterialItem(item._id, amount));
			else if (item instanceof _consumableItem) user.addItemToInventory(new ConsumableItem(item._id, amount, item.effects));
			else if (item instanceof _equipmentItem) user.addItemToInventory(new EquipmentItem(item._id));

			msg.channel.send(`\`${msg.author.username}\` has fished in ${zone.name} and received ${item.icon} __${item.name}__ x${amount}\n${user.gainProfessionSkill(4,1,profSkill.greenZone, profSkill.grayZone,true).skillgain != 0 ? `Their skill in ${DataManager.getProfessionData(4)?.name} has increased to ${user.getProfession(4)?.skill}` : ""}`);
		}
	},
]

export function SetupCommands() {for (let cmd of cmds) commands.set(cmd.name, cmd);}