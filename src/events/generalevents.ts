import Discord from 'discord.js'
import {client, blackjackSessions, zoneBossSessions} from '../main';
import {session_category_id} from '../config.json';
import {queryPromise, getGuildPrefix} from '../utils';
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
        //relay channel messages when session is active
        if ((msg.channel as Discord.GuildChannel).parentID == session_category_id && blackjackSessions.find(x => x.user.id == msg.author.id)) return blackjackSessions.find(x => x.user.id == msg.author.id)!.handleSessionCommand(msg);
        if ((msg.channel as Discord.GuildChannel).parentID == session_category_id && zoneBossSessions.find(x => x.user.id == msg.author.id)) return zoneBossSessions.find(x => x.user.id == msg.author.id)!.handleSessionCommand(msg);
        //Split args
        const args: string[] = msg.content.split(/ +/);
        var command = args.shift()!.toLowerCase();

        //check if we're running the prefix changing command
        if (command == "rpgthunder") {changePrefixCommand(msg,args); return;}

        //Get prefix
        const prefix = await getGuildPrefix(msg.guild.id);
        command = command.slice(prefix.length);

        //Check if it starts with required refix
        if (!msg.content.startsWith(prefix)) return;

        if (blacklistedChannels.includes(msg.channel.id)) {await msg.delete(); return;}
        //Execute command if it exists.
        if (client.commands.has(command))  client.commands.get(command).execute(msg, args);
        else if (client.commands.find((x:any) => x.aliases.find((alias:string) => alias == command))) client.commands.find(x => x.aliases.find((alias:string) => alias == command)).execute(msg,args);
    }
    catch (error) 
    {
  	    console.error(error);
        msg.reply('there was an error trying to execute that command!');
    }
    
}

async function changePrefixCommand(msg:Discord.Message, args:string[])
{
    try
    {
        switch(args[0].toLowerCase())
        {
            case "setprefix":
                if (!msg.member.permissions.has("ADMINISTRATOR")) return msg.reply("You do not have permission to execute that command.");
                if(args[1].length == 0) msg.reply("Please enter what you would like to change the prefix to.\nUsage: `rpgthunder setprefix [prefix]`");
            
                if (args[1].length > 10) return msg.reply("Your custom prefix cannot be longer than 10 characters.");
            
                //check if it already exists
                const result = (await queryPromise(`SELECT * FROM custom_prefix WHERE guild_id=${msg.guild.id}`))[0];

                if(result) await queryPromise(`UPDATE custom_prefix SET prefix='${args[1]}' WHERE guild_id=${msg.guild.id}`);
                else await queryPromise(`INSERT INTO custom_prefix(guild_id,prefix) VALUES('${msg.guild.id}','${args[1]}')`);
            
                msg.reply(`Prefix has been changed to \`${args[1]}\`.`);
                break;
            case "prefix":
                msg.reply(`This guilds' prefix is \`${await getGuildPrefix(msg.guild.id)}\``);
        }
    }
    catch(err){console.log(err);}
   
   
}

//Timed events.
async function updateBotStatus(){
    var countResult = await queryPromise("SELECT COUNT(*) from users")
    var registerCount = countResult[0][Object.keys(countResult[0])[0]]
    client.c.user.setActivity(`$help | ${registerCount} registered users on ${client.c.guilds.size} servers`);
}