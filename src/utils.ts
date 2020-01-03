import {con} from "./main";
import * as cf from "./config.json";
import { _item } from "./interfaces";
import Discord from "discord.js";
import { classes, equipment_slots, materials, currencies } from "./staticdata";

/**
 * Capitalize the first letter of a string
 * @param string
 */
export function capitalizeFirstLetter(string: string) 
{
	return string.charAt(0).toUpperCase() + string.slice(1);
}

export function getItemDataByName(name: string): Promise<_item|undefined>{ 
  return new Promise(async (resolve, reject) => {
    var item: _item = (await queryPromise(`SELECT * FROM items WHERE LOWER(name)='${name.toLowerCase()}'`))[0];
    return resolve(item);
  })
}

/**
 * Awaitable function that executes a query to the database. Throws an error if one occurs.
 * @param str SQL Query to execute.
 */
export function queryPromise(str: string): Promise<any>{ 
  return new Promise((resolve, reject) => {
    con.query(str, (err, result) => {
      if (err) return reject(err); 
      return resolve(result);
    })
  })
}

/**
 * Get a currency's display name.
 * @param currencyDbName Name of database field.
 */
export function getCurrencyDisplayName(currencyDbName:string) :string
{
  return currencies.find(x => x.database_name == currencyDbName).database_name;
}

export function getCurrencyIcon(currencyDbName:string) :string
{
  return currencies.find(x => x.database_name == currencyDbName)!.icon_name;
}

export function getMaterialDisplayName(materialDbName:string) :string
{
  return materials.find(x => x.database_name == materialDbName).display_name!;
}

export function getMaterialIcon(materialDbName:string) :string
{
  return materials.find(x => x.database_name == materialDbName).icon_name!;
}

export function getEquipmentSlotDisplayName(equipmentSlot:string | number) :string
{
  if (!isNaN(equipmentSlot as number)) return equipment_slots.find(x => x.id == equipmentSlot)!.display_name;
  else return equipment_slots.find(x => x.database_name == equipmentSlot as string)!.display_name;
}

/**
 * Generate a random integer from an interval. Both inclusive.
 * @param min 
 * @param max 
 */
export function randomIntFromInterval(min:number, max:number) :number 
{
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Query the database to check if a user with id is registered.
 * @param user_id id to check for.
 */
export async function isRegistered(user_id: string) :Promise<boolean>
{
  return new Promise(async function(resolve, reject)
  {
    try{
      const userCountResult = (await queryPromise(`SELECT COUNT(*) FROM users WHERE user_id=${user_id}`))[0]
      const userCount = userCountResult[Object.keys(userCountResult)[0]];
      if (userCount == 0) return resolve(false)
      else return resolve(true);
    }
    catch(err) {return reject(err);}
  });
}

/**
 * Get a random element from an array.
 * @param array Array to get an element from.
 */
export function getRandomElementFromArray(array: any[]):any
{
  const index = randomIntFromInterval(0, array.length-1);
  return array[index];
}

/**
 * must await. This pauzes the current thread execution by x milliseconds;
 * @param ms 
 */
export function sleep(ms:number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function editCollectionNumberValue(collection: Discord.Collection<any,number>, key:any, value:number)  { collection.set(key,collection.get(key)! + value);}

/**
 * Calculate the required exp to reach the next level.
 * @param level current level
 */
export function calculateReqExp(level:number) :number
{
  return Math.round(cf.exp_req_base_exp + (cf.exp_req_base_exp * ((level ** cf.exp_req_multiplier)-level)));
}

/**
 * Get the item data for select items
 * @param item_ids ItemID / ItemIDs
 */
export async function getItemData(item_ids: number | number[]) : Promise<_item | _item[]>
{
  return new Promise(async function(resolve, reject)
  {
    if (typeof(item_ids) == "number")
    {
      var item :_item = (await queryPromise(`SELECT * FROM items WHERE id=${item_ids}`).catch(err => {reject(err)}))[0];
      if (item == undefined) reject("Did not find an item with that id.");
      resolve(item);
    }
    else if (Array.isArray(item_ids))
    {
      if (item_ids.length == 0) {resolve([]); return;}
      var queryString = "";
      for (var item_id of item_ids) queryString += `id=${item_id} AND`;
      var items :_item[] = (await queryPromise(`SELECT * FROM items WHERE ${queryString.slice(0,-3)}`).catch(err => {reject(err)}));
      if (!items.every(x => x != undefined)) {reject("Did not find an item with that id"); return;}
      resolve(items);
    }
    else reject("A problem occured getting the item's data.");
  });
}

export function clamp(number:number,min:number, max:number) {
  return Math.min(Math.max(number, min), max);
};

export async function getGuildPrefix(guild_id:string)
{
  const result = (await queryPromise(`SELECT * FROM custom_prefix WHERE guild_id=${guild_id}`))[0]
  if (result) return result.prefix;
  else return '$';
}