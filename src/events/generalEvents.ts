import {client} from '../main';
import { DataManager } from '../classes/dataManager';
import { onMSGReceived } from './messageReceived';
import { onMemberJoin } from './memberJoin';
import Discord from 'discord.js';
import cf from '../config.json';

//is called once the data is finished loading in.
export async function SetupEvents()
{
    console.log("Setting up events...");
    client.on('message', onMSGReceived);
    client.on('ready', onReady);
    client.on("guildMemberAdd", onMemberJoin);
    client.on("guildMemberUpdate", onguildMemberUpdate);
    console.log("Finished setting up events.");
}

async function onReady() { console.log(`Logged in as ${client.user.tag} on ${client.guilds.size} servers with a total of ${client.users.size} members.`); }
function onguildMemberUpdate(oldm: Discord.GuildMember, newm: Discord.GuildMember)
{
    if (oldm.guild.id == cf.official_server && newm.guild.id == cf.official_server)
    {
        if (!oldm.roles.has("651567406967291904") && newm.roles.has("651567406967291904"))
            newm.send(`✨ Thank you for boosting our server! ✨\n\n As a small reward you now have 3% cooldown reduction on all commands.`);
    }
}
//exports
export function hpRegenTick() { for (const user of DataManager.users.values()) user.applyEffect({effect: "INSTANT_HEAL", amount: user.getStats().base.hp*0.021}); }
export function updateBotStatus() { client.user.setActivity(`$help | ${DataManager.users.size} registered users on ${client.guilds.size} servers`,{type: "WATCHING"}); }


