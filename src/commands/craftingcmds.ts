import { client} from "../main";
import Discord from "discord.js"
import { isRegistered, getItemData, queryPromise, getItemDataByName, editCollectionNumberValue, randomIntFromInterval} from "../utils";
import { craftingRecipes, item_categories, consumables, materials } from "../staticdata";
import { _item, _material } from "../interfaces";
import { userDataModules, UserData, materialsModule } from "../classes/userdata";

export const commands = 
[
    {
		name: 'recipes',
		category: "economy",
		aliases: ['crafting'],
		description: 'View your available recipes.',
		usage: `[prefix]recipes [optional: page]`,
		async execute(msg: Discord.Message, args: string[]) 
		{	
			try {
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use that command.";

				var page = 1;
				if (parseInt(args[0])) page = parseInt(args[0]);



				var recipePages = [];
				var recipesString = "";
				for (var recipe of craftingRecipes.values())
				{
					
					//parse the costs
					var costs: Discord.Collection<string,{material: _material, amount: number}> = new Discord.Collection();
					for (let costString of recipe.mat_costs.split(","))
					{
						var material_amount_keypair = costString.split('-');
						var mat = materials.find(x => x.database_name == material_amount_keypair[0]);
						costs.set(mat.database_name, {material: mat, amount: parseInt(material_amount_keypair[1])})
					}
					var costString = "";
					for (let c of costs)
					{
						costString += `${c[1].material.icon_name} ${c[1].amount} | `
					}
					//get data of item with switch by category
					switch(item_categories.get(recipe.category)!.name.toLowerCase())
					{
						case "item":
							//⚡  🛡️  🗡️ ❤️
							var item = await getItemData(recipe.item_id) as _item;
							recipesString += `${item.icon_name} **${item.name}** [🗡️${item.atk}+ | 🛡️${item.def}+ | ⚡${item.acc}+] ⟷ ${costString.slice(0,-2)}\n`;  //
							break;
						case "consumable":
							var cons = consumables.get(recipe.item_id)!;
							recipesString += `${cons.icon_name} **${cons.name}** [❤️${cons.hp}] ⟷ ${costString.slice(0,-2)}\n`;  
							break;
						case "material":
							var mat = materials.get(recipe.item_id)!;
							recipesString += `${mat.icon_name} **${mat.display_name}** ⟷ ${costString.slice(0,-2)}\n`;  
							break;
					}
					if (recipesString.length > 900) 
					{
						recipePages.push(recipesString);
						recipesString = "";
					}
				}
				if (recipesString.length > 0) recipePages.push(recipesString);
				if (page < 1 || page > recipePages.length) throw `Page number must be bigger than 0 and smaller than ${recipePages.length+1}`;

				//Create an embedd with the profile data.
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`User recipes: ${msg.author.username} | Page: ${page}/${recipePages.length}`)
				.setDescription(`*Recipes are formatted in the following way:*\n \`ITEM INFO\` ⟷ \`MATERIAL COSTS\``)
				.addField("**Recipes**", recipePages[page-1])
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

				msg.channel.send(embed);
			}
			catch(err){
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'craft',
		category: "economy",
		aliases: ['crafting'],
		description: 'View your available recipes.',
		usage: `[prefix]craft [name] [optional: amount]`,
		async execute(msg: Discord.Message, args: string[]) 
		{	
			try {
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use that command.";

				if(args.length == 0) throw `Please enter the name of the item you wish to craft!\nUsage: \`${this.usage}\``;

				//Parse amount
				var amount = 1;
				if (parseInt(args[args.length-1])) amount = parseInt(args.splice(args.length-1,1)[0])

				//Parse name string
				var recipeName = args.map(x => x.trim()).join(" ").toLowerCase();

				var confirmString;
				//Find the item & find the recipe for the item
				var recipe;
				var item = await getItemDataByName(recipeName);
				var cons = consumables.find(x => x.name.toLowerCase() == recipeName);
				var mat = materials.find(x => x.display_name.toLowerCase() == recipeName);
				if (item)
				{
					recipe = craftingRecipes.find(x => x.item_id == item!.id && x.category == 1);
					confirmString = `${item.icon_name} ${item.name}`;
				}
				else if (cons)
				{
					recipe = craftingRecipes.find(x => x.item_id == cons.id && x.category == 2);
					confirmString = `${cons.icon_name} ${cons.name}`;
				}
				else if (mat)
				{
					recipe = craftingRecipes.find(x => x.item_id == mat.id && x.category == 3);
					confirmString = `${mat.icon_name} ${mat.display_name}`;
				}
				else
				{
					throw `Could not find an item named: \`${recipeName}\``;
				}
				if (!recipe) throw `Could not find a recipe for the item: \`${recipeName}\``


				//get userdata.
				const [materialMod] = <[materialsModule]> await new UserData(msg.author.id, [userDataModules.materials]).init();

				//parse the material costs
				var costs: Discord.Collection<string,{material: _material, amount: number}> = new Discord.Collection();
				for (let costString of recipe.mat_costs.split(","))
				{
					var material_amount_keypair = costString.split('-');
					var material = materials.find(x => x.database_name == material_amount_keypair[0]);
					costs.set(material.database_name, {material: material, amount: parseInt(material_amount_keypair[1]) * amount})
				}

				//Check if we have enough materials to craft the amount of items
				for (let cost of costs) if (materialMod.materials.get(cost[1].material.database_name)! < cost[1].amount) throw `You do not own enough ${cost[1].material.icon_name} ${cost[1].material.display_name} to craft that item.`;
				var costString = "";
				for (let c of costs)
				{
					costString += `${c[1].material.icon_name} ${c[1].amount} | `
				}
				var confirmEmbed = new Discord.RichEmbed()
				.setTitle(`Crafting confirmation - ${msg.author.username}`)
				.setDescription(`Are you sure you want to craft **${confirmString}** x${amount}\n costs: ${costString.slice(0,-3)}`)
				.setFooter("Yes / No", 'http://159.89.133.235/DiscordBotImgs/logo.png')
				.setColor('#fcf403')

				msg.channel.send(confirmEmbed);

				var rr = await msg.channel.awaitMessages((m:Discord.Message) => m.author.id == msg.author.id,{time: 20000, maxMatches: 1});

				if (rr.first().content.toLowerCase() != "yes") return;


				const embed = new Discord.RichEmbed()
				.setColor('#42f569') //Yelow
				.setTimestamp()
				.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
				var outputTitle = "";
				//Add to the user
				switch(recipe.category)
				{
					case 1:
						var bonus_atk = randomIntFromInterval(item!.bonus_atk_min, item!.bonus_atk_max);
						var bonus_def = randomIntFromInterval(item!.bonus_def_min, item!.bonus_def_max);
						var bonus_acc = randomIntFromInterval(item!.bonus_acc_min, item!.bonus_acc_max);
						UserData.addItemToInventory(msg.author.id, undefined, item!.id, bonus_atk, bonus_def, bonus_acc);
						outputTitle = `${msg.author.username} sucessfully crafted ${item!.icon_name} ${item!.name}`;
						embed.addField("*Stat Info*",
						`🗡️**ATK:** ${item!.atk} ${bonus_atk > 0 ? `**+ ${bonus_atk}**`: ""}\n`+
						`🛡️**DEF:** ${item!.def} ${bonus_def > 0 ? `**+ ${bonus_def}**`: ""}\n`+
						`⚡**ACC:** ${item!.acc} ${bonus_acc > 0 ? `**+ ${bonus_acc}**`: ""}`
						)
						break;
					case 2:
						//consumable
						UserData.addConsumable(msg.author.id,undefined,recipe.item_id,amount);
						outputTitle = `${msg.author.username} sucessfully crafted ${cons.icon_name} ${cons.name} ${amount > 1 ? `x${amount}` : ""}`;
						break;
					case 3:
						//material
						outputTitle = `${msg.author.username} sucessfully crafted ${mat.icon_name} ${mat.display_name} ${amount > 1 ? `x${amount}` : ""}`;
						editCollectionNumberValue(materialMod.materials, mat.database_name, amount)
						break;
				}
				//Remove the materials from module
				for (let cost of costs) editCollectionNumberValue(materialMod.materials, cost[1].material.database_name, -cost[1].amount)

				//update
				await materialMod.update(msg.author.id);

				//Output
				embed.setTitle(outputTitle)

				msg.channel.send(embed);
			}
			catch(err){
				console.log(err);
				msg.channel.send(err);
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