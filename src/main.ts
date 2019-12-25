import Discord from 'discord.js';
import mysql from 'mysql';
import {token,mysql_host,mysql_user, mysql_pass, mysql_dbname} from "./config.json"
//cmds and events
import * as generalevents from "./events/generalevents";
import * as generalcommands from "./commands/generalcmds";
import * as userinfocommands from "./commands/userinfocmds";
import * as useractioncommands from "./commands/useractioncmds";
import * as gathercommands from "./commands/gathercmds";
import * as shopcommands from "./commands/shopcmds";
import * as gamblecommands from "./commands/gamblecmds";
import * as admincommands from "./commands/admincmds"
import * as staticData from "./staticdata";
import {_client, _command_cooldown} from "./interfaces";
import { BlackJackSession } from './classes/blackjacksession.js';
import { ZoneBossSession } from './classes/zoneBossSession.js';

export const client: _client = { c:new Discord.Client(), commands: new Discord.Collection()};

//Cooldowns
export var gather_commands_cooldown :_command_cooldown[] = []; //TODO: change system
export var explore_command_cooldown :_command_cooldown[] = []; //TODO: change system
export var zoneBoss_command_cooldown :_command_cooldown[] = []; //TODO: change system
export var rest_command_cooldown :_command_cooldown[] = []; //TODO: change system

export var blackjackSessions :BlackJackSession[] = [];
export var zoneBossSessions :ZoneBossSession[] = []

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
userinfocommands.SetupCommands();
useractioncommands.SetupCommands();
gathercommands.SetupCommands();
shopcommands.SetupCommands();
gamblecommands.SetupCommands();
admincommands.SetupCommands();


//Setup events
generalevents.SetupEvents();

//log in
client.c.login(token);