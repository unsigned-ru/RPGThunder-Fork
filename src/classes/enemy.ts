import {User} from "../classes/user"
import { _zoneEnemy } from "./zone";
import { DataManager } from "./dataManager";
import { clamp, randomIntFromInterval, getTotalWeightForLevel, getAccFromLevelWeight } from "../utils";
import cf from "../config.json"
import { Actor } from "./actor";

export class Enemy extends Actor
{
    id: number;
    name: string;
    icon: string;
    type: _enemyType;
    stats: { hp: number, atk: number, def: number, acc:number }
    currencyDrops: {id: number, amount: number}[] = [];
    itemDrops: {id: number, amount?: number}[] = [];
    exp: number;

    constructor(u: User, ze: _zoneEnemy)
    {
        super(0, clamp(randomIntFromInterval(u.level-ze.level_offset.below,u.level+ze.level_offset.above,true),1,ze.max_level));
        this.id = ze.id;
        let ed = DataManager.getEnemy(ze.id)!;
        this.name = ed.name;
        this.icon = ed.icon;
        this.type = DataManager.getEnemyType(ed.type)!; 
        
        this.exp = (5 * Math.exp(-((u.level-1)/28))) / 100 * u.getRequiredExp(this.level);
        //calculate stats
        let w = getTotalWeightForLevel(this.level) * ze.weight;
        this.stats = 
        {
            hp: (cf.stats.base.hp + ((this.level - 1) * cf.stats.increase.hp) * ze.weight),
            atk: w * this.type.atk,
            def: (w * this.type.def) * 2,
            acc: getAccFromLevelWeight(this.level, (w * this.type.acc), 0.85)
        }
        this.hp = this.stats.hp;

        //calculate currency drops
        for (let cd of ze.currencyDrops)
        {
            let rng = randomIntFromInterval(0,100);
            if (rng < cd.chance) this.currencyDrops.push({id: cd.id, amount: randomIntFromInterval(cd.minAmount, cd.maxAmount, true)});
        }

        //calculate item drops
        for (let id of ze.itemDrops)
        {
            let rng = randomIntFromInterval(0,100);
            if (rng < id.chance) this.itemDrops.push({id: id.id, amount: id.minAmount && id.maxAmount ? randomIntFromInterval(id.minAmount, id.maxAmount, true) : undefined});
        }
    }
    dealDamage(baseHitChance:number)
    {
        let miss = false;
        let crit = false;
        let stats = this.getStats().total;
        let dmg = stats.atk;

        let hitChance = (stats.acc / (this.level * 10)) * 100;
        let critChance = hitChance - 85;
        if (randomIntFromInterval(0,100) > baseHitChance + hitChance) miss = true; 
        if (randomIntFromInterval(0,100) < critChance) {dmg *= 1.5; crit = true; }
        return {dmg: dmg, miss: miss, crit: crit}
    }
    getName() { return this.name;}
    getStats() 
    {
        return { 
            base: 
            {
                hp: this.stats.hp,
                atk: this.stats.atk,
                def: this.stats.def,
                acc: this.stats.acc
            },
            total: 
            {
                hp: this.stats.hp,
                atk: this.stats.atk,
                def: this.stats.def,
                acc: this.stats.acc
            },
        }
    }
}

export interface _enemy
{
  _id: number,
  name: string,
  type: number,
  icon: string,
}
export interface _enemyType
{
  _id: number,
  name: string,
  atk: number,
  def: number,
  acc: number
}