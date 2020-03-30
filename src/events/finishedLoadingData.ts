import { CronJob } from "cron";
import cf from '../config.json';
import { DataManager } from "../classes/dataManager";
import { hpRegenTick, updateBotStatus } from "./generalEvents.js";
import { initializeWebhooks } from "../webhooks/webhooks.js";
import { client } from "../RPGThunder";
import DBL from "dblapi.js";

export async function onFinishedLoadingDataAndReady(this: any)
{
    console.log("Setting up CRON Jobs...");
    new CronJob("*/15 * * * *", hpRegenTick, undefined, true);
    !cf.DEVMODE ? new CronJob("*/15 * * * *",  DataManager.pushDatabaseUpdate, undefined, true, undefined, DataManager) : undefined;
    !cf.DEVMODE ? new CronJob("*/15 * * * *",  DataManager.activeLottery.updateMessage, undefined, true, undefined, DataManager, true) : undefined;
    new CronJob("0 */1 * * *", updateBotStatus, undefined, true, undefined, updateBotStatus, true);
    !cf.DEVMODE ? new CronJob("0 */1 * * *",  DataManager.syncroniseRanks, undefined, true, undefined, DataManager.syncroniseRanks, true) : undefined;
    !cf.DEVMODE ? new CronJob(DataManager.activeLottery.drawDate, DataManager.drawLottery, undefined, true, undefined, DataManager) : undefined;
    const dbl = new DBL(cf.topgg_token, client);
    !cf.DEVMODE ? new CronJob("0 */1 * * *", function() {dbl.postStats(client.guilds.size); console.log("Posting stats to top.gg");}, undefined, true, undefined, undefined, true) : undefined;
    console.log("Finished setting up CRON Jobs...");

    if (!cf.DEVMODE) initializeWebhooks();
}