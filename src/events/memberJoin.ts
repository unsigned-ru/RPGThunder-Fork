import { DataManager } from "../classes/dataManager";
import Discord from 'discord.js';

export function onMemberJoin(member: Discord.GuildMember)
{
    //check if the member has an active session and give the perms when joining.
    const s = DataManager.sessions.find(x => x.discordUser.id == member.id);
    if (s && s.finishedSettingUp) s.createChannelPermissions();

    //check if user has any patreon ranks.
    const useraccount = DataManager.getUser(member.id);
    if (useraccount && useraccount.patreonRank)
    {
        const rank = DataManager.getPatreonRank(useraccount.patreonRank);
        if (rank) member.addRole(rank.discordrole_id);
    }
}