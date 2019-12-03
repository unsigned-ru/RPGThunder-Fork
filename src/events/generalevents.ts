import Discord from 'discord.js'
import {client,con} from '../main';
import {prefix} from '../config.json';
import {classes} from "../staticData";
import { queryPromise } from '../utils';

export function SetupEvents()
{
    console.log("Setting up events...");
    client.c.on('message', onMSGReceived);
    client.c.on('ready', onReady);
    client.c.on('guildMemberAdd',onUserJoin);

    console.log("Finished setting up events.");
}

async function onReady()
{
    console.log(`Logged in as ${client.c.user.tag}!`);
    
    var countResult = (await queryPromise("SELECT COUNT(*) from users"))
    var registerCount = countResult[0][Object.keys(countResult[0])[0]]

    client.c.user.setActivity(`${prefix}help | ${registerCount} registered users on ${client.c.guilds.size} servers`);
}

function onMSGReceived(msg: Discord.Message)
{
    try 
    {
        //Check if it starts with required refix
        if (!msg.content.startsWith(prefix) || msg.author.bot) return;

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

async function onUserJoin(user: Discord.GuildMember)
{
    try
    {
        if (user == null)return;

        const userCountResult = (await queryPromise(`SELECT COUNT(*) FROM users WHERE user_id=${user.id}`))[0]
        const userCount = userCountResult[Object.keys(userCountResult)[0]];
        if (userCount != 0) throw "Skipping on join, user already registered.";

        var availableClassesNames: string = "";
        var availableClassesDescriptions: string = "";

        classes.forEach(element => {
            availableClassesNames += `**${element.name}**\n`;
            availableClassesDescriptions += `${element.description}\n`;
        });

        const embed = new Discord.RichEmbed()
        
        .setColor('#fcf403')
        .setTitle(`Pssst ${user.displayName}...`)
        .setDescription(`**Welcome to _${user.guild.name}_! I happen to be in the server you just joined, and I can let you in on a great deal! Please hear me out!**`)

        .addField("📰 **Summary**","I am a Bot that strives to bring interesting RPG elements into the discord servers I am in! The data across all servers is shared. "+ 
        "So if we meet again in another server, you'll maintain your class, level, currencies and so on. There are tons of activities to participate in!")

        .addField("👥 **Join us!**","I'd be thrilled to recruit another adventurer with potential! Join the growing RPG community, become the strongest of them all and kick some ass!")

        .addField("❔ **'How?!'**","I knew this question was coming so i went ahead and prepared for it! To join us you will have to create your character first. You can do so by choosing what class you'd like to be! "+
        "\n\n**When you have made up your mind simply execute the command: `"+prefix+"register [class]`**")

        .addField("⚔️ **Pick your poison!**","Available classes:\n\n"+
        availableClassesNames
        ,true)
        .addField(" ឵឵"," ឵឵\n\n"+ availableClassesDescriptions
        ,true)

        .setThumbnail('http://159.89.133.235/DiscordBotImgs/logo.png')
        .setTimestamp()
        .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
        
        user.send(embed);
    }
    catch(err)
    {
        console.log(err);
    }
}
