import Discord from 'discord.js'
import {client, commands} from '../main';

export function SetupEvents()
{
    console.log("Setting up events...");
    client.on('message', onMSGReceived);
    client.on('ready', onReady);
    console.log("Finished setting up events.");
}

async function onReady()
{
    console.log(`Logged in as ${client.user.tag}! Bot is ready for use and listening for commands.`);
}

async function onMSGReceived(msg: Discord.Message)
{
    try 
    {
        if (msg.author.bot) return;

        const args: string[] = msg.content.split(/ +/);
        var command = args.shift()!.toLowerCase();



        //Get prefix
        const prefix = "$"
        command = command.slice(prefix.length);

        //Check if it starts with required refix
        if (!msg.content.startsWith(prefix)) return;

        //find command
        var c_cmd;
        if (commands.has(command)) c_cmd = commands.get(command);
        else if (commands.find((x:any) => x.aliases.find((alias:string) => alias == command))) c_cmd = commands.find(x => x.aliases.find((alias:string) => alias == command));

        if (!c_cmd) return;

        c_cmd.execute(msg,args);
    }
    catch (error) 
    {
  	    console.error(error);
        msg.reply('there was an error trying to execute that command!');
    }
    
}