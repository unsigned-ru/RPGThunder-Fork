"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("../main");
const calculations_1 = require("../calculations");
exports.commands = [
    {
        name: 'ping',
        description: 'Ping!',
        execute(msg, args) {
            msg.reply("pong!");
        },
    },
    {
        name: 'jointest',
        description: 'TestCommand!',
        execute(msg, args) {
            msg.channel.send("emitting event...");
            main_1.client.c.emit("guildMemberAdd", msg.mentions.members.first());
        },
    },
    {
        name: 'stattest',
        description: 'TestCommand!',
        execute(msg, args) {
            calculations_1.getUserStats(msg.author.id);
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
