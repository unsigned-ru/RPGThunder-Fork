import {Collection} from "discord.js"
import {con, client} from './main'
import {_class,_item_type,_equipment_slot, _item_quality, _enemy, _enemy_currency_drop_data, _enemy_item_drop_data, _shop_item, _consumable, _enemy_material_drop_data} from './interfaces';
import { queryPromise } from './utils';

export var classes: Collection<number,_class> = new Collection();
export var item_types: Collection<number,_item_type> = new Collection();
export var equipment_slots: Collection<number,_equipment_slot> = new Collection();
export var item_qualities: Collection<number,_item_quality> = new Collection();
export var enemies: Collection<number,_enemy> = new Collection();
export var enemies_item_drop_data: Collection<number,_enemy_item_drop_data> = new Collection();
export var enemies_currency_drop_data: Collection<number,_enemy_currency_drop_data> = new Collection();
export var enemies_material_drop_data: Collection<number,_enemy_material_drop_data> = new Collection();
export var item_shop_data: Collection<number,_shop_item> = new Collection();
export var consumable_shop_data: Collection<number,_shop_item> = new Collection();
export var consumables: Collection<number,_consumable> = new Collection();

export async function LoadStaticDatabaseData()
{
  try
  {
    classes = await loadDbData("classes");
    item_types = await loadDbData("item_types");
    equipment_slots = await loadDbData("equipment_slots");
    item_qualities = await loadDbData("item_qualities");
    enemies = await loadDbData("enemies");
    enemies_item_drop_data = await loadDbData("enemy_item_drops")
    enemies_currency_drop_data = await loadDbData("enemy_currency_drops")
    enemies_material_drop_data = await loadDbData("enemy_material_drops")
    item_shop_data = await loadDbData("items_shop");
    consumable_shop_data = await loadDbData("consumables_shop");
    consumables = await loadDbData("consumables");
  }
  catch(err)
  {
    console.error(err);
    process.exit(1);
  }
}

async function loadDbData(tableName:string, id_name: string = "id") :Promise<Collection<number,any>>
{
  return new Promise(async function(resolve, reject)
  {
    try
    {
      var timestamp = new Date().getTime();
      console.log(`Loading ${tableName}...`)
      var query = `SELECT * FROM ${tableName}`;
      var queryResult = await queryPromise(query);
      
      var returnValue: Collection<number,any> = new Collection();

      //iterate over values and add it to the collection
      for (var row of queryResult) returnValue.set(row[id_name],row);
      
      console.log(`Finished loading ${tableName} (took ${new Date().getTime()- timestamp} ms).`)
      return resolve(returnValue);
    }
    catch(err){return reject(err);}
  });
}