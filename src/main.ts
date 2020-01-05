import Discord from 'discord.js';
import mysql from 'mysql';
import {token,mysql_host,mysql_user, mysql_pass, mysql_dbname, top_gg_api_key, webhook_authentication} from "./config.json"
//cmds and events
import * as generalevents from "./events/generalevents";
import * as generalcommands from "./commands/generalcmds";
import * as userinfocommands from "./commands/userinfocmds";
import * as useractioncommands from "./commands/useractioncmds";
import * as gathercommands from "./commands/gathercmds";
import * as shopcommands from "./commands/shopcmds";
import * as gamblecommands from "./commands/gamblecmds";
import * as admincommands from "./commands/admincmds";
import * as craftingcommands from "./commands/craftingcmds";
import * as staticData from "./staticdata";
import * as webhooks from "./events/webhooks";
import {_client, _command_cooldown} from "./interfaces";
import { BlackJackSession } from './classes/blackjacksession.js';
import { ZoneBossSession } from './classes/zoneBossSession.js';

export const client: _client = { c:new Discord.Client(), commands: new Discord.Collection()};

//Cooldowns
export var gather_commands_cooldown : Discord.Collection<string,Date> = new Discord.Collection();
export var explore_command_cooldown : Discord.Collection<string,Date> = new Discord.Collection();
export var zoneBoss_command_cooldown: Discord.Collection<string,Date> = new Discord.Collection();
export var rest_command_cooldown: Discord.Collection<string,Date> = new Discord.Collection();
export var traveling : Discord.Collection<string,Date> = new Discord.Collection();
export var coinflip_cooldown : Discord.Collection<string,Date> = new Discord.Collection();



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
craftingcommands.SetupCommands();

//Register webhooks
const DBL = require("dblapi.js");
export const dbl = new DBL(top_gg_api_key, { webhookPort: 5000, webhookAuth: webhook_authentication },client.c);

//Setup events
generalevents.SetupEvents();
webhooks.setupEvents();


//log in
client.c.login(token);