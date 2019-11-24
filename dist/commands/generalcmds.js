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
        name: 'jointest',
        description: 'TestCommand!',
        execute(msg, args) {
            msg.channel.send("emitting event...");
            main_1.client.c.emit("guildMemberAdd", msg.mentions.members.first());
        },
    },
    //TODO: Maybe add this in a seperate commandfile.
    {
        name: 'register',
        description: 'Registers user!',
        execute(msg, args) {
            //Check if user already in database.
            main_1.con.query(`SELECT * FROM users WHERE userID='${msg.author.id}'`, function (err, result) {
                if (result.length != 0) {
                    msg.reply("You have already registered.");
                    return;
                }
                //note: can only be executed in DM with the bot.
                if (msg.channel.type != 'dm') {
                    msg.reply("This command can only be executed in the DM with the bot.");
                    return;
                }
                var classID;
                switch (args[0].toLowerCase()) {
                    case "swordsman":
                        msg.reply("Creating your user as the swordsman class!");
                        classID = 1;
                        break;
                    case "archer":
                        msg.reply("Creating your user as the archer class!");
                        classID = 2;
                        break;
                    default:
                        msg.reply("Could not find a class with that name.");
                        return;
                }
                var insertUser = `INSERT INTO users(userID,classID,datetimeJoined) VALUES ('${msg.author.id}',${classID},${main_1.con.escape(new Date())});`;
                var insertStats = `INSERT INTO user_stats(userID) VALUES ('${msg.author.id}');`;
                main_1.con.query(insertUser, (err, result) => {
                    if (err) {
                        msg.reply("An error occured while comminicating with the database, please try again. If the error persists please open a ticket.");
                        console.log(err);
                        return;
                    }
                    main_1.con.query(insertStats, (err, result) => {
                        if (err) {
                            msg.reply("An error occured while comminicating with the database, please try again. If the error persists please open a ticket.");
                            console.log(err);
                            return;
                        }
                        var classStr = main_1.capitalizeFirstLetter(args[0].toLowerCase());
                        msg.reply("You have successfully registered as an " + classStr + " !");
                    });
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
