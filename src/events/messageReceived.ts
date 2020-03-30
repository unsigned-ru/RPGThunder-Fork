import Discord, { TextChannel } from 'discord.js';
import cf from '../config.json';
import { DataManager } from '../classes/dataManager.js';
import { getServerPrefix, colors, sleep } from '../utils.js';
import { executeGlobalCommand } from '../commands/adminCommands.js';
import { commands, client } from '../RPGThunder.js';


export const rateStack: Discord.Collection<string, Date> = new Discord.Collection();

export async function onMSGReceived(msg: Discord.Message)
{
    try 
    {
        //check if there's been atleast x ms since last command execution. 
        const rateTrace = rateStack.get(msg.author.id);
        if (rateTrace && new Date().getTime() - rateTrace.getTime() <= 150) return;

        if (msg.author.bot) return;
        if (cf.DEVMODE && msg.channel.type != "dm" && msg.guild.id == "646062255170912293") return; //prevent the test bot from receiving anything in the official server.

        //check for existing sessions.
        const session = DataManager.sessions.get(msg.author.id);
        if (session && session.sessionChannel?.id == msg.channel.id) 
        {
            if (session.awaitingInput) session.onInput(msg.content.toLowerCase().trim().replace("$",""));
            await msg.delete().catch(err => console.error(err));
            return; 
        }
        
        const user = DataManager.getUser(msg.author.id);
        
        if (user && user.macroProtection.questionActive)
        {
            if (msg.channel.type == "dm")
            {
                const answer = msg.content.trim();
                if (isNaN(+answer)) return msg.channel.send(`That is not a number.`);
                else if (+answer != user.macroProtection.questionAnswer) return msg.channel.send(`Your answer is incorrect!`);
                else 
                {
                    msg.channel.send(`Correct!\n✨ Thank you for playing fair, your rock! ✨\n\nYou have received <:coin:654764078451130379> 5 Coins`);
                    user.getCurrency(1).value += 5;
                    user.macroProtection.questionActive = false;
                    user.macroProtection.userLocked = false;
                }
            }
            else return;
        }

        if (msg.channel.type == "dm") return;

        //check for global command prefix
        if (msg.content.toLowerCase().startsWith("rpgthunder")) return executeGlobalCommand(msg, msg.content.split(/ +/)[1],msg.content.split(/ +/).slice(2));
        
        //check if it starts with local prefix
        const prefix = getServerPrefix(msg);
        if (!msg.content.startsWith(prefix)) return;

        if (!msg.guild.channels.get(msg.channel.id)?.permissionsFor(client.user)?.has(["READ_MESSAGES", "SEND_MESSAGES"])) return msg.author.send("I do not have permissions to read and write messages in that channel.").catch();

        //check if the receiving channel is blacklisted.
        if (DataManager.blacklistedChannels.includes(msg.channel.id) && !cf.Operators.includes(msg.author.id)) return msg.delete();

        //check if the user has a active session, if so don't execute commands till the session ends.
        if (session && session.sessionChannel?.id != msg.channel.id) return msg.channel.send(`\`${msg.author.username}\`, you have an active session, please finish your active session in ${session.sessionChannel?.toString()} before executing any commands.`);
        
        //construct an ARG array from the content. & get the command name.
        const args: string[] = msg.content.split(/ +/);
        let command = args.shift()!.toLowerCase();
        command = command.slice(prefix.length);
        
        if (command == "macro")
        {
            if (user?.macroProtection.userLocked)
            {
                if (!user.macroProtection.questionActive) { await user.askMacroProtection(msg.channel as TextChannel);  msg.channel.send(`\`${msg.author.username}\`, you have received a direct message from the bot.`);}
                else {msg.channel.send(`\`${msg.author.username}\`, you already have an active macro protection prompt. The message has been re-sent.`); await msg.author.send(user.macroProtection.lastQuestion).catch(() => msg.channel.send(`\`${msg.author.username}\`, I do not have permission to message you.\nPlease go to your settings and enable the following:\n\`Settings --> Privacy & Safety --> Enable 'Allow direct messages from server members'\``));}
            }
            else msg.channel.send(`\`${msg.author.username}\`, your account is not locked and prompting macro protection confirmation.`);
        }

        
        //find the command and execute if found
        let cCmd;
        if (commands.has(command)) cCmd = commands.get(command); //find command by name
        else if (commands.filter(x => x.aliases.includes(command)).size > 0) cCmd = commands.filter(x => x.aliases.includes(command)).first(); //find command by alias.
        
        if (!cCmd) return; //no command found with name or alias; return.

        if (cCmd.needOperator && !cf.Operators.includes(msg.author.id)) return; //do you need to be a server operator to execute the command?

        //check if user must be registered.
        if (cCmd.mustBeRegistered && !user) return msg.channel.send(`\`${msg.author.username}\`, you must be registered to use that command, if you were previously registered, we just recently launched a **HUGE** update, re-balancing the game. As we are still in beta, the easiest way to do this was a wipe. Sorry about the inconvenience, and thank you for your understanding.`);

        //check if the user has a reaction pending.
        if (user?.reaction.isPending) return msg.channel.send(`\`${msg.author.username}\`, you have a pending reaction. Please react to it first.`);

        //check if the command is executable when travelling, if not and the user is travelling then return
        if (!cCmd.executeWhileTravelling && user?.commandCooldowns.has("travel")) return msg.channel.send(`\`${msg.author.username}\`, that command cannot be executed while travelling. Please wait another ${user.getCooldown("travel")}`); 

        if (user?.macroProtection.userLocked) return;

        //set the cooldown of the command right before execution.
        if(cCmd.cooldown)
        {
            const cCd = cCmd.cooldown;
            const cd = user!.getCooldown(cCd.name);
            if (cd) return msg.channel.send(`\`${msg.author.username}\`, that command is on cooldown for another ${cd}`);
            user!.setCooldown(cCd.name, cCd.duration, cCmd.ignoreCooldownReduction);
        }

        cCmd.execute(msg,args,user);
        rateStack.set(msg.author.id, new Date());

        //check for macro protection.
        if (user && !user.macroProtection.userLocked)
        {
            user.macroProtection.commandCounter++;

            if (user.macroProtection.commandCounter >= cf.macroProtectionFrequency) 
            {
                const mpEmbed = new Discord.RichEmbed()
                .setColor(colors.red)
                .setTitle(`Halt \`${msg.author.username}\`! 👮`)
                .setDescription(`You have been selected for inspection!\n**Please confirm you are not a robot by executing the command: \`$macro\` and solving the math problem sent to you as a direct message.**`)
                .setTimestamp()
                .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
                user.macroProtection.userLocked = true;
                await sleep(1.5);
                msg.channel.send(mpEmbed);
                
            }
        }

    }
    catch (error) 
    {
        console.error(error);
        msg.reply('there was an error trying to execute that command!');
    }
    
}