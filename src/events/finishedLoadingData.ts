import { CronJob } from "cron";
import cf from '../config.json';
import { DataManager } from "../classes/dataManager";
import { hpRegenTick, updateBotStatus } from "./generalEvents.js";
import { initializeWebhooks } from "../webhooks/webhooks.js";

export function onFinishedLoadingDataAndReady()
{
    console.log("Setting up CRON Jobs...");
    new CronJob("*/15 * * * *", hpRegenTick, undefined, true);
    !cf.DEVMODE ? new CronJob("*/15 * * * *", DataManager.pushDatabaseUpdate, undefined, true, undefined, DataManager) : undefined;
    !cf.DEVMODE ? new CronJob("*/15 * * * *", DataManager.activeLottery.updateMessage, undefined, true, undefined, DataManager, true) : undefined;
    new CronJob("0 */1 * * *", updateBotStatus, undefined, true, undefined, updateBotStatus, true);
    new CronJob(DataManager.activeLottery.drawDate, DataManager.drawLottery, undefined, true, undefined, DataManager);
    console.log("Finished setting up CRON Jobs...");

    if (!cf.DEVMODE) initializeWebhooks();
}