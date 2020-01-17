import Discord from 'discord.js';
import mongo from 'mongodb'
import * as cf from './config.json'
import { DataManager } from './dataManager.js';
import * as userActionCommands from "./commands/userActionCommands"
import * as statisticCommands from "./commands/statisticCommands"
import * as generalCommands from "./commands/generalCommands"
import * as generalEvents from "./events/generalEvents"


export const client = new Discord.Client();
export const commands = new Discord.Collection<string,any>();

DataManager.initializeData();

setupCommands();


//log in
client.login(cf.token);

function setupCommands()
{
  generalCommands.SetupCommands();
  statisticCommands.SetupCommands();
  userActionCommands.SetupCommands();
  generalEvents.SetupEvents();
  
}