"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = __importDefault(require("discord.js"));
const main_1 = require("../main");
exports.commands = [
    {
        name: 'profile',
        description: 'Shows the users profile.',
        execute(msg, args) {
            var user;
            //check if there is a mentioned arg.
            var usingMention = false;
            if (msg.mentions.members.size > 0) {
                user = msg.mentions.members.first();
            }
            else {
                user = msg.member;
            }
            //Get the users data from the database:
            var sql = `SELECT * FROM users WHERE user_id=${user.id};SELECT * FROM user_stats WHERE user_id='${user.id}';`;
            main_1.con.query(sql, function (err, results) {
                console.log(results);
                if (err) {
                    return;
                }
                if (results[0].length == 0) {
                    msg.channel.sendMessage("User is not registered.");
                    return;
                }
                //Create an embedd with the profile data.
                const embed = new discord_js_1.default.RichEmbed()
                    .setColor('#fcf403') //TODO: change maybe
                    .setTitle(`User profile: ${user.displayName}`)
                    .addField("Info:", `
				**Class:**
				**Level:**
				**Exp:**
				`, true)
                    .addField(" ឵឵", `
				${results[0][0].class_id}
				${results[1][0].level}
				${results[1][0].exp}

				`, true)
                    .addBlankField(false)
                    .addField("Stats:", `
				**HP:**
				`, true)
                    .addField(" ឵឵", `
				${results[1][0].current_hp}

				`, true)
                    .setThumbnail(user.user.avatarURL)
                    .setTimestamp()
                    .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
                msg.channel.send(embed);
            });
        },
    },
];
function SetupCommands() {
    exports.commands.forEach(cmd => {
        main_1.client.commands.set(cmd.name, cmd);
        console.log("command: '" + cmd.name + "' Registered.");
    });
}
exports.SetupCommands = SetupCommands;
