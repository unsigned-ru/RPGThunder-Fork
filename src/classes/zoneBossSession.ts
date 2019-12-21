import Discord from "discord.js";
import { Boss } from "./boss";
import { client } from "../main";
import {official_server_id,session_category_id} from "../config.json"

export class ZoneBossSession
{
    executedChannel: Discord.TextChannel;
    user:Discord.User
    boss: Boss;
    sessionGuild: Discord.Guild | undefined;
    cmdChannel: Discord.TextChannel | undefined = undefined;
    destoryTimerID: number = 0;
    boardMsg: Discord.Message | undefined;
    isStarted = false;
    hasEnded = false;
    invite: Discord.Invite | undefined;
    
    constructor(executedChannel:Discord.TextChannel, user:Discord.User, boss: Boss)
    {
        this.executedChannel = executedChannel;
        this.user = user;
        this.boss = boss;
    }

    async initAsync()
    {
      try
      {
        //Get the official server
        this.sessionGuild = client.c.guilds.get(official_server_id)!;
  
        //create session channel with category as parent.
        var parentCategory = this.sessionGuild.channels.get(session_category_id)!;
        
        //if the channel exists delete it first. then create a channel for play and add permissions for user.
        if (this.sessionGuild!.channels.find(x => x.name.includes(this.user.id.slice(0,4)) && x.name.includes("blackjack"))) await this.sessionGuild.channels.find(x => x.name.includes(this.user.id.slice(0,4))).delete();
  
        const newchannel = (await this.sessionGuild!.createChannel(`${this.boss.name}-#${this.user.id.slice(0,4)}`, {type: "text", parent: parentCategory,
        permissionOverwrites: [
          {id: this.user.id, allowed:["VIEW_CHANNEL","SEND_MESSAGES","READ_MESSAGES","READ_MESSAGE_HISTORY"]}
        ]}));
  
        this.cmdChannel = newchannel as Discord.TextChannel;
      
        this.invite = await this.cmdChannel.createInvite({maxAge: 86400});
        
        //TODO: Add destroytimer
        //this.destoryTimerID = setTimeout(this.destroySession,300000,this,false) //3min timeout
        // await this.promptStart();
      }
      catch(err)
      {
        console.log(err);
      }
      
    }
}