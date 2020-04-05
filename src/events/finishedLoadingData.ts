import { CronJob } from "cron";
import cf from '../config.json';
import { DataManager } from "../classes/dataManager";
import { initializeWebhooks } from "../webhooks/webhooks.js";
import DBL from "dblapi.js";
import { manager } from "../RPGThunder";

export async function onFinishedLoadingDataAndReady(this: any)
{
    console.log("Setting up CRON Jobs...");
    new CronJob("*/15 * * * *", DataManager.hpRegenTick, undefined, true, undefined, DataManager.hpRegenTick);
    !cf.DEVMODE ? new CronJob("*/15 * * * *",  DataManager.pushDatabaseUpdate, undefined, true, undefined, DataManager.pushDatabaseUpdate) : undefined;
    !cf.DEVMODE ? new CronJob("*/15 * * * *",  DataManager.activeLottery.updateMessage, undefined, true, undefined, DataManager.activeLottery.updateMessage, true) : undefined;
    new CronJob("0 */1 * * *", DataManager.updateBotStatus, undefined, true, undefined,  DataManager.updateBotStatus, true);
    !cf.DEVMODE ? new CronJob("0 */1 * * *",  DataManager.syncroniseRanks, undefined, true, undefined, DataManager.syncroniseRanks, true) : undefined;
    !cf.DEVMODE ? new CronJob(DataManager.activeLottery.drawDate, DataManager.drawLottery, undefined, true, undefined, DataManager) : undefined;
    const dbl = new DBL(cf.topgg_token);
    !cf.DEVMODE ? new CronJob("0 */1 * * *", async function() {dbl.postStats((await manager.fetchClientValues("guilds.size")).reduce((total, cv) => total+cv,0)); console.log("Posting stats to top.gg");}, undefined, true, undefined, undefined, true) : undefined;
    console.log("Finished setting up CRON Jobs...");

    if (!cf.DEVMODE) initializeWebhooks();
}