import { DataManager } from "../classes/dataManager";
import { client } from "../main";
import cf from '../config.json';
import { get } from "../utils";

//pledge update is done when a pledge switches pledge amount, (tiers).
export async function patreonOnMemberPledgeUpdate(data: any)
{
    if(get(data, "attributes.patron_status") != "active_patron") return;
    const patreonRank = DataManager.getPatreonRank(get(data, "relationships.currently_entitled_tiers.data.0.id"));
    const useraccount = DataManager.users.find(x => x.patreonMemberID == data.id);
    const discorduser = useraccount.getUser();
    const officialServer = client.guilds.get(cf.official_server);
    if (!discorduser || !officialServer || !useraccount || !patreonRank) return;
    if (patreonRank._id == useraccount.patreonRank) return;

    //remove all patreonranks from user.
    await officialServer.members.get(discorduser.id)?.removeRoles(DataManager.patreonRanks.map(x => x.discordrole_id));
    
    //reassign correct one
    useraccount.patreonRank = patreonRank._id;
    await officialServer.members.get(discorduser.id)?.addRole(patreonRank._id);
    discorduser.send("Your patreon pledge has changed in tiers and your rank status has been updated accordingly.");
}