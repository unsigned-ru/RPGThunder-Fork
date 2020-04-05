import { PatreonGet, get } from "../utils";
import { DataManager } from "../classes/dataManager";
import cf from '../config.json';
import Discord from 'discord.js';
import { client } from "../RPGThunder";

//Create is done only the first time a pledge happens.
export async function patreonOnMemberCreate(data: any)
{
    //get tiers and discord data from webhook and api
    const entitledTiers = get(data, "relationships.currently_entitled_tiers.data");
    const res = (await PatreonGet(`members/${data.id}?include=user&fields%5Buser%5D=social_connections`));
    const discord = get(res, "included.0.attributes.social_connections.discord");

    //check if user is entitled to a tier and or has linked their account to discord.
    if (discord && entitledTiers.length > 0)
    {
        //check if the rank exists on our database or if the bot knows the user && the user is registered.
        const patreonRank = DataManager.getPatreonRank(entitledTiers[0].id);
        const discorduser = client.users.cache.find((x: Discord.User) => x.id == discord.user_id);
        if (!patreonRank || !discorduser) return;

        const useraccount = DataManager.getUser(discorduser.id);
        if (!useraccount) return;

        //bot knows user, rank is found, user is registered.
        if (useraccount.patreonRank == patreonRank._id) return;  //user already has that rank.

        //assign rank.
        useraccount.patreonMemberID = data.id;
        useraccount.patreonRank = patreonRank._id;
        
        //assign discord role if it exists and user is in the official server.
        const officialServer = client.guilds.cache.find((x: Discord.Guild) => x.id == cf.official_server);
        if (officialServer && officialServer.members.cache.has(useraccount.userID) && officialServer.roles.cache.has(patreonRank.discordrole_id))
        officialServer.members.cache.get(discorduser.id)?.roles.add(patreonRank.discordrole_id);

        //Message the user about the change in status.
        discorduser.send(`Your membership payment was received and your rank status has been updated!\n\n✨ Thank you so much for supporting us, your support is what drives us to present you a game with the best quality possible. ✨`);
    }
}