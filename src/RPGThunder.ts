import Discord from 'discord.js';
import * as cf from './config.json';
import * as userActionCommands from "./commands/userActionCommands";
import * as userInfoCommands from "./commands/userInfoCommands";
import * as generalInfoCommands from "./commands/generalInfoCommands";
import * as economyCommands from "./commands/economyCommands";
import * as gambleCommands from "./commands/gamblingCommands";
import * as adminCommands from "./commands/adminCommands";
import * as professionCommands from "./commands/professionCommands";
import { setupEvents } from './events/generalEvents';
import { CommandInterface } from './interfaces';
import { DataManager } from './classes/dataManager';
import { onFinishedLoadingDataAndReady } from './events/finishedLoadingData';
export const client = new Discord.Client({shards: "auto"});
export const commands: Discord.Collection<string, CommandInterface> = new Discord.Collection();
main();

//this function starts up the bot and executes the initialization process in a chronologic order with callbacks.
async function main()
{
  //load database data
  await DataManager.initializeData();

  //Load in and initialize all database data.
  setupAllCommands();
  setupEvents();
  
  await client.login(cf.DEVMODE ? cf.dev_token : cf.official_token);

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

