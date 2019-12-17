import Discord from 'discord.js'
import {client, blackjackSessions} from '../main';
import {prefix,session_category_id} from '../config.json';
import {queryPromise} from '../utils';
import { blacklistedChannels } from '../staticdata';

export function SetupEvents()
{
    console.log("Setting up events...");
    client.c.on('message', onMSGReceived);
    client.c.on('ready', onReady);
    console.log("Finished setting up events.");
}

async function onReady()
{
    console.log(`Logged in as ${client.c.user.tag}! Bot is ready for use and listening for commands.`);
    updateBotStatus();
    client.c.setInterval(updateBotStatus,3600000); //update bot status every hour
}

async function onMSGReceived(msg: Discord.Message)
{
    try 
    {
        if (msg.author.bot) return;
        //relay channel messages when blackjack session is active
        if ((msg.channel as Discord.GuildChannel).parentID == session_category_id && blackjackSessions.find(x => x.user.id == msg.author.id)) return blackjackSessions.find(x => x.user.id == msg.author.id)!.handleSessionCommand(msg);
    
        //Check if it starts with required refix
        if (!msg.content.startsWith(prefix)) return;
        if (blacklistedChannels.includes(msg.channel.id)) {await msg.delete(); return;}
        //Split args and execute command if it exists.
        const args: string[] = msg.content.slice(prefix.length).split(/ +/);
        const command = args.shift()!.toLowerCase();
        if (client.commands.has(command))  client.commands.get(command).execute(msg, args);
        else if (client.commands.find((x:any) => x.aliases.find((alias:string) => alias == command))) client.commands.find(x => x.aliases.find((alias:string) => alias == command)).execute(msg,args);
    }
    catch (error) 
    {
  	    console.error(error);
        msg.reply('there was an error trying to execute that command!');
    }
    
}


//Timed events.
async function updateBotStatus(){
    var countResult = await queryPromise("SELECT COUNT(*) from users")
    var registerCount = countResult[0][Object.keys(countResult[0])[0]]
    client.c.user.setActivity(`${prefix}help | ${registerCount} registered users on ${client.c.guilds.size} servers`);
}