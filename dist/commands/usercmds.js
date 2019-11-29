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
        description: 'Shows a user profile containing their class, stats and equipment.',
        usage: `${config_json_1.prefix}profile [optional: @User]`,
        execute(msg, args) {
            return __awaiter(this, void 0, void 0, function* () {
                var user;
                //check if there is a mentioned arg.
                if (msg.mentions.members.size > 0) {
                    user = msg.mentions.members.first();
                }
                else {
                    user = msg.member;
                }
                //Get UserData
                try {
                    var data = yield calculations_1.getUserData(user.id).catch(err => { throw err; });
                    console.log(data);
                    //Create an embedd with the profile data.
                    const embed = new discord_js_1.default.RichEmbed()
                        .setColor('#fcf403') //Yelow
                        .setTitle(`User profile: ${user.displayName}`)
                        .addField("Info:", `
				**Class:**
				**Level:**
				**Exp:**
				**${utils_1.capitalizeFirstLetter(config_json_1.currency_name)}:**
				`, true)
                        .addField(" ឵឵", `
				${data.class.name}
				${data.level}
				${data.exp} / ${calculations_1.calculateReqExp(data.level)}
				${data.currency}

				`, true)
                        .addBlankField(false)
                        .addField("Stats:", `
				**HP:**
				**ATK:**
				**DEF:**
				**ACC:**
				`, true)
                        .addField(" ឵឵", `
				${data.current_hp} / ${data.max_hp}
				${data.total_atk}
				${data.total_def}
				${data.total_acc}
				`, true)
                        .addBlankField(false)
                        .addField("Equipment:", `
				**Main Hand:**
				**Off Hand:**
				**Head:**
				**Chest:**
				**Legs:**
				**Feet:**
				**Trinket:**
				`, true)
                        .addField(" ឵឵", `
				${data.main_hand == null ? "None" : data.main_hand.name}
				${data.off_hand == null ? "None" : data.off_hand.name}
				${data.head == null ? "None" : data.head.name}
				${data.chest == null ? "None" : data.chest.name}
				${data.legs == null ? "None" : data.legs.name}
				${data.feet == null ? "None" : data.feet.name}
				${data.trinket == null ? "None" : data.trinket.name}
				`, true)
                        .setThumbnail(user.user.avatarURL)
                        .setTimestamp()
                        .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
                    msg.channel.send(embed);
                }
                catch (err) {
                    msg.channel.send(err);
                }
            });
        },
    },
    {
        name: 'register',
        description: 'Registers a user!',
        usage: `${config_json_1.prefix}register [class]`,
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
    },
    {
        name: 'inventory',
        description: 'Lists all items in your inventory and their respective ids.',
        usage: `${config_json_1.prefix}inventory`,
        execute(msg, args) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const userCountResult = (yield utils_1.queryPromise(`SELECT COUNT(*) FROM users WHERE user_id=${msg.author.id}`).catch(err => { throw err; }))[0];
                    const userCount = userCountResult[Object.keys(userCountResult)[0]];
                    if (userCount == 0) {
                        throw "You must be registered to view your inventory.";
                    }
                    const inv = yield calculations_1.getInventory(msg.author.id);
                    var invString = "";
                    var infoString = "";
                    inv.forEach(item => {
                        invString += `${item.name}\n`;
                        var slotname = staticData_1.equipment_slots.find(slot => slot.id == item.slot).name;
                        var qualityName = staticData_1.item_qualities.find(quality => quality.id == item.quality).name;
                        infoString += `${qualityName} ${slotname} [id:${item.id}]\n`;
                    });
                    const embed = new discord_js_1.default.RichEmbed()
                        .setColor('#fcf403') //Yelow
                        .setTitle(`User inventory: ${msg.member.displayName}`)
                        .addField("Items:", invString, true)
                        .addField(" ឵឵", infoString, true)
                        .setThumbnail(msg.author.avatarURL)
                        .setTimestamp()
                        .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
                    msg.channel.send(embed);
                }
                catch (err) {
                    msg.channel.send(err);
                }
            });
        },
    },
    {
        name: 'itemdata',
        description: 'Shows all the information about an item.',
        usage: `${config_json_1.prefix}itemdata [itemID1], [itemID[2], ...`,
        execute(msg, args) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    if (args.length == 0 || parseInt(args[0]) == undefined) {
                        throw "Please enter a valid id.";
                    }
                    const item = yield calculations_1.getItemData(parseInt(args[0]));
                    const embed = new discord_js_1.default.RichEmbed()
                        .setColor('#fcf403') //Yelow
                        .setTitle(`Item #${item.id}: ${item.name}`)
                        .addField("Desciption:", item.description)
                        .addField("Info:", `
				**Quality:**
				**Slot:**
				**Type:**
				**Level Req:**
				`, true)
                        .addField(" ឵឵", `
				${staticData_1.item_qualities.find(quality => quality.id == item.quality).name}
				${staticData_1.equipment_slots.find(slot => slot.id == item.slot).name}
				${staticData_1.item_types.find(type => type.id == item.type).name}
				${item.level_req}
				`, true)
                        .addBlankField()
                        .addField("Stats:", `
				**ATK:**
				**DEF:**
				**ACC:**
				`, true)
                        .addField(" ឵឵", `
				${item.atk}
				${item.def}
				${item.acc}
				`, true)
                        .setThumbnail("http://159.89.133.235/DiscordBotImgs/logo.png")
                        .setTimestamp()
                        .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
                    msg.channel.send(embed);
                }
                catch (err) {
                    msg.channel.send(err);
                }
            });
        },
    },
    {
        name: 'equip',
        description: 'Equips an item or a set of items from your inventory.',
        usage: `${config_json_1.prefix}equip [itemID1] [itemID[2] ...`,
        execute(msg, args) {
            return __awaiter(this, void 0, void 0, function* () {
                var sucess_output = "";
                try {
                    //Turn args into numbers and add them to array
                    var already_equipped_slots = [];
                    var item_ids = [];
                    //check if there are args
                    if (args.length == 0) {
                        throw "Please enter the ids of the items you wish to equip.";
                    }
                    for (var arg of args) {
                        var id = parseInt(arg);
                        if (id != undefined) {
                            item_ids.push(id);
                        }
                        else
                            throw "One of the id's you entered was invallid.";
                    }
                    //Check if the user is registered.
                    const userCountResult = (yield utils_1.queryPromise(`SELECT COUNT(*) FROM users WHERE user_id=${msg.author.id}`))[0];
                    const userCount = userCountResult[Object.keys(userCountResult)[0]];
                    if (userCount == 0) {
                        throw "You must be registered to equip an item.";
                    }
                    //Get the users class
                    const userResult = yield utils_1.queryPromise(`SELECT class_id FROM users WHERE user_id=${msg.author.id}`);
                    const selectedClass = staticData_1.classes.find(x => x.id == userResult[0].class_id);
                    //Iterate over each item_id
                    for (var item_id of item_ids) {
                        //Check if user has the item in inventory.
                        const itemCountResult = (yield utils_1.queryPromise(`SELECT COUNT(*) FROM user_inventory WHERE item=${item_id} AND user_id=${msg.author.id}`))[0];
                        if (itemCountResult[Object.keys(itemCountResult)[0]] == 0) {
                            throw "You do not own an item with the id: " + item_id;
                        }
                        //get the item's data.
                        const item = yield calculations_1.getItemData(item_id);
                        const slot = staticData_1.equipment_slots.find(slot => slot.id == item.slot);
                        //check if the user has already equipped an item of that slot
                        if (already_equipped_slots.includes(item.slot)) {
                            throw "You have already equipped an item in the slot: " + slot.name;
                        }
                        //check if the users level is high enough
                        const currentLevel = (yield utils_1.queryPromise(`SELECT level FROM user_stats WHERE user_id=${msg.author.id}`))[0].level;
                        if (item.level_req > currentLevel) {
                            throw "You are not high enough level to equip item with id: " + item_id;
                        }
                        //check if the user is allowed to wear this type.
                        if (!selectedClass.allowed_item_types.split(",").includes(item.type.toString())) {
                            throw `You cannot equip item with id: ${item_id} because you class is not allowed to wear the type: ${staticData_1.item_types.find(type => type.id == item.type).name}.`;
                        }
                        //convert the slot to a query string for table user_equipment.
                        var slotQueryString;
                        switch (slot.name.toLowerCase()) {
                            case "main hand":
                                slotQueryString = "main_hand";
                                break;
                            case "off hand":
                                slotQueryString = "off_hand";
                                break;
                            case "head":
                                slotQueryString = "head";
                                break;
                            case "chest":
                                slotQueryString = "chest";
                                break;
                            case "legs":
                                slotQueryString = "legs";
                                break;
                            case "feet":
                                slotQueryString = "feet";
                                break;
                            case "trinket":
                                slotQueryString = "trinket";
                                break;
                            default:
                                throw "Error with finding correct equipment slot. Please contact an admin or open a ticket.";
                        }
                        //put the previous equipped item in the inventory.
                        const currentItem = (yield utils_1.queryPromise(`SELECT ${slotQueryString} FROM user_equipment WHERE user_id=${msg.author.id};`))[0];
                        const current_item_id = currentItem[Object.keys(currentItem)[0]];
                        if (current_item_id != null || current_item_id != undefined) {
                            yield utils_1.queryPromise(`INSERT INTO user_inventory (user_id, item) VALUES ('${msg.author.id}', ${current_item_id})`);
                        }
                        //Equip the new item in the correct slot.
                        yield utils_1.queryPromise(`UPDATE user_equipment SET ${slotQueryString}=${item.id} WHERE user_id=${msg.author.id};`);
                        //Remove the equipped item from inventory.
                        yield utils_1.queryPromise(`DELETE FROM user_inventory WHERE user_id=${msg.author.id} AND item=${item.id} LIMIT 1`);
                        //add the equipped type to already_equipped_slots.
                        already_equipped_slots.push(item.slot);
                        console.log("ding end");
                        sucess_output += `You have sucessfully equipped: ${item.name} in the slot: ${slot.name}!\n`;
                    }
                    console.log("test");
                    msg.channel.send(sucess_output);
                }
                catch (err) {
                    console.log(err);
                    msg.channel.send(sucess_output + err);
                }
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
