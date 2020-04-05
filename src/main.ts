import Discord from 'discord.js';
import * as cf from './config.json';
// import * as userActionCommands from "./commands/userActionCommands";
// import * as userInfoCommands from "./commands/userInfoCommands";
//import * as generalInfoCommands from "./commands/generalInfoCommands";
// import * as economyCommands from "./commands/economyCommands";
// import * as gambleCommands from "./commands/gamblingCommands";
// import * as adminCommands from "./commands/adminCommands";
// import * as professionCommands from "./commands/professionCommands";
// import { setupEvents } from './events/generalEvents';
import { CommandInterface } from './interfaces';
import { DataManager } from './classes/dataManager';
export const client = new Discord.Client();
export const commands: Discord.Collection<string, CommandInterface> = new Discord.Collection();
main();

//this function starts up the bot and executes the initialization process in a chronologic order with callbacks.
async function main()
{
  console.log("Shard instance initializing");

  console.log(DataManager.users.size);

  //Load in and initialize all database data.
  setupAllCommands();
  // setupEvents();
  
  await client.login(cf.DEVMODE ? cf.dev_token : cf.official_token);
}

export function setupAllCommands()
{
  //generalInfoCommands.SetupCommands();
  // adminCommands.SetupCommands();
  // userInfoCommands.SetupCommands();
  // userActionCommands.SetupCommands();
  // gambleCommands.SetupCommands();
  // economyCommands.SetupCommands();
  // professionCommands.SetupCommands();

  // console.log(`Registered commands: ${commands.map(x => x.name).join(", ")}`);
}

