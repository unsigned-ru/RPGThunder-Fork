import Discord from 'discord.js';
import mysql from 'mysql';
import {token,mysql_host,mysql_user, mysql_pass, mysql_dbname,prefix} from "./config.json"
import * as generalevents from "./events/generalevents";
import * as generalcommands from "./commands/generalcmds";
import * as usercommands from "./commands/usercmds";
import * as staticData from "./staticData";
import {_client, _command_cooldown} from "./interfaces";
export const client: _client = { c:new Discord.Client()};
client.commands = new Discord.Collection();

//Cooldowns
export var cooldowns :_command_cooldown[] = [];

//setup SQL connection as an export
export const con = mysql.createConnection({
  host: mysql_host,
  user: mysql_user,
  password: mysql_pass,
  database: mysql_dbname,
  multipleStatements: true
});

//Load static data from database
staticData.LoadStaticDatabaseData();

//Setup commands
generalcommands.SetupCommands();
usercommands.SetupCommands();

//Setup events
generalevents.SetupEvents();

client.c.login(token);