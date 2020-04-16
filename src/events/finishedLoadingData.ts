import { CronJob } from "cron";
import cf from '../config.json';
import { DataManager } from "../classes/dataManager";
import DBL from "dblapi.js";
import { client } from "../RPGThunder";
import { initializeWebhooks } from "../webhooks/webhooks";

export async function onFinishedLoadingDataAndReady(this: any)
{
    console.log("Setting up CRON Jobs...");
    new CronJob("*/15 * * * *", DataManager.hpRegenTick, undefined, true, undefined, DataManager);
    !cf.DEVMODE ? new CronJob("*/15 * * * *",  DataManager.pushDatabaseUpdate, undefined, true, undefined, DataManager) : undefined;
    !cf.DEVMODE ? new CronJob("*/15 * * * *",  DataManager.activeLottery.updateMessage, undefined, true, undefined, DataManager.activeLottery, true) : undefined;
    new CronJob("0 */1 * * *", DataManager.updateBotStatus, undefined, true, undefined,  DataManager.updateBotStatus, true);
    !cf.DEVMODE ? new CronJob("0 */1 * * *",  DataManager.syncroniseRanks, undefined, true, undefined, DataManager.syncroniseRanks, true) : undefined;
    !cf.DEVMODE ? new CronJob(DataManager.activeLottery.drawDate, DataManager.drawLottery, undefined, true, undefined, DataManager) : undefined;
    const dbl = new DBL(cf.topgg_token);
    !cf.DEVMODE ? new CronJob("0 */1 * * *", async function() {dbl.postStats(client.guilds.cache.size); console.log("Posting stats to top.gg");}, undefined, true, undefined, undefined, true) : undefined;
    console.log("Finished setting up CRON Jobs...");

    if (!cf.DEVMODE) initializeWebhooks();
}