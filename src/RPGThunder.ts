import Discord from 'discord.js';
import cf from './config.json';
import { DataManager } from './classes/dataManager';
import { onFinishedLoadingDataAndReady } from './events/finishedLoadingData';

export const manager = new Discord.ShardingManager('./dist/main.js', {token: cf.DEVMODE ? cf.dev_token : cf.official_token});

main();
async function main()
{
    console.log("Main function running");
    console.log("Loading & Initializing database data...");
    await DataManager.initializeData();
    console.log("Finished Loading & Initializing database data.");

    manager.spawn();
    manager.on('launch', shard => console.log(`Launched shard ${shard.id}`));
    //sets up the CRON jobs.
    onFinishedLoadingDataAndReady();
}