import Discord from 'discord.js'
import {client} from '../main';
import {prefix} from '../config.json';

export function SetupEvents()
{
    console.log("Setting up events...")
    client.c.on('message', onMSGReceived);
    client.c.on('ready', onReady);
    client.c.on('guildMemberAdd',onUserJoin);
}

function onReady()
{
    console.log(`Logged in as ${client.c.user.tag}!`);
}

function onMSGReceived(msg: Discord.Message)
{
    //Check if it starts with required refix
    if (!msg.content.startsWith(prefix) || msg.author.bot) return;

    //Split args and execute command if it exists.
    const args: string[] = msg.content.slice(prefix.length).split(/ +/);
    const command = args.shift()!.toLowerCase();
        
    if (!client.commands.has(command)) return;
    try 
    {
        client.commands.get(command).execute(msg, args);
    }
    catch (error) 
    {
  	    console.error(error);
        msg.reply('there was an error trying to execute that command!');
    }
    
}

function onUserJoin(user: Discord.User)
{
    if (user == null)return;

    user.sendMessage("This is a message you should receive when a server with this bot connected.");
}