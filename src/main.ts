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
import { SetupEvents } from './events/generalEvents.js';
import { onFinishedLoadingDataAndReady } from './events/finishedLoadingData.js';

export const client = new Discord.Client();
export const commands = new Discord.Collection<string,_command>();

main();

//this function starts up the bot and executes the initialization process in a chronologic order with callbacks.
async function main()
{
  //Load in and initialize all database data.
  console.log("Loading & Initializing database data...");
  await DataManager.initializeData();
  console.log("Finished Loading & Initializing database data.")
  setupAllCommands();
  SetupEvents();
  
  await client.login(cf.DEVMODE ? cf.dev_token : cf.official_token);
  //sets up the CRON jobs.
  onFinishedLoadingDataAndReady();
}

export function setupAllCommands()
{
  generalInfoCommands.SetupCommands();
  adminCommands.SetupCommands();
  userInfoCommands.SetupCommands();
  userActionCommands.SetupCommands();
  gambleCommands.SetupCommands();
  economyCommands.SetupCommands();
  professionCommands.SetupCommands();

  console.log(`Registered commands: ${commands.map(x => x.name).join(", ")}`);
}

