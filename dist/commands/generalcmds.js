"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("../main");
const config_json_1 = require("../config.json");
exports.commands = [
    {
        name: 'ping',
        description: 'Ping! Pong?! Wait what is this? ',
        usage: `${config_json_1.prefix}ping`,
        execute(msg, args) {
            msg.reply("pong!");
        },
    },
    {
        name: 'jointest',
        description: 'TestCommand!',
        usage: `${config_json_1.prefix}jointest [@User]`,
        execute(msg, args) {
            msg.channel.send("emitting event...");
            main_1.client.c.emit("guildMemberAdd", msg.mentions.members.first());
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
