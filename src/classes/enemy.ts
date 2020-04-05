import {User} from "../classes/user";
import { ZoneEnemyInterface } from "./zone";
import { DataManager } from "./dataManager";
import { clamp, randomIntFromInterval, getTotalWeightForLevel, getAccFromLevelWeight } from "../utils";
import cf from "../config.json";
import { Actor } from "./actor";

export class Enemy extends Actor
{
    id: number;
    name: string;
    icon: string;
    type: EnemyTypeInterface;
    stats: { hp: number; atk: number; def: number; acc: number }
    currencyDrops: {id: number; amount: number}[] = [];
    itemDrops: {id: number; amount?: number}[] = [];
    exp: number;

    constructor(u: User, ze: ZoneEnemyInterface)
    {
        super(0, clamp(randomIntFromInterval(u.level-ze.level_offset.below,u.level+ze.level_offset.above,true),1,ze.max_level));
        this.id = ze.id;
        const ed = DataManager.getEnemy(ze.id)!;
        this.name = ed.name;
        this.icon = ed.icon;
        this.type = DataManager.getEnemyType(ed.type)!; 
        this.exp = ((5 * Math.exp(-((u.level-1)/24))) / 100 * u.getRequiredExp(this.level)) * (1 - clamp(0.05 * (u.level - this.level) ,0,1));
        //calculate stats
        const w = getTotalWeightForLevel(this.level) * ze.weight;
        this.stats = 
        {
            hp: (cf.stats.base.hp + ((this.level - 1) * cf.stats.increase.hp) * ze.weight),
            atk: w * this.type.atk,
            def: (w * this.type.def) * 2,
            acc: getAccFromLevelWeight(this.level, (w * this.type.acc), 0.85)
        };
        this.hp = this.stats.hp;

        //calculate currency drops
        for (const cd of ze.currencyDrops)
        {
            const rng = randomIntFromInterval(0,100);
            if (rng < cd.chance) this.currencyDrops.push({id: cd.id, amount: randomIntFromInterval(cd.minAmount, cd.maxAmount, true)});
        }

        //calculate item drops
        for (const id of ze.itemDrops)
        {
            const rng = randomIntFromInterval(0,100);
            if (rng < id.chance) this.itemDrops.push({id: id.id, amount: id.minAmount && id.maxAmount ? randomIntFromInterval(id.minAmount, id.maxAmount, true) : undefined});
        }
    }
    dealDamage(baseHitChance: number)
    {
        let miss = false;
        let crit = false;
        const stats = this.getStats().total;
        let dmg = stats.atk;

        const hitChance = (stats.acc / (this.level * 10)) * 100;
        const critChance = hitChance - 85;
        if (randomIntFromInterval(0,100) > baseHitChance + hitChance) miss = true; 
        if (randomIntFromInterval(0,100) < critChance) {dmg *= 1.5; crit = true; }
        return {dmg: dmg, miss: miss, crit: crit};
    }
    async getName() { return this.name;}
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
        };
    }
}

export interface EnemyInterface
{
  _id: number;
  name: string;
  type: number;
  icon: string;
}
export interface EnemyTypeInterface
{
  _id: number;
  name: string;
  atk: number;
  def: number;
  acc: number;
}