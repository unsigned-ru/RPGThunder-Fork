import { DataManager } from "../classes/dataManager";
import { client } from "../main";
import cf from '../config.json';
import { get } from "../utils";

//pledge update is done when a pledge switches pledge amount, (tiers).
export async function patreon_onMemberPledgeUpdate(data: any)
{
    if(get(data, "attributes.patron_status") != "active_patron") return;
    let patreonRank = DataManager.getPatreonRank(get(data, "relationships.currently_entitled_tiers.data.0.id"));
    let useraccount = DataManager.users.find(x => x.patreon_member_id == data.id);
    let discorduser = useraccount.getUser();
    let officialServer = client.guilds.get(cf.official_server);
    if (!discorduser || !officialServer || !useraccount || !patreonRank) return;
    if (patreonRank._id == useraccount.patreon_rank) return;

    //remove all patreonranks from user.
    await officialServer.members.get(discorduser.id)?.removeRoles(DataManager.patreonRanks.map(x => x.discordrole_id));
    
    //reassign correct one
    useraccount.patreon_rank = patreonRank._id;
    await officialServer.members.get(discorduser.id)?.addRole(patreonRank._id);
    discorduser.send("Your patreon pledge has changed in tiers and your rank status has been updated accordingly.");
}