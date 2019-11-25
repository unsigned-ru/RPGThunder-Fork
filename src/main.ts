import Discord from 'discord.js';
import mysql from 'mysql';
import {token,mysql_host,mysql_user, mysql_pass, mysql_dbname} from "./config.json";
import * as generalevents from "./events/generalevents";
import * as generalcommands from "./commands/generalcmds";
import * as usercommands from "./commands/usercmds";
//interfaces
interface Client {
  c: Discord.Client,
  [key: string]: any
}
export const client: Client = { c:new Discord.Client()};
client.commands = new Discord.Collection();

//setup SQL connection as an export
export const con = mysql.createConnection({
  host: mysql_host,
  user: mysql_user,
  password: mysql_pass,
  database: mysql_dbname,
  multipleStatements: true
});

//Setup commands
generalcommands.SetupCommands();
usercommands.SetupCommands();
//Setup events
generalevents.SetupEvents();

client.c.login(token);


//functions:
export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
