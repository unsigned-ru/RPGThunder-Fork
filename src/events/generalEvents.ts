import { onMSGReceived } from './messageReceived';
import { onMemberJoin } from './memberJoin';
import Discord from 'discord.js';
import cf from '../config.json';
import { client } from '../RPGThunder';

//is called once the data is finished loading in.
export async function setupEvents()
{
    console.log("Setting up events...");
    client.on('message', onMSGReceived);
    client.on('ready', onReady);
    client.on("guildMemberAdd", onMemberJoin);
    client.on("guildMemberUpdate", onguildMemberUpdate);
    console.log("Finished setting up events.");
}

async function onReady() { console.log(`Logged in as ${client.user?.tag} on ${client.guilds.cache.size} servers with a total of ${client.users.cache.size} members.`);}
function onguildMemberUpdate(oldm: Discord.GuildMember | Discord.PartialGuildMember, newm: Discord.GuildMember | Discord.PartialGuildMember)
{
    if (oldm.guild.id == cf.official_server && newm.guild.id == cf.official_server)
    {
        if (!oldm.roles.cache.has("651567406967291904") && newm.roles.cache.has("651567406967291904"))
            newm.send(`✨ Thank you for boosting our server! ✨\n\n As a small reward you now have 3% cooldown reduction on all commands.`);
    }
}


