"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    user.sendMessage("This is a message you should receive when a server with this bot connected.");
}
