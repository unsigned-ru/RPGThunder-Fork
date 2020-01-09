import Discord from 'discord.js'
import {client, blackjackSessions, zoneBossSessions, traveling} from '../main';
import {session_category_id} from '../config.json';
import {queryPromise, getGuildPrefix} from '../utils';
import { blacklistedChannels, custom_prefixes } from '../staticdata';
import { resetLottery, updateLotteryMessage } from '../commands/gamblecmds';

export function SetupEvents()
{
    console.log("Setting up events...");
    client.c.on('message', onMSGReceived);
    client.c.on('ready', onReady);
    client.c.on("guildMemberAdd", onUserJoin)
    console.log("Finished setting up events.");
}

export var resetLotteryJob :any | undefined;
export var updateLotteryMessageJob :any | undefined;
async function onReady()
{
    console.log(`Logged in as ${client.c.user.tag}! Bot is ready for use and listening for commands.`);
    updateBotStatus();
    client.c.setInterval(updateBotStatus,3600000); //update bot status every hour    

    //lotterypick
    var schedule = require('node-schedule');
    resetLotteryJob = schedule.scheduleJob('0 18 * * *', resetLottery);

    //lotteryUpdate
    updateLotteryMessage();
    updateLotteryMessageJob = schedule.scheduleJob('*/15 * * * *', updateLotteryMessage);
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
        const prefix = getGuildPrefix(msg.guild.id);
        command = command.slice(prefix.length);

        //Check if it starts with required refix
        if (!msg.content.startsWith(prefix)) return;
        //delete message if sent in a blacklisted channel
        if (blacklistedChannels.includes(msg.channel.id)) {await msg.delete(); return;}

        //find command
        var c_cmd;
        if (client.commands.has(command)) c_cmd = client.commands.get(command);
        else if (client.commands.find((x:any) => x.aliases.find((alias:string) => alias == command))) c_cmd = client.commands.find(x => x.aliases.find((alias:string) => alias == command));

        if (!c_cmd) return;

        //Check if we're traveling
        if (traveling.has(msg.author.id))
        {
            if (c_cmd.execute_while_travelling) c_cmd.execute(msg,args)
            else
            {
                var d = traveling.get(msg.author.id)!;
                var remainingTime = (d.getTime() - new Date().getTime()) / 1000;
                msg.channel.send(`You cannot execute that command while traveling, you will arrive in ${Math.round(remainingTime)}s!`)
            }
        }
        else c_cmd.execute(msg,args);
    }
    catch (error) 
    {
  	    console.error(error);
        msg.reply('there was an error trying to execute that command!');
    }
    
}

async function onUserJoin(member: Discord.GuildMember)
{
    //check if the member has an active session and give the perms when joining.
    const bs = blackjackSessions.find(x => x.user.id == member.id);
    if (bs) bs.cmdChannel!.overwritePermissions(member,{ VIEW_CHANNEL: true, READ_MESSAGES: true, READ_MESSAGE_HISTORY: true, SEND_MESSAGES: true});

    const zbs = zoneBossSessions.find(x => x.user.id == member.id);
    if (zbs) zbs.cmdChannel!.overwritePermissions(member,{ VIEW_CHANNEL: true, READ_MESSAGES: true, READ_MESSAGE_HISTORY: true, SEND_MESSAGES: true});
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
                custom_prefixes.set(msg.guild.id,{id: 0, guild_id: msg.guild.id, prefix: args[1]});
                msg.reply(`Prefix has been changed to \`${args[1]}\`.`);
                break;
            case "prefix":
                msg.reply(`This guilds' prefix is \`${getGuildPrefix(msg.guild.id)}\``);
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