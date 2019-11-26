"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = __importDefault(require("discord.js"));
const main_1 = require("../main");
const staticData_1 = require("../staticData");
const config_json_1 = require("../config.json");
const utils_1 = require("../utils");
const calculations_1 = require("../calculations");
exports.commands = [
    {
        name: 'profile',
        description: 'Shows the users profile.',
        execute(msg, args) {
            var user;
            //check if there is a mentioned arg.
            if (msg.mentions.members.size > 0) {
                user = msg.mentions.members.first();
            }
            else {
                user = msg.member;
            }
            //Get the users data from the database:
            var sql = `SELECT * FROM users WHERE user_id=${user.id};SELECT * FROM user_stats WHERE user_id='${user.id}';`;
            main_1.con.query(sql, function (err, results) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return;
                    }
                    if (results[0].length == 0) {
                        msg.channel.send("User is not registered.");
                        return;
                    }
                    var stats = yield calculations_1.getUserStats(user.id);
                    //Create an embedd with the profile data.
                    const embed = new discord_js_1.default.RichEmbed()
                        .setColor('#fcf403') //TODO: change maybe
                        .setTitle(`User profile: ${user.displayName}`)
                        .addField("Info:", `
				**Class:**
				**Level:**
				**Exp:**
				**${utils_1.capitalizeFirstLetter(config_json_1.currency_name)}:**
				`, true)
                        .addField(" ឵឵", `
				${staticData_1.classes.find(element => element.id.valueOf() == results[0][0].class_id).name}
				${results[1][0].level}
				${results[1][0].exp} / ${calculations_1.calculateReqExp(stats.level)}
				${results[1][0].currency}

				`, true)
                        .addBlankField(false)
                        .addField("Stats:", `
				**HP:**
				**ATK:**
				**DEF:**
				**ACC:**
				`, true)
                        .addField(" ឵឵", `
				${stats.hp} / ${stats.max_hp}
				${stats.total_atk}
				${stats.total_def}
				${stats.total_acc}
				`, true)
                        .setThumbnail(user.user.avatarURL)
                        .setTimestamp()
                        .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
                    msg.channel.send(embed);
                });
            });
        },
    },
    {
        name: 'register',
        description: 'Registers user!',
        execute(msg, args) {
            //Check if user already in database.
            main_1.con.query(`SELECT * FROM users WHERE user_id='${msg.author.id}'`, function (err, result) {
                if (result.length != 0) {
                    msg.reply("You have already registered.");
                    return;
                }
                //note: can only be executed in DM with the bot.
                if (msg.channel.type != 'dm') {
                    msg.reply("This command can only be executed in the DM with the bot.");
                    return;
                }
                const selectedClass = staticData_1.classes.find(element => element.name.toLowerCase() == args[0].toLowerCase());
                if (selectedClass == undefined) {
                    msg.reply("Did not find a class with that name.");
                    return;
                }
                var sql = `INSERT INTO users(user_id,class_id,datetime_joined) VALUES ('${msg.author.id}',${selectedClass.id},${main_1.con.escape(new Date())});` +
                    `INSERT INTO user_stats(user_id,current_hp) VALUES ('${msg.author.id}', ${selectedClass.base_hp});` +
                    `INSERT INTO user_equipment(user_id,main_hand,off_hand,head,chest,legs,feet,trinket) VALUES 
				('${msg.author.id}',${selectedClass.starting_item_main_hand},${selectedClass.starting_item_off_hand},
				${selectedClass.starting_item_head},${selectedClass.starting_item_chest},${selectedClass.starting_item_legs},
				${selectedClass.starting_item_feet},${selectedClass.starting_item_trinket});`;
                main_1.con.query(sql, (err, result) => {
                    if (err) {
                        msg.reply("An error occured while comminicating with the database, please try again. If the error persists please open a ticket.");
                        console.log(err);
                        return;
                    }
                    else {
                        msg.reply(`You have sucessfully registered as an ${utils_1.capitalizeFirstLetter(args[0].toLowerCase())}`);
                    }
                });
            });
        },
    }
];
function SetupCommands() {
    exports.commands.forEach(cmd => {
        main_1.client.commands.set(cmd.name, cmd);
        console.log("command: '" + cmd.name + "' Registered.");
    });
}
exports.SetupCommands = SetupCommands;
