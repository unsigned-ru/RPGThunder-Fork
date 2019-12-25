import { client, gather_commands_cooldown } from "../main";
import cf from "../config.json"
import Discord from "discord.js"
import { isRegistered, randomIntFromInterval, queryPromise, getMaterialDisplayName, getMaterialIcon } from "../utils";
import { zone_mine_drops, zones, zone_chop_drops, zone_fish_drops, zone_harvest_drops } from "../staticdata";
import { basicModule, UserData, userDataModules, consumablesModule, currencyModule, equipmentModule, inventoryModule, materialsModule, statsModule } from "../classes/userdata";

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
				if (gather_commands_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference < cf.gather_cooldown) throw `Ho there!\nThat command is on cooldown for another ${Math.round(cf.gather_cooldown - difference)} seconds!`;
					gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date = new Date();
				}
				else
				{
					gather_commands_cooldown.push({user_id: msg.author.id, date: new Date()});
				}

				//get a random one,
				const drop = currentZoneDrops.random();
				const amount = randomIntFromInterval(drop.min_amount,drop.max_amount);

				//update user in database
				await queryPromise(`UPDATE user_materials SET ${drop.material_name}=${drop.material_name} + ${amount} WHERE user_id=${msg.author.id}`);

				//return with a message
				msg.channel.send(`\`${msg.author.username}\` mined in ${zones.get(basicMod.zone!)!.name} and received ${getMaterialIcon(drop.material_name)} ${amount} ${getMaterialDisplayName(drop.material_name)}`)
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
				if (gather_commands_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference < cf.gather_cooldown) throw `Ho there!\nThat command is on cooldown for another ${Math.round(cf.gather_cooldown - difference)} seconds!`;
					gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date = new Date();
				}
				else
				{
					gather_commands_cooldown.push({user_id: msg.author.id, date: new Date()});
				}

				//get a random one,
				const drop = currentZoneDrops.random();
				const amount = randomIntFromInterval(drop.min_amount,drop.max_amount);

				//update user in database
				await queryPromise(`UPDATE user_materials SET ${drop.material_name}=${drop.material_name} + ${amount} WHERE user_id=${msg.author.id}`);

				//return with a message
				msg.channel.send(`\`${msg.author.username}\` went harvesting in ${zones.get(basicMod.zone!)!.name} and received ${getMaterialIcon(drop.material_name)} ${amount} ${getMaterialDisplayName(drop.material_name)}`)
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
				if (!await isRegistered(msg.author.id)) throw "You must be registered to chop for wood!"

				

				const [basicMod] = <[basicModule]> await new UserData(msg.author.id, [userDataModules.basic]).init();

				//get zone's mine drops
				const currentZoneDrops = zone_chop_drops.filter(x => x.zone_id == basicMod.zone);

				//null protection
				if (currentZoneDrops.size == 0) throw "There is nothing to chop in this zone!";

				//Check for cooldown.
				if (gather_commands_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference < cf.gather_cooldown) throw `Ho there!\nThat command is on cooldown for another ${Math.round(cf.gather_cooldown - difference)} seconds!`;
					gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date = new Date();
				}
				else
				{
					gather_commands_cooldown.push({user_id: msg.author.id, date: new Date()});
				}

				//get a random one,
				const drop = currentZoneDrops.random();
				const amount = randomIntFromInterval(drop.min_amount,drop.max_amount);

				//update user in database
				await queryPromise(`UPDATE user_materials SET ${drop.material_name}=${drop.material_name} + ${amount} WHERE user_id=${msg.author.id}`);

				//return with a message
				msg.channel.send(`\`${msg.author.username}\` chopped in ${zones.get(basicMod.zone!)!.name} and received ${getMaterialIcon(drop.material_name)} ${amount} ${getMaterialDisplayName(drop.material_name)}`)
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
				if (gather_commands_cooldown.find(x=> x.user_id == msg.author.id))
				{
					const difference = (new Date().getTime() - gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date.getTime()) / 1000;
					if (difference < cf.gather_cooldown) throw `Ho there!\nThat command is on cooldown for another ${Math.round(cf.gather_cooldown - difference)} seconds!`;
					gather_commands_cooldown.find(x=> x.user_id == msg.author.id)!.date = new Date();
				}
				else
				{
					gather_commands_cooldown.push({user_id: msg.author.id, date: new Date()});
				}

				

				//get a random one,
				const drop = currentZoneDrops.random();
				const amount = randomIntFromInterval(drop.min_amount,drop.max_amount);

				//update user in database
				await queryPromise(`UPDATE user_materials SET ${drop.material_name}=${drop.material_name} + ${amount} WHERE user_id=${msg.author.id}`);

				//return with a message
				msg.channel.send(`\`${msg.author.username}\` fished in ${zones.get(basicMod.zone!)!.name} and received ${getMaterialIcon(drop.material_name)} ${amount} ${getMaterialDisplayName(drop.material_name)}`)
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