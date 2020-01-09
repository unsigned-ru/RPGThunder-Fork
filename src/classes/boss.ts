import { _enemy, _currency_drop, _enemy_currency_drop_data, _enemy_item_drop_data, _enemy_material_drop_data, _material_drop, _boss, _boss_currency_drop_data, _boss_item_drop_data, _boss_material_drop_data, _boss_abbility } from "../interfaces";
import { randomIntFromInterval, clamp} from "../utils";
import { bosses_abilities, materials } from "../staticdata";
import { DiscordAPIError, Collection } from "discord.js";

export class Boss{
    name: string;
    //level: number;
    max_hp: number;
    current_hp: number;
    atk: number;
    def: number;
    //acc: number;
    //exp: number; TODO: add
    //Add abilities
    pre_dialogue: string[] = [];
    abilities: {ability: _boss_abbility, chance: number}[] = [];
    currency_drops: _currency_drop[] = [];
    item_drops: number[] = [];
    material_drops: _material_drop[] = [];
  
    constructor(bossData:_boss, currency_drops:_boss_currency_drop_data[], item_drops:_boss_item_drop_data[], materialDrops:_boss_material_drop_data[]) 
    {
      this.name = bossData.name;
      this.max_hp = bossData.hp;
      this.current_hp = this.max_hp;
      this.atk = bossData.atk;
      this.def = bossData.def;
      
      //Add abilities
      bossData.abilities.split("-").map((x) => 
      {
        //Get the data for each ability and push it into the array.
        var data = x.split(",");
        var ability = bosses_abilities.get(parseInt(data[0]));
        
        this.abilities.push({ability: ability!, chance: parseInt(data[1])})
      })
      
      //Add pre_dialogue
      this.pre_dialogue = bossData.pre_dialogue.split("-");
     
      //this.acc = bossData.acc TODO: add
      //this.exp = TODO: add
  
      //calculate the currency drops the enemy will have
      const currencyDropChances: {name: string, chance: number}[] = [];
      var currencyDropChanceCounter = 0;
  
      for (var currencyDrop of currency_drops)
      {
        if (currencyDrop.drop_chance >= 100)
        {
          //100% drop chance.
          const proposedAmount = randomIntFromInterval(currencyDrop.amount_min, currencyDrop.amount_max);
          this.currency_drops.push({currency_name: currencyDrop.currency_name, amount: proposedAmount});
          continue;
        }
        //drop chance below 100% 
        currencyDropChanceCounter += currencyDrop.drop_chance;
        currencyDropChances.push({name: currencyDrop.currency_name, chance: currencyDropChanceCounter});
      }

      const currencyDropChanceRNG = randomIntFromInterval(0,100); //generate rng.
  
      //Get the dropped currency and add it to the currency drops.
      for (var currencyDropChance of currencyDropChances.reverse())
      {
        if (currencyDropChanceRNG <= currencyDropChance.chance)
        {
          const currencyDrop = currency_drops.find(x => x.currency_name == currencyDropChance.name)!;
          const proposedAmount = randomIntFromInterval(currencyDrop.amount_min, currencyDrop.amount_max);
          this.currency_drops.push({currency_name: currencyDrop.currency_name, amount: proposedAmount});
          break;
        }
      }
  
      //Calculate the item drops the enemy will have.
      const itemDropChances: {id: number, chance:number}[] = []
      var itemDropChanceCounter = 0;
  
      for (var itemDrop of item_drops)
      {
        if (itemDrop.drop_chance >= 100) //100% drop chance.
        {
          this.item_drops.push(itemDrop.item_id);
          continue;
        }
        //drop chance below 100%
        itemDropChanceCounter += itemDrop.drop_chance
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
      const materialDropChances: Collection<number,number> = new Collection();
      var materialChanceCounter = 0;

      for (var materialDrop of materialDrops)
      {
        if (materialDrop.drop_chance >= 100)
        {
          //100% drop chance.
          const proposedAmount = randomIntFromInterval(materialDrop.amount_min,materialDrop.amount_max);
          this.material_drops.push({material_id: materialDrop.material_id, amount: proposedAmount});
          continue;
        }
        //drop chance below 100% 
        materialChanceCounter += materialDrop.drop_chance;
        materialDropChances.set(materialDrop.material_id,materialChanceCounter);
      }
      
      const materialDropChanceRNG = randomIntFromInterval(0,100); //generate rng.
  
      //Get the dropped material and add it to the material drops.
      for (var materialDropChance of materialDropChances.sort((a,b) => b - a))
      {
        if (materialDropChanceRNG <= materialDropChance[1])
        {
          const materialDrop = materialDrops.find(x => x.material_id == materialDropChance[0])!;
          const proposedAmount = randomIntFromInterval(materialDrop.amount_min,materialDrop.amount_max);
          this.material_drops.push({material_id: materialDrop.material_id, amount: proposedAmount});
          break;
        }
      }
    }
    
    takeDamage(damageToTake: number) :number
    {

      const damage = damageToTake * 0.25 + clamp(((damageToTake *0.75 ) - (this.def / 3)), 0, Number.MAX_VALUE);
      this.current_hp -= damage
      if (this.current_hp <= 0) this.current_hp = 0;

      return damage;
    }
  }