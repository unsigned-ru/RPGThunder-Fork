import { client, gather_commands_cooldown } from "../main";
import cf from "../config.json"
import Discord from "discord.js"
import { isRegistered, randomIntFromInterval, queryPromise, getCurrencyDisplayName, getCurrencyIcon, getMaterialDisplayName, getMaterialIcon } from "../utils";

export const commands = 
[
    {
		name: 'mine',
		aliases: [],
		description: 'Mine for coins/ores/gems!',
		usage: `${cf.prefix}mine`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				if (!await isRegistered(msg.author.id)) throw "You must be registered to mine for coins/ores/gems!"

				//Check for cooldown.
				if (gather_commands_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference < cf.command_cooldown) throw `Ho there!\nThat command is on cooldown for another ${Math.round(cf.command_cooldown - difference)} seconds!`;
					gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date = new Date();
				}
				else
				{
					gather_commands_cooldown.push({user_id: msg.author.id, date: new Date()});
				}

				//Coins or ore
				const typeFlip = randomIntFromInterval(0, 10000);
				if (typeFlip < cf.mine_chance_for_coin*100)
				{
					//coins
					const amount = (randomIntFromInterval(cf.mine_coin_gain_min,cf.mine_coin_gain_max));
					await queryPromise(`UPDATE user_currencies SET coins=coins + ${Math.round(amount)} WHERE user_id=${msg.author.id};`);
					msg.channel.send(`You have sucessfully mined and received ${amount} coins!`);
				}
				else
				{
					//Check for chance of gems.
					const gemChanceFlip = randomIntFromInterval(0,10000);
					//Create a sum of all chances (*100)
					var chanceSum = cf.mine_rare_drops.reduce((a,b) => a + (b.drop_chance*100), 0)
					for (var drop of cf.mine_rare_drops.reverse())
					{
						if (gemChanceFlip < chanceSum)
						{
							await queryPromise(`UPDATE user_materials SET ${drop.database_name}=${drop.database_name} +1 WHERE user_id=${msg.author.id};`)
							msg.channel.send(`You have sucessfully mined and received a rare drop: ${getMaterialIcon(drop.database_name)} ${getMaterialDisplayName(drop.database_name)}!`);
							return;
						}
						chanceSum -= (drop.drop_chance*100)
					}
					
					//ore
					const amount = randomIntFromInterval(cf.mine_ore_gain_min,cf.mine_ore_gain_max);
					await queryPromise(`UPDATE user_materials SET iron_ore=iron_ore + ${amount} WHERE user_id=${msg.author.id};`);
					msg.channel.send(`You have sucessfully mined and received ${amount} ${getMaterialIcon("iron_ore")} iron ore!`);
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
		name: 'chop',
		aliases: [],
		description: 'Chop for some wood!',
		usage: `${cf.prefix}Chop`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				if (!await isRegistered(msg.author.id)) throw "You must be registered to chop for wood.";

				//Check for cooldown.
				if (gather_commands_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference < cf.command_cooldown) throw `Ho there!\nThat command is on cooldown for another ${Math.round(cf.command_cooldown - difference)} seconds!`;
					gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date = new Date();
				}
				else
				{
					gather_commands_cooldown.push({user_id: msg.author.id, date: new Date()});
				}

				//Generate number between minwood and maxwood
				const amount = randomIntFromInterval(cf.chop_wood_gain_min, cf.chop_wood_gain_max);

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
]



export function SetupCommands()
{
    commands.forEach(cmd =>
    {
        client.commands.set(cmd.name, cmd);
        console.log("command: '"+cmd.name+"' Registered.");
    });
}