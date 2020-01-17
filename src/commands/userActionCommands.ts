import Discord, { Channel } from "discord.js"
import { commands } from "../main";
import { DataManager } from "../dataManager";
import { randomIntFromInterval, clamp, getTotalWeightForLevel } from "../utils";

export const cmds = 
[
    {
		name: 'register',
		aliases: [],
		description: 'Registers a user!',
		usage: `[prefix]register`,
		async execute(msg: Discord.Message) 
		{
            if(DataManager.users.has(msg.author.id)) return msg.channel.send(`\`${msg.author.username}\` is already registered.`);
            
            const embed = new Discord.RichEmbed()
            .setColor('#fcf403')
            .setTitle(`Welcome to RPG Thunder!`)
            .setDescription(`**To start off your adventure, you must pick a class! What class do you want to be?**`)
            .setThumbnail('http://159.89.133.235/DiscordBotImgs/logo.png')
            .setTimestamp()
            .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');

            for (var c of DataManager.classes) embed.addField(`**${c[1].icon} ${c[1].name}**`, c[1].description);
            msg.channel.send(embed);

            try
            {
                var rr = await msg.channel.awaitMessages((m:Discord.Message) => m.author.id == msg.author.id,{time: 100000, maxMatches: 1});
                var selectedClass = DataManager.classes.find(x => rr.first().content.toLowerCase().includes(x.name.toLowerCase()));
                if (!selectedClass) return msg.channel.send("Did not find a class with that name.");
                DataManager.registerUser(msg.author,selectedClass);
                msg.channel.send(`You have been registered as the class ${selectedClass.name}`);
            }
            catch(err) { console.log(err); return; }
        },
    },
]

export function SetupCommands()
{
    for (let cmd of cmds)
    {
        commands.set(cmd.name, cmd);
        console.log("command: '"+cmd.name+"' Registered.");
    };
}