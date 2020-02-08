import Discord from 'discord.js'
import {client, commands, dbl} from '../main';
import { _command } from '../interfaces';
import { DataManager } from '../classes/dataManager';
import { getServerPrefix, randomIntFromInterval, constructCurrencyString } from '../utils';
import { executeGlobalCommand } from '../commands/adminCommands';
import { CronJob } from 'cron';
import cf from "../config.json"
import { cmds } from '../commands/userActionCommands';

//is called once the data is finished loading in.
export async function SetupEvents()
{
    console.log("Setting up events...");
    client.on('message', onMSGReceived);
    client.on('ready', onReady);
    client.on("guildMemberAdd", onUserJoin)
    console.log("Finished setting up events.");
}

function onReady()
{
    console.log(`Logged in as ${client.user.tag}! Bot is ready for use and listening for commands.`);    
}

export function onFinishedLoadingDataAndReady()
{
    console.log("Setting up CRON Jobs...");
    new CronJob("*/15 * * * *", on_hpRegenTick, undefined, true);
    !cf.DEVMODE ? new CronJob("*/15 * * * *", DataManager.pushDatabaseUpdate, undefined, true, undefined, DataManager) : undefined;
    !cf.DEVMODE ? new CronJob("*/15 * * * *", DataManager.activeLottery.updateMessage, undefined, true, undefined, DataManager, true) : undefined;
    !cf.DEVMODE ? dbl.webhook.on('vote', onVote) : undefined;
    new CronJob("0 */1 * * *", updateBotStatus, undefined, true, undefined, updateBotStatus, true);
    new CronJob(DataManager.activeLottery.drawDate, DataManager.drawLottery, undefined, true, undefined, DataManager);
    console.log("Finished setting up CRON Jobs...");
}

function onVote(vote:any)
{
    var u = client.users.get(vote.user);
    if (!u) return;
    let ud = DataManager.getUser(u.id);
    if (!ud) return u.send(`✨ Thank you for voting! ✨\n\nUnfortunately you could not receive a reward due to not being registered. Consider registering by using \`$register\``);
    
    var coins = randomIntFromInterval(2,10,true)
    ud.getCurrency(1).value += coins;
    var valor = 1;
    ud.getCurrency(2).value += valor;
    return u.send(`✨ Thank you for voting! ✨\n\nYou have received the following rewards:\n- ${constructCurrencyString(1,coins)}\n- ${constructCurrencyString(2,valor)}`);
}

function onUserJoin(member: Discord.GuildMember)
{
    //check if the member has an active session and give the perms when joining.
    const s = DataManager.sessions.find(x => x.discordUser.id == member.id);
    if (s) s.createChannelPermissions();
}

async function onMSGReceived(msg: Discord.Message)
{
    try 
    {
        if (msg.author.bot) return;
        if (cf.DEVMODE && msg.guild.id == "646062255170912293") return;
        let session = DataManager.sessions.get(msg.author.id);
        if (session && session.sessionChannel?.id == msg.channel.id) 
        {
            if (session.awaitingInput) session.onInput(msg.content.toLowerCase().trim());
            return msg.delete(); 
        }
        //Get prefix
        const prefix = getServerPrefix(msg);
        if (msg.content.toLowerCase().startsWith("rpgthunder")) return executeGlobalCommand(msg, msg.content.split(/ +/)[1],msg.content.split(/ +/).slice(2));
        if (!msg.content.startsWith(prefix)) return;
        if (DataManager.blacklistedChannels.includes(msg.channel.id) && !cf.Operators.includes(msg.author.id)) return msg.delete();
        if (session && session.sessionChannel?.id != msg.channel.id) return msg.channel.send(`\`${msg.author.username}\`, you have an active session, please finish your active session in ${session.sessionChannel?.toString()} before executing any commands.`);
        const args: string[] = msg.content.split(/ +/);
        var command = args.shift()!.toLowerCase();
        command = command.slice(prefix.length);
        
        //find command
        var c_cmd;
        if (commands.has(command)) c_cmd = commands.get(command);
        else if (commands.filter(x => x.aliases.includes(command)).size > 0) c_cmd = commands.filter(x => x.aliases.includes(command)).first();
        if (!c_cmd) return;
        if (c_cmd.needOperator && !cf.Operators.includes(msg.author.id)) return; 
        let user = DataManager.getUser(msg.author.id);
        if (c_cmd.mustBeRegistered && !user) return msg.channel.send(`\`${msg.author.username}\`, you must be registered to use that command, if you were previously registered, we just recently launched a **HUGE** update, re-balancing the game. As we are still in beta, the easiest way to do this was a wipe. Sorry about the inconvenience, and thank you for your understanding.`)

        if (user?.reaction.isPending) return msg.channel.send(`\`${msg.author.username}\`, you have a pending reaction. Please react to it first.`)

        if (!c_cmd.executeWhileTravelling && user?.command_cooldowns.has("travel")) return msg.channel.send(`\`${msg.author.username}\`, that command cannot be executed while travelling. Please wait another ${user.getCooldown("travel")}`); 

        if(c_cmd.cooldown)
        {
            let c_cd= c_cmd.cooldown;
            let cd = user!.getCooldown(c_cd.name);
            if (cd) return msg.channel.send(`\`${msg.author.username}\`, that command is on cooldown for another ${cd}`);
            user!.setCooldown(c_cd.name, c_cd.duration);
        }


        c_cmd.execute(msg,args,user);
    }
    catch (error) 
    {
  	    console.error(error);
        msg.reply('there was an error trying to execute that command!');
    }
    
}

function on_hpRegenTick()
{
    for (let user of DataManager.users.values()) user.applyEffect({effect: "INSTANT_HEAL", amount: user.getStats().base.hp*0.021});
}

function updateBotStatus()
{
    client.user.setActivity(`$help | ${DataManager.users.size} registered users on ${client.guilds.size} servers`,{type: "WATCHING"});
}