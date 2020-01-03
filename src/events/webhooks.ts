import Discord from 'discord.js'
import {client, dbl} from '../main';
import { isRegistered, editCollectionNumberValue, randomIntFromInterval, getCurrencyIcon, getCurrencyDisplayName } from '../utils';
import { userDataModules, UserData, currencyModule } from '../classes/userdata';
import { consumables } from '../staticdata';

export function setupEvents()
{
    dbl.webhook.on('ready', (hook:any) => {
        console.log(`top.gg webhook is running.`);
      });
      
      dbl.webhook.on('vote', onVote);
}

async function onVote(vote:any)
{
    try
    {
        var user = client.c.users.get(vote.user)!;
        if (!user) return;
        if (!await isRegistered(vote.user)) return user.send(`✨ Thank you for voting! ✨\n\nUnfortunately you could not receive a reward due to not being registered. Concider registering by using \`$register\``);

        const [currencyMod] = <[currencyModule]> await new UserData(user.id, [userDataModules.currencies]).init();
        editCollectionNumberValue(currencyMod.currencies,"valor",+2);
        var coins = randomIntFromInterval(100,300)
        editCollectionNumberValue(currencyMod.currencies,"coins",coins);
        UserData.addConsumable(user.id,undefined,1,1);
        currencyMod.update(user.id);
        var cons = consumables.get(1)!;
        return user.send(`✨ Thank you for voting! ✨\n\nYou have received the following rewards:\n- ${getCurrencyIcon("valor")} 2 ${getCurrencyDisplayName("valor")}\n- ${getCurrencyIcon("coins")} ${coins} ${getCurrencyDisplayName("coins")}\n- 1x ${cons.icon_name} ${cons.name}`);

    }
    catch(err)
    {
        console.log(err);
    }
    
}