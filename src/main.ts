import Discord from 'discord.js';
import mysql from 'mysql';
import {token} from "./config.json";
import * as generalevents from "./events/generalevents";
import * as generalcommands from "./commands/generalcmds";

//interfaces
interface Client {
  c: Discord.Client,
  [key: string]: any
}

export const client: Client = { c:new Discord.Client()};
client.commands = new Discord.Collection();

//Setup commands
generalcommands.SetupCommands();
//Setup events
generalevents.SetupEvents();

client.c.login(token);