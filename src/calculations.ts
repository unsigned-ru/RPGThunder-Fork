import Discord from "discord.js"
import {exp_req_base_exp,exp_req_multiplier} from "./config.json";
import {queryPromise} from "./utils"
import {_user_data,_item} from "./interfaces.js";
import {classes, equipment_slots} from "./staticData"
import { stat } from "fs";

export async function getUserData(id: string):Promise<_user_data | undefined>
{
  try
  {
    var data: _user_data = new _user_data();
    //Get userClassID & user_Equipment & currentHP
    var sql = `SELECT class_id FROM users WHERE user_id='${id}';`+
    `SELECT main_hand,off_hand,head,chest,legs,feet,trinket FROM user_equipment WHERE user_id='${id}';`+
    `SELECT current_hp,level,exp,currency FROM user_stats WHERE user_id='${id}'`;
    var query = await queryPromise(sql);
    
    if (query[0].length == 0) throw "User is not registered.";

    data.class = classes.find(x => x.id == query[0][0].class_id);
    data.level = query[2][0].level;
    data.exp = query[2][0].exp;
    data.currency = query[2][0].currency;
    data.current_hp = query[2][0].current_hp;
    data.base_atk = data.class!.base_atk;
    data.base_def = data.class!.base_def;
    data.base_acc = data.class!.base_acc;

    var sql = `SELECT * FROM items WHERE id=${query[1][0].main_hand} OR id=${query[1][0].off_hand} OR id=${query[1][0].head} OR id=${query[1][0].chest} OR id=${query[1][0].legs} OR id=${query[1][0].feet} OR id=${query[1][0].trinket};`;
    var query = await queryPromise(sql);

    query.forEach(function(element: any){
      data.equipment_atk += element.atk;
      data.equipment_def += element.def;
      data.equipment_acc += element.acc;
      console.log(equipment_slots.find(slot => slot.id == element.slot)!.name);
      switch(equipment_slots.find(slot => slot.id == element.slot)!.name.toLowerCase())
      {
        case "main hand":
          data.main_hand = element;
          break;
        case "off hand":
          data.off_hand = element;
          break;
        case "head":
          data.head = element;
          break;
        case "legs":
          data.legs = element;
          break;
        case "feet":
          data.feet = element;
          break;
        case "trinket":
          data.trinket = element;
          break;
      }
    });
    

    data.max_hp = data.class!.base_hp + ((data.level - 1) * data.class!.hp_increase);
    data.total_atk = data.base_atk + data.equipment_atk + ((data.level - 1) * data.class!.atk_increase);
    data.total_def = data.base_def + data.equipment_def + ((data.level - 1) * data.class!.def_increase);
    data.total_acc = data.base_acc + data.equipment_acc + ((data.level - 1) * data.class!.acc_increase);
    
    return data;
  }
  catch(err)
  {
    throw err;
  }
}

export function calculateReqExp(level:number) :number
{
  return Math.round(exp_req_base_exp + (exp_req_base_exp * ((level ** exp_req_multiplier)-level)));
}

export async function getInventory(user_id:string) : Promise<_item[] | undefined>
{
  try
  {
    var inventoryResult: any[] = await queryPromise(`SELECT item FROM user_inventory WHERE user_id=${user_id}`);
    if (inventoryResult.length == 0 || undefined) {throw "No items found."}
    var itemQuery = "SELECT * FROM items WHERE ";

    var firstDone = false;
    inventoryResult.forEach(row => {
      if (!firstDone){
        itemQuery += `id=${row.item} `
        firstDone = true;
      }
      else{
        itemQuery += `OR id=${row.item} `
      }
      
    });
    itemQuery += ";";
    
    var inventory: _item[] = await queryPromise(itemQuery);
    return inventory;
  }
  catch(err)
  {
    console.log(err);
    throw err;
  }
}



export async function getItemData(item_id:number) : Promise<_item | undefined>
{
  try
  {
    var item = (await queryPromise(`SELECT * FROM items WHERE id=${item_id}`))[0];
    if (item == undefined) {throw "Did not find an item with that id."}
    return item;
  }
  catch(err)
  {
    console.log(err);
    throw err;
  }
}