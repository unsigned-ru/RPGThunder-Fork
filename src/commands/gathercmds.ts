import { client, gather_commands_cooldown } from "../main";
import cf from "../config.json"
import Discord from "discord.js"
import { isRegistered, randomIntFromInterval, queryPromise, getMaterialDisplayName, getMaterialIcon, setCooldownForCollection, getCooldownForCollection, formatTime } from "../utils";
import { zone_mine_drops, zones, zone_chop_drops, zone_fish_drops, zone_harvest_drops, materials } from "../staticdata";
import { basicModule, UserData, userDataModules, consumablesModule, currencyModule, equipmentModule, inventoryModule, materialsModule, statsModule } from "../classes/userdata";
import { _material, _zone_gather_drop } from "../interfaces";

export const commands = 
[
    {
		name: 'mine',
		category: "gathering",
		aliases: [],
		description: 'Mine current zone for its ores!',
		usage: `[prefix]mine`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				
				//Check if user is registered
				if (!await isRegistered(msg.author.id)) throw "You must be registered to mine for coins/ores/gems!"

				const [basicMod] = <[basicModule]> await new UserData(msg.author.id, [userDataModules.basic]).init();
				//get zone's mine drops
				const currentZoneDrops = zone_mine_drops.filter(x => x.zone_id == basicMod.zone);

				//null protection
				if (currentZoneDrops.size == 0) throw "There is nothing to mine in this zone!";

				//Check for cooldown.
				if (gather_commands_cooldown.has(msg.author.id)) throw `Ho there!\nThat command is on cooldown for another ${formatTime(getCooldownForCollection(msg.author.id,gather_commands_cooldown))}!`;
				
				setCooldownForCollection(msg.author.id, cf.gather_cooldown, gather_commands_cooldown);

				//Setup their chance counters
				var chanceCollection: Discord.Collection<number,{drop: _zone_gather_drop, counter: number}> = new Discord.Collection();

				var counter = 0;
				for (let drop of currentZoneDrops)
				{
					counter += drop[1].drop_chance;
					chanceCollection.set(drop[0],{drop: drop[1], counter: counter})
				}
				
				//generate RNG 0 - counted chance
				const rng = randomIntFromInterval(0,counter);
				var drop = currentZoneDrops.first();

				for (let dc of chanceCollection.sort((a,b) => a.counter - b.counter))
				{
					if (rng <= dc[1].counter)
					{
						drop = dc[1].drop
						break;
					}
				}

				const amount = randomIntFromInterval(drop.min_amount,drop.max_amount);
				
				//update user in database
				await queryPromise(`UPDATE user_materials SET ${materials.get(drop.material_id)!.database_name}=${materials.get(drop.material_id)!.database_name} + ${amount} WHERE user_id=${msg.author.id}`);

				//return with a message
				msg.channel.send(`\`${msg.author.username}\` mined in ${zones.get(basicMod.zone!)!.name} and received ${getMaterialIcon(materials.get(drop.material_id)!.database_name)} ${amount} ${getMaterialDisplayName(materials.get(drop.material_id)!.database_name)}`)
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'harvest',
		category: "gathering",
		aliases: ['hv'],
		description: 'Scour your area for harvestable materials!',
		usage: `[prefix]harvest`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				if (!await isRegistered(msg.author.id)) throw "You must be registered to harvest!"


				const [basicMod] = <[basicModule]> await new UserData(msg.author.id, [userDataModules.basic]).init();

				//get zone's mine drops
				const currentZoneDrops = zone_harvest_drops.filter(x => x.zone_id == basicMod.zone);

				//null protection
				if (currentZoneDrops.size == 0) throw "There is nothing to harvest in this zone!";

				//Check for cooldown.
				if (gather_commands_cooldown.has(msg.author.id)) throw `Ho there!\nThat command is on cooldown for another ${formatTime(getCooldownForCollection(msg.author.id,gather_commands_cooldown))}!`;

				setCooldownForCollection(msg.author.id, cf.gather_cooldown, gather_commands_cooldown);

				//Setup their chance counters
				var chanceCollection: Discord.Collection<number,{drop: _zone_gather_drop, counter: number}> = new Discord.Collection();

				var counter = 0;
				for (let drop of currentZoneDrops)
				{
					counter += drop[1].drop_chance;
					chanceCollection.set(drop[0],{drop: drop[1], counter: counter})
				}
				
				//generate RNG 0 - counted chance
				const rng = randomIntFromInterval(0,counter);
				var drop = currentZoneDrops.first();
				for (let dc of chanceCollection.sort((a,b) => a.counter - b.counter))
				{
					if (rng <= dc[1].counter)
					{
						drop = dc[1].drop
						break;
					}
				}
				const amount = randomIntFromInterval(drop.min_amount,drop.max_amount);
				//update user in database
				await queryPromise(`UPDATE user_materials SET ${materials.get(drop.material_id)!.database_name}=${materials.get(drop.material_id)!.database_name} + ${amount} WHERE user_id=${msg.author.id}`);

				//return with a message
				msg.channel.send(`\`${msg.author.username}\` went harvesting in ${zones.get(basicMod.zone!)!.name} and received ${getMaterialIcon(materials.get(drop.material_id)!.database_name)} ${amount} ${getMaterialDisplayName(materials.get(drop.material_id)!.database_name)}`)
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'chop',
		category: "gathering",
		aliases: [],
		description: 'Chop in your current zone for its wood!',
		usage: `[prefix]chop`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				if (!await isRegistered(msg.author.id)) throw "You must be registered to chop for wood!";

				const [basicMod] = <[basicModule]> await new UserData(msg.author.id, [userDataModules.basic]).init();

				//get zone's mine drops
				const currentZoneDrops = zone_chop_drops.filter(x => x.zone_id == basicMod.zone);

				//null protection
				if (currentZoneDrops.size == 0) throw "There is nothing to chop in this zone!";

				//Check for cooldown.
				if (gather_commands_cooldown.has(msg.author.id)) throw `Ho there!\nThat command is on cooldown for another ${formatTime(getCooldownForCollection(msg.author.id,gather_commands_cooldown))}!`;

				setCooldownForCollection(msg.author.id, cf.gather_cooldown, gather_commands_cooldown);

				//Setup their chance counters
				var chanceCollection: Discord.Collection<number,{drop: _zone_gather_drop, counter: number}> = new Discord.Collection();

				var counter = 0;
				for (let drop of currentZoneDrops)
				{
					counter += drop[1].drop_chance;
					chanceCollection.set(drop[0],{drop: drop[1], counter: counter})
				}
				
				//generate RNG 0 - counted chance
				const rng = randomIntFromInterval(0,counter);

				var drop = currentZoneDrops.first();
				for (let dc of chanceCollection.sort((a,b) => a.counter - b.counter))
				{
					if (rng <= dc[1].counter)
					{
						drop = dc[1].drop
						break;
					}
				}

				const amount = randomIntFromInterval(drop.min_amount,drop.max_amount);

				//update user in database
				await queryPromise(`UPDATE user_materials SET ${materials.get(drop.material_id)!.database_name}=${materials.get(drop.material_id)!.database_name} + ${amount} WHERE user_id=${msg.author.id}`);

				//return with a message
				msg.channel.send(`\`${msg.author.username}\` chopped in ${zones.get(basicMod.zone!)!.name} and received ${getMaterialIcon(materials.get(drop.material_id)!.database_name)} ${amount} ${getMaterialDisplayName(materials.get(drop.material_id)!.database_name)}`)
			}
			catch(err)
			{
				console.log(err);
				msg.channel.send(err);
			}
		},
	},
	{
		name: 'fish',
		category: "gathering",
		aliases: [],
		description: 'Fish in a nearby pool in your current zone!',
		usage: `[prefix]fish`,
		async execute(msg: Discord.Message, args: string[]) 
		{
			try
			{	
				//Check if user is registered
				if (!await isRegistered(msg.author.id)) throw "You must be registered to fish!"


				const [basicMod] = <[basicModule]> await new UserData(msg.author.id, [userDataModules.basic]).init();

				//get zone's mine drops
				const currentZoneDrops = zone_fish_drops.filter(x => x.zone_id == basicMod.zone);

				//null protection
				if (currentZoneDrops.size == 0) throw "There is nothing to fish for in this zone!";

				//Check for cooldown.
				if (gather_commands_cooldown.has(msg.author.id)) throw `Ho there!\nThat command is on cooldown for another ${formatTime(getCooldownForCollection(msg.author.id,gather_commands_cooldown))}!`;

				setCooldownForCollection(msg.author.id, cf.gather_cooldown, gather_commands_cooldown);

				//Setup their chance counters
				var chanceCollection: Discord.Collection<number,{drop: _zone_gather_drop, counter: number}> = new Discord.Collection();

				var counter = 0;
				for (let drop of currentZoneDrops)
				{
					counter += drop[1].drop_chance;
					chanceCollection.set(drop[0],{drop: drop[1], counter: counter})
				}
				
				//generate RNG 0 - counted chance
				const rng = randomIntFromInterval(0,counter);
				var drop = currentZoneDrops.first();
				
				for (let dc of chanceCollection.sort((a,b) => a.counter - b.counter))
				{
					if (rng <= dc[1].counter)
					{
						drop = dc[1].drop
						break;
					}
				}

				const amount = randomIntFromInterval(drop.min_amount,drop.max_amount);

				//update user in database
				await queryPromise(`UPDATE user_materials SET ${materials.get(drop.material_id)!.database_name}=${materials.get(drop.material_id)!.database_name} + ${amount} WHERE user_id=${msg.author.id}`);

				//return with a message
				msg.channel.send(`\`${msg.author.username}\` fished in ${zones.get(basicMod.zone!)!.name} and received ${getMaterialIcon(materials.get(drop.material_id)!.database_name)} ${amount} ${getMaterialDisplayName(materials.get(drop.material_id)!.database_name)}`)
			}
			catch(err)
			{
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