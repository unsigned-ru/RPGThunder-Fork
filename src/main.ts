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
import { SetupEvents, onFinishedLoadingDataAndReady as OnFinishedLoadingAndLoggedIn } from './events/events.js';

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
  OnFinishedLoadingAndLoggedIn();
}

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

  console.log(`Registered commands: ${commands.map(x => x.name).join(", ")}`);
}


// var url = require('url')
// var patreon = require('patreon')
// var patreonAPI = patreon.patreon
// var patreonOAuth = patreon.oauth

// // Use the client id and secret you received when setting up your OAuth account
// var CLIENT_ID = 'pppp'
// var CLIENT_SECRET = 'pppp'
// var patreonOAuthClient = patreonOAuth(CLIENT_ID, CLIENT_SECRET)

// // This should be one of the fully qualified redirect_uri you used when setting up your oauth account
// var redirectURL = 'http://mypatreonapp.com/oauth/redirect'

// function handleOAuthRedirectRequest(request, response) {
//     var oauthGrantCode = url.parse(request.url, true).query.code

//     patreonOAuthClient
//         .getTokens(oauthGrantCode, redirectURL)
//         .then(function(tokensResponse) {
//             var patreonAPIClient = patreonAPI(tokensResponse.access_token)
//             return patreonAPIClient('/current_user')
//         })
//         .then(function(result) {
//             var store = result.store
//             // store is a [JsonApiDataStore](https://github.com/beauby/jsonapi-datastore)
//             // You can also ask for result.rawJson if you'd like to work with unparsed data
//             response.end(store.findAll('user').map(user => user.serialize()))
//         })
//         .catch(function(err) {
//             console.error('error!', err)
//             response.end(err)
//         })
// }