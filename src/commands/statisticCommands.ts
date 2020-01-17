import Discord from "discord.js"
import { commands } from "../main";
import { DataManager } from "../dataManager";
import { round } from "../utils";
import { _equipmentItem } from "../classes/items";

export const cmds = 
[
    {
		name: 'profile',
		category: "statistics",
		execute_while_travelling: true,
		aliases: ['pf'],
		description: 'Shows a user profile containing their class, stats and currencies.',
		usage: `[prefix]profile [optional: @User]`,
		async execute(msg: Discord.Message) 
		{	
			var targetUser: Discord.GuildMember;

			//check if there is a mentioned user to get the profile from.
			if (msg.mentions.members.size > 0) targetUser = msg.mentions.members.first();
			else targetUser = msg.member;

			var user = DataManager.getUser(targetUser.id);
			if (!user) return msg.channel.send(`\`${targetUser.user.username}\` is not registered.`);

			//Create an embedd with the profile data.
			const embed = new Discord.RichEmbed()
			.setColor('#fcf403') //Yelow
			.setTitle(`User profile: ${targetUser.user.username}`)
			
			.addField("Info:",
			`**Class:** ${user.class.name}\n`+
			`**Level:** ${user.level}\n`+ //+
			`**Exp:** ${user.exp}\n` // / ${calculateReqExp(basicMod.level!).toFixed(0)
			// `**Zone:** ${DataManager.getZone(user.zone).name}\n`
			,true)

			.addBlankField(true);

			var s = user.getStats();
			embed.addField("Stats:",
			`❤️ ${round(user.hp)} / ${round(s.base.hp)} \n`+
			`🗡️ ${round(s.total.atk)} (${round(s.base.atk)} + ${round(s.gear.atk)})\n`+
			`🛡️ ${round(s.total.def)} (${round(s.base.def)} + ${round(s.gear.def)})\n`+
			`⚡ ${round(s.total.acc)} (${round(s.base.acc)} + ${round(s.gear.acc)})\n`
			,true);

			var currencyString = "";
			for (var c of user.currencies)
			{
				var currencyData = DataManager.getCurrency(c[0]);
				currencyString += `${currencyData.icon} **${currencyData.name}**: ${c[1].value}\n`
			}
			embed.addField("Currencies:",currencyString,false);

			var equipmentString = "";
			for (let e of user.equipment)
			{
				let slotname = DataManager.getItemSlot(e[0]).name;
				if (e[1].item) 
				{
					let item = DataManager.getItem(e[1].item.id) as _equipmentItem;
					equipmentString+= `${item.icon} ${item.name} ${item.getQuality().icon} [🗡️${round(item.stats.base.atk)} | 🛡️${round(item.stats.base.def)} | ⚡${round(item.stats.base.acc)}]\n`
				}
				else equipmentString += `**${slotname}:** ❌ Nothing\n`
				
			}
			embed.addField("Equipment:",equipmentString)
			.setThumbnail(targetUser.user.avatarURL)
			.setTimestamp()
			.setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
			
			msg.channel.send(embed);
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