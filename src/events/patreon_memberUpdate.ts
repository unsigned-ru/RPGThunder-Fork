import { client } from "../RPGThunder";
import { PatreonGet, get } from "../utils";
import { DataManager } from "../classes/dataManager";
import cf from '../config.json';

//update is done when membership is re-enabled or ended.
export async function patreonOnMemberUpdate(data: any)
{
    //get tiers and discord data from webhook and api 
    const active = data.attributes.patron_status == "active_patron";
    const entitledTiers = data.relationships.currently_entitled_tiers.data;
    const officialServer = client.guilds.get(cf.official_server);
    
    if (active)
    {
        const res = await PatreonGet(`members/${data.id}?include=user&fields%5Buser%5D=social_connections`);
        const discord = get(res, "included.0.attributes.social_connections.discord");

        //check if user is entitled to a tier and or has linked their account to discord.
        if (discord && entitledTiers.length > 0)
        {
            
            //check if the rank exists on our database or if the bot knows the user && the user is registered.
            const patreonRank = DataManager.getPatreonRank(entitledTiers[0].id); 
            const discorduser = client.users.get(discord.user_id);
            if (!patreonRank || !discorduser) return;

            const useraccount = DataManager.getUser(discorduser.id);
            if (!useraccount) return;

            //bot knows user, rank is found, user is registered.
            if (useraccount.patreonRank == patreonRank._id) return; //user already has that rank.
            
            //assign rank.
            useraccount.patreonMemberID = data.id;
            useraccount.patreonRank = patreonRank._id;
            
            //assign discord role if it exists and user is in the official server.
            if (officialServer && officialServer.members.has(useraccount.userID) && officialServer.roles.has(patreonRank.discordrole_id))
            officialServer.members.get(discorduser.id)?.addRole(patreonRank.discordrole_id);

            //Message the user about the change in status.
            discorduser.send(`Your membership payment was received and your rank status has been updated!\n\n✨ Thank you so much for supporting us, your support is what drives us to present you a game with the best quality possible. ✨`);
        }
    }
    else
    {
        if (entitledTiers.length == 0)
        {
            //remove all patreonranks from user.
            const useraccount = DataManager.users.find(x => x.patreonMemberID == data.id);
            const discorduser = useraccount.getUser();
            if (!discorduser || !officialServer) return;
            officialServer.members.get(discorduser.id)?.removeRoles(DataManager.patreonRanks.map(x => x.discordrole_id));
            if (useraccount) {useraccount.patreonRank = undefined; useraccount.patreonMemberID = undefined;}
            discorduser.send("Your patreon pledge has expired or was removed. Your rank status has been reset.");
        }
    }
    
}