import Discord from 'discord.js';
import * as cf from './config.json'
import { DataManager } from './classes/dataManager.js';

import * as userActionCommands from "./commands/userActionCommands"
import * as userInfoCommands from "./commands/userInfoCommands"
import * as generalInfoCommands from "./commands/generalInfoCommands"
import * as economyCommands from "./commands/economyCommands"
import * as gambleCommands from "./commands/gamblingCommands"
import * as adminCommands from "./commands/adminCommands"
import * as professionCommands from "./commands/professionCommands"

import { _command } from './interfaces.js';


export const client = new Discord.Client();
export const commands = new Discord.Collection<string,_command>();

//calls setup events and setup all commands when finished loading in data.
DataManager.initializeData();


client.login(cf.DEVMODE ? cf.dev_token : cf.official_token);

//Register webhooks
const DBL = require("dblapi.js");
export const dbl = cf.DEVMODE ? undefined : new DBL(cf.topgg_token, { webhookPort: 5000, webhookAuth: cf.topgg_webhook },client);

export function setupAllCommands()
{
  generalInfoCommands.SetupCommands();
  adminCommands.SetupCommands();
  userInfoCommands.SetupCommands();
  userActionCommands.SetupCommands();
  gambleCommands.SetupCommands();
  economyCommands.SetupCommands();
  professionCommands.SetupCommands();
}