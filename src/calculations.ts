import Discord from "discord.js"
import {exp_req_base_exp,exp_req_multiplier} from "./config.json";
import {queryPromise} from "./utils"
import {_user_data,_item} from "./interfaces.js";
import {classes, equipment_slots} from "./staticData"
import { stat } from "fs";

export async function getUserData(id: string):Promise<_user_data>
{
  return new Promise(async function(resolve, reject)
  {
    var data: _user_data = new _user_data();

    //Get userClassID & user_Equipment & currentHP
    var sql = `SELECT class_id,level,exp,current_hp FROM users WHERE user_id='${id}';`+
    `SELECT main_hand,off_hand,head,chest,legs,feet,trinket FROM user_equipment WHERE user_id='${id}';`+
    `SELECT * FROM user_currencies WHERE user_id='${id}'`;
    var query = await queryPromise(sql).catch(err => reject(err));
    
    if (query[0].length == 0) reject("User is not registered.");

    data.class = classes.find(x => x.id == query[0][0].class_id);
    if (!data.class) reject("Class not found."); 
    data.level = query[0][0].level;
    data.exp = query[0][0].exp;
    data.currencies = query[2][0];
    data.current_hp = query[0][0].current_hp;
    data.base_atk = data.class!.base_atk;
    data.base_def = data.class!.base_def;
    data.base_acc = data.class!.base_acc;

    var sql = `SELECT * FROM items WHERE id=${query[1][0].main_hand} OR id=${query[1][0].off_hand} OR id=${query[1][0].head} OR id=${query[1][0].chest} OR id=${query[1][0].legs} OR id=${query[1][0].feet} OR id=${query[1][0].trinket};`;
    var query = await queryPromise(sql).catch(err => {reject(err)});

    query.forEach(function(element: any){
      data.equipment_atk += element.atk;
      data.equipment_def += element.def;
      data.equipment_acc += element.acc;

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
        case "chest":
          data.chest = element;
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
    
    resolve(data);
  });
}

export function calculateReqExp(level:number) :number
{
  return Math.round(exp_req_base_exp + (exp_req_base_exp * ((level ** exp_req_multiplier)-level)));
}

export async function getInventory(user_id:string) : Promise<_item[]>
{

  return new Promise(async function(resolve, reject) 
  {
    var inventoryResult: any[] = await queryPromise(`SELECT item FROM user_inventory WHERE user_id=${user_id}`).catch(err => {reject(err)});
    if (inventoryResult.length == 0 || undefined) {reject("No items found.")}
    var itemQuery = "";
    inventoryResult.forEach(row => {
      itemQuery += `SELECT * from items WHERE id=${row.item};` 
    });

    var inventory :_item[] = [];
    const ItemResult: any[] = await queryPromise(itemQuery).catch(err => {reject(err)})
    ItemResult.forEach(rowdata => {
      inventory.push(rowdata[0])
    });
    resolve(inventory);
  })
}



export async function getItemData(item_id:number) : Promise<_item>
{
  return new Promise(async function(resolve, reject){
    var item :_item= (await queryPromise(`SELECT * FROM items WHERE id=${item_id}`).catch(err => {reject(err)}))[0];
    if (item == undefined) {reject("Did not find an item with that id.")}
    resolve(item);
  });
}