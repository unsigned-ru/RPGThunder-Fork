import {Collection} from "discord.js"
import {_class,_item_type,_equipment_slot, _item_quality, _enemy, _enemy_currency_drop_data, _enemy_item_drop_data, _shop_item, _consumable, _enemy_material_drop_data, _zone, _zone_gather_drop, _zone_shop_entry, _shop_category as _item_category, _material, _currency, _boss, _boss_item_drop_data, _boss_currency_drop_data, _boss_material_drop_data, _boss_abbility, _class_ability, _crafting_recipe, _custom_prefix} from './interfaces';
import { queryPromise } from './utils';

export var classes: Collection<number,_class> = new Collection();
export var class_abilities: Collection<number,_class_ability> = new Collection();
export var item_types: Collection<number,_item_type> = new Collection();
export var item_qualities: Collection<number,_item_quality> = new Collection();

//enemyData
export var enemies: Collection<number,_enemy> = new Collection();
export var enemies_item_drop_data: Collection<number,_enemy_item_drop_data> = new Collection();
export var enemies_currency_drop_data: Collection<number,_enemy_currency_drop_data> = new Collection();
export var enemies_material_drop_data: Collection<number,_enemy_material_drop_data> = new Collection();

//bossData
export var bosses: Collection<number,_boss> = new Collection();
export var bosses_abilities: Collection<number,_boss_abbility> = new Collection();
export var bosses_item_drop_data: Collection<number,_boss_item_drop_data> = new Collection();
export var bosses_currency_drop_data: Collection<number,_boss_currency_drop_data> = new Collection();
export var bosses_material_drop_data: Collection<number,_boss_material_drop_data> = new Collection();

export var consumables: Collection<number,_consumable> = new Collection();

export var currencies: Collection<number,_currency> = new Collection();
export var equipment_slots: Collection<number,_equipment_slot> = new Collection();
export var materials: Collection<number,_material> = new Collection();

export var craftingRecipes: Collection<number,_crafting_recipe> = new Collection();

export var zones: Collection<number,_zone> = new Collection();
export var zone_shops: Collection<number,_zone_shop_entry> = new Collection();
export var item_categories: Collection<number,_item_category> = new Collection();

export var zone_fish_drops: Collection<number,_zone_gather_drop> = new Collection();
export var zone_mine_drops: Collection<number,_zone_gather_drop> = new Collection();
export var zone_harvest_drops: Collection<number,_zone_gather_drop> = new Collection();
export var zone_chop_drops: Collection<number,_zone_gather_drop> = new Collection();
export var blacklistedChannels: string[] = [];
export var custom_prefixes: Collection<string,_custom_prefix> = new Collection();


export async function LoadStaticDatabaseData()
{
  try
  {

    blacklistedChannels = (await queryPromise(`SELECT channel_id FROM blacklisted_channels`) as Array<any>).map(x => x.channel_id);
    custom_prefixes = await loadDbData("custom_prefix","guild_id");
    materials = await loadDbData("materials");
    currencies = await loadDbData("currencies");
    equipment_slots = await loadDbData("equipment_slots");

    classes = await loadDbData("classes");
    class_abilities = await loadDbData("class_abilities");
    item_types = await loadDbData("item_types");
    item_qualities = await loadDbData("item_qualities");

    //EnemyData
    enemies = await loadDbData("enemies");
    enemies_item_drop_data = await loadDbData("enemy_item_drops")
    enemies_currency_drop_data = await loadDbData("enemy_currency_drops")
    enemies_material_drop_data = await loadDbData("enemy_material_drops")

    //BossData
    bosses = await loadDbData("bosses");
    bosses_abilities = await loadDbData("boss_abilities");
    bosses_item_drop_data = await loadDbData("boss_item_drops")
    bosses_currency_drop_data = await loadDbData("boss_currency_drops")
    bosses_material_drop_data = await loadDbData("boss_material_drops")

    zone_fish_drops = await loadDbData("zone_fish_drops");
    zone_mine_drops = await loadDbData("zone_mine_drops");
    zone_harvest_drops = await loadDbData("zone_harvest_drops");
    zone_chop_drops = await loadDbData("zone_chop_drops");

    consumables = await loadDbData("consumables");

    zones = await loadDbData("zones");
    zone_shops = await loadDbData("zone_shops");
    item_categories = await loadDbData("categories");

    craftingRecipes = await loadDbData("recipes");

    
  }
  catch(err)
  {
    process.exit(1);
  }
}

async function loadDbData(tableName:string, id_name: string = "id") :Promise<Collection<any,any>>
{
  return new Promise(async function(resolve, reject)
  {
    try
    {
      var timestamp = new Date().getTime();
      console.log(`Loading ${tableName}...`)
      var query = `SELECT * FROM ${tableName}`;
      var queryResult = await queryPromise(query);
      
      var returnValue: Collection<any,any> = new Collection();

      //iterate over values and add it to the collection
      for (var row of queryResult) returnValue.set(row[id_name],row);
      
      console.log(`Finished loading ${tableName} (took ${new Date().getTime()- timestamp} ms).`)
      return resolve(returnValue);
    }
    catch(err){return reject(err);}
  });
}