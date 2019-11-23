"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("../main");
exports.commands = [
    {
        name: 'ping',
        description: 'Ping!',
        execute(msg, args) {
            msg.reply("pong!");
        },
    },
    {
        name: 'test',
        description: 'TestCommand!',
        execute(msg, args) {
            msg.channel.send('Test command registered.');
        },
    },
    {
        name: 'userjointest',
        description: 'TestCommand!',
        execute(msg, args) {
            msg.reply("emitting event...");
            main_1.client.c.emit("guildMemberAdd", msg.mentions.users.first());
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
