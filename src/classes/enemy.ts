import { _enemy, _currency_drop, _enemy_currency_drop_data, _enemy_item_drop_data, _enemy_material_drop_data, _material_drop } from "../interfaces";
import { randomIntFromInterval, clamp } from "../utils";
import { basicModule, statsModule, UserData } from "./userdata";

export class Enemy{
    name: string;
    level: number;
    max_hp: number;
    current_hp: number;
    atk: number;
    def: number;
    acc: number;
    exp: number;
    currency_drops: _currency_drop[] = [];
    item_drops: number[] = [];
    material_drops: _material_drop[] = [];
  
    constructor(enemyData:_enemy, currency_drops:_enemy_currency_drop_data[], item_drops:_enemy_item_drop_data[], materialDrops:_enemy_material_drop_data[], ul:number) 
    {
      this.name = enemyData.name
      const proposedlvl = randomIntFromInterval(ul - enemyData.enemy_level_offset_min, ul + enemyData.enemy_level_offset_min);
      this.level = proposedlvl >= 1 ? proposedlvl : 1;
      this.max_hp = enemyData.base_hp + (clamp(this.level - enemyData.base_level, 0, Number.MAX_VALUE) * enemyData.hp_increase);
      this.current_hp = this.max_hp;
      this.atk = enemyData.base_atk + (clamp(this.level - enemyData.base_level, 0, Number.MAX_VALUE) * enemyData.atk_increase);
      this.def = enemyData.base_def + (clamp(this.level - enemyData.base_level, 0, Number.MAX_VALUE) * enemyData.def_increase);
      this.acc = enemyData.base_acc + (clamp(this.level - enemyData.base_level, 0, Number.MAX_VALUE) * enemyData.acc_increase);
      this.exp = Math.round(enemyData.base_exp + (clamp(this.level - ul,0,Number.MAX_VALUE) * enemyData.exp_increase))
  
      //calculate the currency drops the enemy will have
      const currencyDropChances: {name: string, chance: number}[] = [];
      var currencyDropChanceCounter = 0;
  
      for (var currencyDrop of currency_drops)
      {
        if (currencyDrop.base_drop_chance >= 100)
        {
          //100% drop chance.
          const proposedAmount = randomIntFromInterval((currencyDrop.base_amount_min + (clamp(this.level - ul,0,Number.MAX_VALUE) * currencyDrop.amount_increase)), (currencyDrop.base_amount_max + (clamp(this.level - ul,0,Number.MAX_VALUE) * currencyDrop.amount_increase)));
          this.currency_drops.push({currency_name: currencyDrop.currency_name, amount: proposedAmount});
          continue;
        }
        //drop chance below 100% 
        currencyDropChanceCounter += currencyDrop.base_drop_chance + (clamp(this.level - ul,0,Number.MAX_VALUE) * currencyDrop.drop_chance_increase);
        currencyDropChances.push({name: currencyDrop.currency_name, chance: currencyDropChanceCounter});
      }

      const currencyDropChanceRNG = randomIntFromInterval(0,100); //generate rng.
  
      //Get the dropped currency and add it to the currency drops.
      for (var currencyDropChance of currencyDropChances.reverse())
      {
        if (currencyDropChanceRNG <= currencyDropChance.chance)
        {
          const currencyDrop = currency_drops.find(x => x.currency_name == currencyDropChance.name)!;
          const proposedAmount = randomIntFromInterval((currencyDrop.base_amount_min + (clamp(this.level - ul,0,Number.MAX_VALUE) * currencyDrop.amount_increase)), (currencyDrop.base_amount_max + ((clamp(this.level - ul,0,Number.MAX_VALUE) * currencyDrop.amount_increase))))
          this.currency_drops.push({currency_name: currencyDrop.currency_name, amount: proposedAmount});
          break;
        }
      }
  
      //Calculate the item drops the enemy will have.
      const itemDropChances: {id: number, chance:number}[] = []
      var itemDropChanceCounter = 0;
  
      for (var itemDrop of item_drops)
      {
        if (itemDrop.base_chance >= 100) //100% drop chance.
        {
          this.item_drops.push(itemDrop.item_id);
          continue;
        }
        //drop chance below 100%
        itemDropChanceCounter += itemDrop.base_chance + (clamp(this.level - ul,0,Number.MAX_VALUE) * itemDrop.chance_increase);
        itemDropChances.push({id: itemDrop.item_id, chance: itemDropChanceCounter});
      }
  
      const itemDropChanceRNG = randomIntFromInterval(0,100) //generate rng.
  
      for (var itemDropChance of itemDropChances)
      {
        if (itemDropChanceRNG <= itemDropChance.chance)
        {
          this.item_drops.push(itemDropChance.id);
          break;
        }
      }

      //Calculate the materialDrops the mob wil have
      const materialDropChances: {name: string, chance: number}[] = [];
      var materialChanceCounter = 0;

      for (var materialDrop of materialDrops)
      {
        if (materialDrop.base_drop_chance >= 100)
        {
          //100% drop chance.
          const proposedAmount = randomIntFromInterval((materialDrop.base_amount_min + (clamp(this.level - ul,0,Number.MAX_VALUE) * materialDrop.amount_increase)), (materialDrop.base_amount_max + (clamp(this.level - ul,0,Number.MAX_VALUE) * materialDrop.amount_increase)));
          this.material_drops.push({material_name: materialDrop.material_name, amount: proposedAmount});
          continue;
        }
        //drop chance below 100% 
        materialChanceCounter += materialDrop.base_drop_chance + (clamp(this.level - ul,0,Number.MAX_VALUE) * materialDrop.drop_chance_increase);
        materialDropChances.push({name: materialDrop.material_name, chance: materialChanceCounter});
      }
      
      const materialDropChanceRNG = randomIntFromInterval(0,100); //generate rng.
  
      //Get the dropped material and add it to the material drops.
      for (var materialDropChance of materialDropChances.reverse())
      {
        if (materialDropChanceRNG <= materialDropChance.chance)
        {
          const materialDrop = materialDrops.find(x => x.material_name == materialDropChance.name)!;
          const proposedAmount = randomIntFromInterval(materialDrop.base_amount_min + (clamp(this.level - ul,0,Number.MAX_VALUE) * materialDrop.amount_increase), (materialDrop.base_amount_max + (clamp(this.level - ul,0,Number.MAX_VALUE) * materialDrop.amount_increase)));
          this.material_drops.push({material_name: materialDrop.material_name, amount: proposedAmount});
          break;
        }
      }

    }
  
    fight(basicMod: basicModule, statsMod: statsModule)
    {
      var e_ensuredDamage = (statsMod.stats.get("total_atk")! * 0.25);
      var e_protectedDamage = clamp((statsMod.stats.get("total_atk")! * 0.75) - (this.def / 3), 0, Number.MAX_VALUE);
      this.current_hp -= e_ensuredDamage + e_protectedDamage;
      if (this.current_hp <= 0) return "won";
  
      var u_ensuredDamage = (this.atk * 0.25);
      var u_protectedDamage = clamp((this.atk * 0.75) - (statsMod.stats.get("total_def")! / 3), 0, Number.MAX_VALUE);
      UserData.takeDamage(basicMod, u_ensuredDamage + u_protectedDamage);
      if (basicMod.current_hp! <= 0) return "lost";
  
      return "inProgress";
    }
  }