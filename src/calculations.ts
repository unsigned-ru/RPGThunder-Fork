import Discord from "discord.js"
import {exp_req_base_exp,exp_req_multiplier} from "./config.json";
import {queryPromise} from "./utils"
import { _user_stats } from "./interfaces.js";
import {classes} from "./staticData"
import { stat } from "fs";

export async function getUserStats(id: string):Promise<_user_stats | undefined>
{
  try
  {
    var stats: _user_stats = new _user_stats();
    //Get userClassID & user_Equipment & currentHP
    var sql = `SELECT class_id FROM users WHERE user_id='${id}';`+
    `SELECT main_hand,off_hand,head,chest,legs,feet,trinket FROM user_equipment WHERE user_id='${id}';`+
    `SELECT current_hp,level FROM user_stats WHERE user_id='${id}'`;
    var query = await queryPromise(sql);
    
    if (query[0][0].length == 0) return undefined;
    var selectedClass = classes.find(x => x.id == query[0][0].class_id);
    stats.level = query[2][0].level;
    stats.hp = query[2][0].current_hp;
    stats.base_atk = selectedClass!.base_atk;
    stats.base_def = selectedClass!.base_def;
    stats.base_acc = selectedClass!.base_acc;

    var sql = `SELECT atk, def, acc FROM items WHERE id=${query[1][0].main_hand} OR id=${query[1][0].off_hand} OR id=${query[1][0].head} OR id=${query[1][0].chest} OR id=${query[1][0].legs} OR id=${query[1][0].feet} OR id=${query[1][0].trinket};`;
    var query = await queryPromise(sql);

    query.forEach(function(element: any){
      stats.equipment_atk += element.atk;
      stats.equipment_def += element.def;
      stats.equipment_acc += element.acc;
    });

    stats.max_hp = selectedClass!.base_hp + ((stats.level - 1) * selectedClass!.hp_increase);
    stats.total_atk = stats.base_atk + stats.equipment_atk + ((stats.level - 1) * selectedClass!.atk_increase);
    stats.total_def = stats.base_def + stats.equipment_def + ((stats.level - 1) * selectedClass!.def_increase);
    stats.total_acc = stats.base_acc + stats.equipment_acc + ((stats.level - 1) * selectedClass!.acc_increase);

    console.log(stats);

    return stats;
  }
  catch(err)
  {
    console.log(err);
  }
}
export function calculateReqExp(level:number) :number
{
  return Math.round(exp_req_base_exp + (exp_req_base_exp * ((level ** exp_req_multiplier)-level)));
}