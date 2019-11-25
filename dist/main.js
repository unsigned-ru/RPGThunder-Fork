"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = __importDefault(require("discord.js"));
const mysql_1 = __importDefault(require("mysql"));
const config_json_1 = require("./config.json");
const generalevents = __importStar(require("./events/generalevents"));
const generalcommands = __importStar(require("./commands/generalcmds"));
const usercommands = __importStar(require("./commands/usercmds"));
exports.client = { c: new discord_js_1.default.Client() };
exports.client.commands = new discord_js_1.default.Collection();
//setup SQL connection as an export
exports.con = mysql_1.default.createConnection({
    host: config_json_1.mysql_host,
    user: config_json_1.mysql_user,
    password: config_json_1.mysql_pass,
    database: config_json_1.mysql_dbname,
    multipleStatements: true
});
//Setup commands
generalcommands.SetupCommands();
usercommands.SetupCommands();
//Setup events
generalevents.SetupEvents();
exports.client.c.login(config_json_1.token);
//functions:
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
exports.capitalizeFirstLetter = capitalizeFirstLetter;
