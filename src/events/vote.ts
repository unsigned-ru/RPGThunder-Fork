import { DataManager } from "../classes/dataManager";
import { randomIntFromInterval, constructCurrencyString } from "../utils";
import Discord from 'discord.js';
import { client } from "../RPGThunder";

export async function onVote(userID: string)
{
    const u = client.users.cache.find((x: Discord.User) => x.id == userID);
    if (!u) return;
    const ud = DataManager.getUser(u.id);
    if (!ud) return u.send(`✨ Thank you for voting! ✨\n\nUnfortunately you could not receive a reward due to not being registered. Consider registering by using \`$register\``);
    ud.setCooldown('vote', 43200, true);
    const coins = randomIntFromInterval(2,20,true);
    ud.getCurrency(1).value += coins;
    const valor = 1;
    ud.getCurrency(2).value += valor;
    return u.send(`✨ Thank you for voting! ✨\n\nYou have received the following rewards:\n- ${constructCurrencyString(1,coins)}\n- ${constructCurrencyString(2,valor)}`);
}