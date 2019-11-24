"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = __importDefault(require("discord.js"));
const main_1 = require("../main");
const config_json_1 = require("../config.json");
function SetupEvents() {
    console.log("Setting up events...");
    main_1.client.c.on('message', onMSGReceived);
    main_1.client.c.on('ready', onReady);
    main_1.client.c.on('guildMemberAdd', onUserJoin);
}
exports.SetupEvents = SetupEvents;
function onReady() {
    console.log(`Logged in as ${main_1.client.c.user.tag}!`);
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
    if (user == null)
        return;
    //send user a welcome message and some information in an embedd
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
        "**Swordsman**\n" +
        "**Archer**", true)
        .addField(" ឵឵", " ឵឵\n\n" +
        "Summary of swordsman\n" +
        "Summary of archer", true)
        .setThumbnail('https://i.imgur.com/wSTFkRM.png')
        .setImage('https://i.imgur.com/wSTFkRM.png')
        .setTimestamp()
        .setFooter("Catch phrase!", 'https://i.imgur.com/wSTFkRM.png');
    user.send(embed);
}
