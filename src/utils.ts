import cf from './config.json';
import Discord from 'discord.js'
import { DataManager } from './classes/dataManager.js';
import { _anyItem, _equipmentItem, MaterialItem, ConsumableItem, anyItem, _materialItem, _consumableItem, EquipmentItem, _item } from './classes/items.js';
import { User } from './classes/user.js';
import { _currency } from './interfaces.js';
import { Ability } from './classes/ability.js';
import { Actor } from './classes/actor.js';
import https from 'https';

let numberIconArray = [':zero:', ':one:', ':two:', ':three:', ':four:', ':five:', ':six:', ':seven:', ':eight:', ':nine:']

export function randomIntFromInterval(min:number, max:number, rounded?:boolean) :number 
{
  let result = Math.floor(Math.random() * ((max*100) - (min*100) + 1) + (min*100))/100;
  if (rounded) result = Math.round(result);
  return result;
}

export function clamp(number:number,min:number, max:number) 
{
  return Math.min(Math.max(number, min), max);
}

export function getTotalWeightForLevel(lvl: number) 
{ 
  return (cf.stats.base.atk + ((lvl-1)*cf.stats.increase.atk)) + ((cf.stats.base.def + ((lvl-1)*cf.stats.increase.def)) /2) + ((((cf.stats.base.acc + ((lvl-1)*cf.stats.increase.acc)) / (lvl *10)) - 0.85) * (0.5 * (cf.stats.base.atk + ((lvl-1)*cf.stats.increase.atk)))); 
}

export function getAccFromLevelWeight(lvl:number, weight: number, multiplier = 1)
{
  return weight / ((((((8.5 * lvl)+1) / (lvl *10)) - 0.85) * (0.5 * ((cf.stats.base.atk + ((lvl-1) * cf.stats.increase.atk) * multiplier)))) - ((((8.5 * lvl) / (lvl *10)) - 0.85) * (0.5 * (cf.stats.base.atk + ((lvl-1) * cf.stats.increase.atk) * multiplier))));
}
export function round(n:number)
{
  return +n.toFixed(2);
}

export function groupArrayBy(array:any[], key:string) 
{
  let coll: Discord.Collection<any,any[]> = new Discord.Collection();

  for (let e of array)
  {
    if (coll.has(e[key])) coll.get(e[key])!.push(e);
    else coll.set(e[key], [e]);
  }
  return coll;
}

export const enum CC {
  GeneralInfo = "📰 **General Info** 📰",
  UserInfo = "⚙️ **User Info** ⚙️",
  Equipment = "<:leatherhelmet:655930882615410699> **Equipment** <:linenpointedhat:658715049212248111>",
  Cooldowns = "🕙 **Cooldowns** 🕙",
  Gambling = "🎲 **Gambling** 🎲",
  Fighting = "⚔️ **Fighting** ⚔️",
  Economy = "💰 Economy 💰",
  Professions = "🔥 Professions ⛏️",

  hidden = -1
}

export const enum colors {
  green = "#00ff04",
  yellow = "#fcf403",
  red = "#ff0000",
  purple = "#5e03fc",
  black = "#000000"
}

export function formatTime(ms:number) :string
{
  if (ms / 2.628e+9 >= 1) return `${Math.round(ms / 2.628e+9)} month(s)`;
  else if (ms / 6.048e+8 >= 1) return `${Math.round(ms / 6.048e+8)} week(s)`;
  else if (ms / 8.64e+7 >= 1) return `${Math.round(ms / 8.64e+7)} day(s)`;
  else if (ms / 3.6e+6 >= 1) return `${Math.round(ms / 3.6e+6)} hour(s)`;
  else if (ms / 60000 >= 1) return `${Math.round(ms / 60000)} minute(s)`;
  else return `${Math.ceil(ms / 1000)} second(s)`;
}

export function getServerPrefix(msg: Discord.Message) { return DataManager.serverPrefixes.has(msg.guild.id) ? DataManager.serverPrefixes.get(msg.guild.id)! : '$'; }

export function getItemAndAmountFromArgs(args:string[], user?: User)
{
  let item :_anyItem |undefined;
  let amount = 1;
  let errormessage;
  if (!isNaN(+args[0]))
  {
    item = DataManager.getItem(+args.splice(0, 1)[0]);
    if (!isNaN(+args[args.length -1])) amount = +args[args.length -1];
    else if (item && args[args.length -1] && (args[args.length -1].toLowerCase() == "all" || args[args.length -1].toLowerCase() == "full") && user) 
    {
      amount = (user.inventory.find(x => x.id == item?._id) as MaterialItem | ConsumableItem)?.amount; 
    }
    if (!item) errormessage = `Could not find a item with id: \`${args[0]}\``
  } 
  else 
  { 
    let full = false;
    args = args.map(x => x.trim());
    if (!isNaN(+args[args.length-1])) amount = +args.splice(args.length-1,1);
    else if (args[args.length -1] && (args[args.length -1].toLowerCase() == "all" || args[args.length -1].toLowerCase() == "full"))
    {
      //full or all is passed, enable boolean
      args.splice(args.length -1,1);
      full = true;
    }
    item = DataManager.getItemByName(args.join(" ").toLowerCase()); 
    if (full && item && user) amount = (user.inventory.find(x => x.id == item?._id) as MaterialItem | ConsumableItem).amount;
    if (!item) errormessage = `Could not find a item with name: \`${args.join(" ")}\``;
  }
  if (!amount) amount = 1;
  return {item: item, amount: amount, errormsg: errormessage}
}
export function getCurrencyAndAmountFromArgs(args:string[], user: User)
{
  let currency : _currency | undefined;
  let amount = 1;
  let errormessage;
  if (!isNaN(+args[0]))
  {
    currency = DataManager.getCurrency(+args.splice(0, 1)[0]);
    if (!isNaN(+args[args.length -1])) amount = +args[args.length -1];
    else if (currency && args[args.length -1] && (args[args.length -1].toLowerCase() == "all" || args[args.length -1].toLowerCase() == "full")) 
    {
      amount = user.getCurrency(currency._id).value; 
    }
    if (!currency) errormessage = `Could not find a currency with id: \`${args[0]}\``
  } 
  else 
  { 
    let full = false;
    args = args.map(x => x.trim());
    if (!isNaN(+args[args.length-1])) amount = +args.splice(args.length-1,1);
    else if (args[args.length -1] && (args[args.length -1].toLowerCase() == "all" || args[args.length -1].toLowerCase() == "full"))
    {
      //full or all is mentioned, enable boolean
      args.splice(args.length -1,1);
      full = true;
    }
    currency = DataManager.currencies.find(x => x.name.toLowerCase() == args.join(" ").toLowerCase())
    if (full && currency) amount = user.getCurrency(currency._id).value; 
    if (!currency) errormessage = `Could not find a currency with name: \`${args.join(" ")}\``;
  }
  if (!amount) amount = 1;
  return {currency: currency, amount: amount, errormsg: errormessage}
}

export function constructWarningMessageForItem(item: _anyItem, user: User)
{
  let warningMessage = "";
  if (item instanceof _equipmentItem && item.level_requirement > user.level) warningMessage+= `You will not be able to equip the item because your level is below the level requirement. (level requirement: ${item.level_requirement})\n`;
  if (item instanceof _equipmentItem && !user.class.types.includes(item.type)) warningMessage+= `You will not be able to equip the item because your class is not allowed to wear the type: \`${item.getType().name}\`.\n`;
  return warningMessage;
}
export function constructCurrencyString(currency: number, amount: number)
{
  let cd = DataManager.getCurrency(currency);
  return `${cd.icon} ${amount} ${cd.name}`;
}
export async function awaitConfirmMessage(title: string, description: string, msg: Discord.Message, user: User) :Promise<boolean>
{
  return new Promise(async (resolve, reject) => {
    //construct confirm message
    let confirmEmbed = new Discord.RichEmbed()
    .setTitle(title)
    .setDescription(description)
    .setFooter("Yes / No", 'http://159.89.133.235/DiscordBotImgs/logo.png')
    .setColor('#fcf403')

    //send and await reaction
    let confirmMessage = await msg.channel.send(confirmEmbed) as Discord.Message;
    user.reaction.isPending = true;
    await confirmMessage.react("✅");
    await confirmMessage.react("❌");
    var rr = await confirmMessage.awaitReactions((m:Discord.MessageReaction) => m.users.has(msg.author.id),{time: 20000, max: 1});
    user.reaction.isPending = false;
    if (rr.first().emoji && rr.first().emoji.name == '✅') resolve(true);
    else resolve(false);
  });
}


export function filterItemArray(filter: string[], array: (_anyItem | anyItem)[])
{
  switch(filter[0])
					{
						case "type":
							switch(filter[1].toLowerCase())
							{
								case "material":
								  return array.filter(x => (x instanceof MaterialItem || x instanceof _materialItem))
								case "equipment":
									return array.filter(x => (x instanceof EquipmentItem || x instanceof _equipmentItem))
								case "consumable":
									return array.filter(x => (x instanceof ConsumableItem || x instanceof _consumableItem))
							}
							break;
						case "quality":
							switch(filter[1].toLowerCase())
							{
								case "common": case "1":
                  return array.filter((x: _anyItem | anyItem) => 
                  {
                    if (x instanceof _equipmentItem || x instanceof _materialItem || x instanceof _consumableItem) return x.quality == 1;
                    if (x instanceof EquipmentItem || x instanceof MaterialItem || x instanceof ConsumableItem) return x.getData()?.quality == 1;
                    return false;
                  });
								case "uncommon": case "2":
                  return array.filter((x: _anyItem | anyItem) => 
                  {
                    if (x instanceof _equipmentItem || x instanceof _materialItem || x instanceof _consumableItem) return x.quality == 2;
                    if (x instanceof EquipmentItem || x instanceof MaterialItem || x instanceof ConsumableItem) return x.getData()?.quality == 2;
                    return false;
                  });
								case "rare": case "3":
									return array.filter((x: _anyItem | anyItem) => 
                  {
                    if (x instanceof _equipmentItem || x instanceof _materialItem || x instanceof _consumableItem) return x.quality == 3;
                    if (x instanceof EquipmentItem || x instanceof MaterialItem || x instanceof ConsumableItem) return x.getData()?.quality == 3;
                    return false;
                  });
								case "epic": case "4":
									return array.filter((x: _anyItem | anyItem) => 
                  {
                    if (x instanceof _equipmentItem || x instanceof _materialItem || x instanceof _consumableItem) return x.quality == 4;
                    if (x instanceof EquipmentItem || x instanceof MaterialItem || x instanceof ConsumableItem) return x.getData()?.quality == 4;
                    return false;
                  });
								case "epic": case "5":
									return array.filter((x: _anyItem | anyItem) => 
                  {
                    if (x instanceof _equipmentItem || x instanceof _materialItem || x instanceof _consumableItem) return x.quality == 5;
                    if (x instanceof EquipmentItem || x instanceof MaterialItem || x instanceof ConsumableItem) return x.getData()?.quality == 5;
                    return false;
                  });
							}
						case "slot":
							switch(filter[1].toLowerCase())
							{
								case DataManager.itemSlots.get(1)?.name.toLowerCase(): case "1":
									return array.filter((x) => {
                    if (x instanceof _equipmentItem) return x.slots.includes(1);
                    if (x instanceof EquipmentItem) return (x.getData() as _equipmentItem).slots.includes(1);
                    return false;
                  })
								case DataManager.itemSlots.get(2)?.name.toLowerCase(): case "2":
                  return array.filter((x) => {
                    if (x instanceof _equipmentItem) return x.slots.includes(2);
                    if (x instanceof EquipmentItem) return (x.getData() as _equipmentItem).slots.includes(2);
                    return false;
                  })
								case DataManager.itemSlots.get(3)?.name.toLowerCase(): case "3":
                  return array.filter((x) => {
                    if (x instanceof _equipmentItem) return x.slots.includes(3);
                    if (x instanceof EquipmentItem) return (x.getData() as _equipmentItem).slots.includes(3);
                    return false;
                  })
								case DataManager.itemSlots.get(4)?.name.toLowerCase(): case "4":
                  return array.filter((x) => {
                    if (x instanceof _equipmentItem) return x.slots.includes(4);
                    if (x instanceof EquipmentItem) return (x.getData() as _equipmentItem).slots.includes(4);
                    return false;
                  })
								case DataManager.itemSlots.get(5)?.name.toLowerCase(): case "5":
                  return array.filter((x) => {
                    if (x instanceof _equipmentItem) return x.slots.includes(5);
                    if (x instanceof EquipmentItem) return (x.getData() as _equipmentItem).slots.includes(5);
                    return false;
                  })
								case DataManager.itemSlots.get(6)?.name.toLowerCase(): case "6":
                  return array.filter((x) => {
                    if (x instanceof _equipmentItem) return x.slots.includes(6);
                    if (x instanceof EquipmentItem) return (x.getData() as _equipmentItem).slots.includes(6);
                    return false;
                  })
								case DataManager.itemSlots.get(7)?.name.toLowerCase(): case "7":
									return array.filter((x) => {
                    if (x instanceof _equipmentItem) return x.slots.includes(7);
                    if (x instanceof EquipmentItem) return (x.getData() as _equipmentItem).slots.includes(7);
                    return false;
                  })
							}
          }
          return array;
}

export function sortItemArray(sortmethod: string, array: (_anyItem | anyItem)[])
{
  switch(sortmethod.toLowerCase())
  {
      case "id": 
        array.sort(function(a,b)
        {
          if ((a instanceof _item || a instanceof _consumableItem || a instanceof  _equipmentItem || a instanceof _materialItem) && (b instanceof _item || b instanceof _consumableItem || b instanceof  _equipmentItem || b instanceof _materialItem))
          {
            return a._id - b._id;
          }
          if ((a instanceof ConsumableItem || a instanceof EquipmentItem || a instanceof MaterialItem) && (b instanceof ConsumableItem || b instanceof  EquipmentItem || b instanceof MaterialItem))
          {
            return a.id - b.id;
          }
          else return 0;
        });
      break;
      case "atk": 
        array.sort(function(a,b)
          {
            if (a instanceof  _equipmentItem &&  b instanceof  _equipmentItem)
            {
              return b.stats.base.atk - a.stats.base.atk;
            }
            if (a instanceof EquipmentItem && b instanceof  EquipmentItem)
            {
              return b.getTotalStats().atk - a.getTotalStats().atk;
            }
            else return 0;
          });
      break;
      case "def": 
        array.sort(function(a,b)
        {
          if (a instanceof  _equipmentItem &&  b instanceof  _equipmentItem)
          {
            return b.stats.base.def - a.stats.base.def;
          }
          if (a instanceof EquipmentItem && b instanceof  EquipmentItem)
          {
            return b.getTotalStats().def - a.getTotalStats().def;
          }
          else return 0;
        });
      break;
      case "acc": 
        array.sort(function(a,b)
        {
          if (a instanceof  _equipmentItem &&  b instanceof  _equipmentItem)
          {
            return b.stats.base.acc - a.stats.base.acc;
          }
          if (a instanceof EquipmentItem && b instanceof  EquipmentItem)
          {
            return b.getTotalStats().acc - a.getTotalStats().acc;
          }
          else return 0;
        });
      break;
      case "quality": 
        array.sort(function(a,b)
        {
          if ((a instanceof _item || a instanceof _consumableItem || a instanceof  _equipmentItem || a instanceof _materialItem) && (b instanceof _item || b instanceof _consumableItem || b instanceof  _equipmentItem || b instanceof _materialItem))
          {
            return b.quality - a.quality;
          }
          if ((a instanceof ConsumableItem || a instanceof EquipmentItem || a instanceof MaterialItem) && (b instanceof ConsumableItem || b instanceof  EquipmentItem || b instanceof MaterialItem))
          {
            return b.getData()!.quality - a.getData()!.quality;
          }
          else return 0;
        });
      break;
      case "amount":
        array.sort(function(a,b)
        {
          if ((a instanceof ConsumableItem || a instanceof MaterialItem) && (b instanceof ConsumableItem || b instanceof MaterialItem))
          {
            return b.amount - a.amount;
          }
          else return 0;
        });
      break;
  }
  return array;
}

export function createCraftedEquipment(itemData: _equipmentItem)
{
  let craftingBonus = 
  {
    atk: randomIntFromInterval(0,itemData.stats.crafting.atk),
    def: randomIntFromInterval(0,itemData.stats.crafting.def),
    acc: randomIntFromInterval(0,itemData.stats.crafting.acc)
  }
  
  return new EquipmentItem(itemData._id, craftingBonus);

}

export function sleep(s:number) {
  return new Promise(resolve => setTimeout(resolve, s*1000));
}
export function constructAbilityDataString(a: Ability, level?:number)
{
  let rva: string[] = []
  if (level) rva.push(`<:level:674945451866325002> ${level}`);
  rva.push(`<:cooldown:674944207663923219> ${a.cooldown}`);

  return `[`+rva.join(` | `)+`]` 
}

export function parseComblatLogString(cls: string, user: Actor, targets: Actor[]): string
{
  cls = cls.replace(`{user}`, `\`${user.getName()}\``);
  cls = cls.replace(`{targets}`, `\`${targets.map(x => x.getName()).slice(0,5).join(", ")}${targets.length > 5 ? "...": ""}\``);
  cls = cls.replace(`{target}`, `\`${targets.map(x => x.getName()).slice(0,5).join(", ")}${targets.length > 5 ? "...": ""}\``);
  return cls;
}

export function numberToIcon(number: number)
{
  let rv = ""; 
  for (let n of number.toString()) rv += numberIconArray[+n];
  return rv;
}

/**
 * Returns promise of a get request to the patreon API.
 * @param path What part of the api should be called?
 */
export async function PatreonGet(path: string) :Promise<any>
{
    return new Promise(async (resolve, reject) => 
    {
        let req = https.get({host: "www.patreon.com" ,path: `/api/oauth2/v2/${path}` ,headers: {Authorization: `Bearer ${cf.patreon_creatorToken}`} }, (res) => 
        {
            let data = "";
            res.on('data', (d) => data += d);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', (err) => reject(err));
        req.end();
    })
}

export function get(obj:any, key:string) {
  return key.split(".").reduce(function(o, x) {
      return (typeof o == "undefined" || o === null) ? o : o[x];
  }, obj);
}