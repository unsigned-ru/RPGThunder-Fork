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
const config_json_1 = require("../config.json");
const staticData_1 = require("../staticData");
const utils_1 = require("../utils");
function SetupEvents() {
    console.log("Setting up events...");
    main_1.client.c.on('message', onMSGReceived);
    main_1.client.c.on('ready', onReady);
    main_1.client.c.on('guildMemberAdd', onUserJoin);
    console.log("Finished setting up events.");
}
exports.SetupEvents = SetupEvents;
function onReady() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Logged in as ${main_1.client.c.user.tag}!`);
        var countResult = (yield utils_1.queryPromise("SELECT COUNT(*) from users"));
        var registerCount = countResult[0][Object.keys(countResult[0])[0]];
        main_1.client.c.user.setActivity(`${config_json_1.prefix}help | ${registerCount} registered users on ${main_1.client.c.guilds.size} servers`);
    });
}
function onMSGReceived(msg) {
    //Check if it starts with required refix
    if (!msg.content.startsWith(config_json_1.prefix) || msg.author.bot)
        return;
    //Split args and execute command if it exists.
    const args = msg.content.slice(config_json_1.prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();
    if (!main_1.client.commands.has(command))
        return;
    try {
        main_1.client.commands.get(command).execute(msg, args);
    }
    catch (error) {
        console.error(error);
        msg.reply('there was an error trying to execute that command!');
    }
}
function onUserJoin(user) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (user == null)
                return;
            //TODO: change to count
            const result = yield utils_1.queryPromise(`SELECT * FROM users WHERE user_id='${user.id}`).catch(err => { throw err; });
            if (result.length != 0) {
                return;
            }
            var availableClassesNames = "";
            var availableClassesDescriptions = "";
            staticData_1.classes.forEach(element => {
                console.log();
                availableClassesNames += `**${element.name}**\n`;
                availableClassesDescriptions += `${element.description}\n`;
            });
            const embed = new discord_js_1.default.RichEmbed()
                .setColor('#fcf403')
                .setTitle(`Pssst ${user.displayName}...`)
                .setDescription(`**Welcome to _${user.guild.name}_! I happen to be in the server you just joined, and I can let you in on a great deal! Please hear me out!**`)
                .addField("📰 **Summary**", "I am a Bot that strives to bring interesting RPG elements into the discord servers I am in! The data across all servers is shared. " +
                "So if we meet again in another server, you'll maintain your class, level, currencies and so on. There are tons of activities to participate in!")
                .addField("👥 **Join us!**", "I'd be thrilled to recruit another adventurer with potential! Join the growing RPG community, become the strongest of them all and kick some ass!")
                .addField("❔ **'How?!'**", "I knew this question was coming so i went ahead and prepared for it! To join us you will have to create your character first. You can do so by choosing what class you'd like to be! " +
                "\n\n**When you have made up your mind simply execute the command: `" + config_json_1.prefix + "register [class]`**")
                .addField("⚔️ **Pick your poison!**", "Available classes:\n\n" +
                availableClassesNames, true)
                .addField(" ឵឵", " ឵឵\n\n" + availableClassesDescriptions, true)
                .setThumbnail('http://159.89.133.235/DiscordBotImgs/logo.png')
                .setTimestamp()
                .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
            user.send(embed);
        }
        catch (err) {
            console.log(err);
        }
    });
}
