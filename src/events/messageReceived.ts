import Discord from 'discord.js';
import cf from '../config.json'
import { DataManager } from '../classes/dataManager.js';
import { getServerPrefix } from '../utils.js';
import { executeGlobalCommand } from '../commands/adminCommands.js';
import { commands } from '../main.js';


export async function onMSGReceived(msg: Discord.Message)
{
    try 
    {
        if (msg.channel.type == "dm") return;
        if (msg.author.bot) return;
        if (cf.DEVMODE && msg.guild.id == "646062255170912293") return; //prevent the test bot from receiving anything in the official server.

        //check for existing sessions.
        let session = DataManager.sessions.get(msg.author.id);
        if (session && session.sessionChannel?.id == msg.channel.id) 
        {
            if (session.awaitingInput) session.onInput(msg.content.toLowerCase().trim());
            return msg.delete(); 
        }
        
        //check for global command prefix
        if (msg.content.toLowerCase().startsWith("rpgthunder")) return executeGlobalCommand(msg, msg.content.split(/ +/)[1],msg.content.split(/ +/).slice(2));
        
        //check if it starts with local prefix
        const prefix = getServerPrefix(msg);
        if (!msg.content.startsWith(prefix)) return;

        //check if the receiving channel is blacklisted.
        if (DataManager.blacklistedChannels.includes(msg.channel.id) && !cf.Operators.includes(msg.author.id)) return msg.delete();

        //check if the user has a active session, if so don't execute commands till the session ends.
        if (session && session.sessionChannel?.id != msg.channel.id) return msg.channel.send(`\`${msg.author.username}\`, you have an active session, please finish your active session in ${session.sessionChannel?.toString()} before executing any commands.`);
        
        //construct an ARG array from the content. & get the command name.
        const args: string[] = msg.content.split(/ +/);
        var command = args.shift()!.toLowerCase();
        command = command.slice(prefix.length);
        
        //find the command and execute if found
        var c_cmd;
        if (commands.has(command)) c_cmd = commands.get(command); //find command by name
        else if (commands.filter(x => x.aliases.includes(command)).size > 0) c_cmd = commands.filter(x => x.aliases.includes(command)).first(); //find command by alias.
        
        if (!c_cmd) return; //no command found with name or alias; return.

        if (c_cmd.needOperator && !cf.Operators.includes(msg.author.id)) return; //do you need to be a server operator to execute the command?

        //check if user must be registered.
        let user = DataManager.getUser(msg.author.id);
        if (c_cmd.mustBeRegistered && !user) return msg.channel.send(`\`${msg.author.username}\`, you must be registered to use that command, if you were previously registered, we just recently launched a **HUGE** update, re-balancing the game. As we are still in beta, the easiest way to do this was a wipe. Sorry about the inconvenience, and thank you for your understanding.`)

        //check if the user has a reaction pending.
        if (user?.reaction.isPending) return msg.channel.send(`\`${msg.author.username}\`, you have a pending reaction. Please react to it first.`)

        //check if the command is executable when travelling, if not and the user is travelling then return
        if (!c_cmd.executeWhileTravelling && user?.command_cooldowns.has("travel")) return msg.channel.send(`\`${msg.author.username}\`, that command cannot be executed while travelling. Please wait another ${user.getCooldown("travel")}`); 

        //set the cooldown of the command right before execution.
        if(c_cmd.cooldown)
        {
            let c_cd = c_cmd.cooldown;
            let cd = user!.getCooldown(c_cd.name);
            if (cd) return msg.channel.send(`\`${msg.author.username}\`, that command is on cooldown for another ${cd}`);
            user!.setCooldown(c_cd.name, c_cd.duration, c_cmd.ignoreCooldownReduction);
        }

        c_cmd.execute(msg,args,user);
    }
    catch (error) 
    {
  	    console.error(error);
        msg.reply('there was an error trying to execute that command!');
    }
    
}