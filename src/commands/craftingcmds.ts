import { client} from "../main";
import Discord from "discord.js"
import { isRegistered, getItemData} from "../utils";
import { craftingRecipes, item_categories, consumables, materials } from "../staticdata";
import { _item, _material } from "../interfaces";

export const commands = 
[
    {
		name: 'recipes',
		category: "economy",
		aliases: ['crafting'],
		description: 'View your available recipes.',
		usage: `[prefix]profile [optional: @User]`,
		async execute(msg: Discord.Message) 
		{	
			try {
				if (!await isRegistered(msg.author.id)) throw "You must be registered to use that command.";

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
							//⚡  🛡️  🗡️
							var item = await getItemData(recipe.item_id) as _item;
							recipesString += `${item.icon_name} **${item.name}** [🗡️${item.atk}+ | 🛡️${item.def}+ | ⚡${item.acc}+] ⟷ ${costString.slice(0,-2)}\n`;  //
							break;
						case "consumable":
							var cons = consumables.get(recipe.item_id)!;
							recipesString += `${cons.icon_name} **${cons.name}** [❤️${cons.hp}] ⟷ ${costString.slice(0,-2)}\n`;  
							break;
						case "material":
							break;
					}
				}

				//Create an embedd with the profile data.
				const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
				.setTitle(`User recipes: ${msg.author.username}`)
				.setDescription(`*Recipes are formatted in the following way:*\n \`ITEM INFO\` ⟷ \`MATERIAL COSTS\``)
				.addField("**Recipes**", recipesString)
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
]



export function SetupCommands()
{
    commands.forEach(cmd =>
    {
        client.commands.set(cmd.name, cmd);
        console.log("command: '"+cmd.name+"' Registered.");
    });
}