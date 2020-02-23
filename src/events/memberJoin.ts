import { DataManager } from "../classes/dataManager";
import Discord from 'discord.js';

export function onMemberJoin(member: Discord.GuildMember)
{
    //check if the member has an active session and give the perms when joining.
    const s = DataManager.sessions.find(x => x.discordUser.id == member.id);
    if (s) s.createChannelPermissions();

    //check if user has any patreon ranks.
    let useraccount = DataManager.getUser(member.id);
    if (useraccount && useraccount.patreon_rank)
    {
        let rank = DataManager.getPatreonRank(useraccount.patreon_rank);
        if (rank) member.addRole(rank.discordrole_id);
    }
}