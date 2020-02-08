import Discord from "discord.js";
import cf from "../config.json"
import { _bossData, Ability, BossAbility } from "../interfaces.js";
import { DataManager } from "./dataManager.js";
import { getTotalWeightForLevel, getAccFromLevelWeight, randomIntFromInterval } from "../utils.js";

export class Boss
{
    id: number;
    name: string;
    level: number;
    stats: 
    {
        max_hp: number,
        atk: number,
        def: number,
        acc: number,
    }
    hp: number;
    dialogue: string[];
    abilities: BossAbility[];

    currencyDrops: {id: number, amount: number}[] = [];
    itemDrops: {id: number, amount: number}[] = [];

    constructor(bd: _bossData)
    {
        this.id = bd._id;
        this.name = bd.name;
        this.level = bd.level;
        this.dialogue = bd.intro_dialogue;
        this.abilities = bd.abilities.map(x => new BossAbility(DataManager.getAbility(x.id), x.chance));
        let weight = getTotalWeightForLevel(this.level) * bd.weightMultiplier;
        this.stats = 
        {
            max_hp: bd.max_hp,
            atk: weight * bd.weightDistribution.atk,
            def: (weight * bd.weightDistribution.def) * 2,
            acc: getAccFromLevelWeight(this.level, weight * bd.weightDistribution.acc)
        }
        this.hp = this.stats.max_hp;

       //calculate currency drops
    //    for (let cd of bd.currencyDrops) if (randomIntFromInterval(0,100) <= cd.chance) this.currencyDrops.push({id: cd.id, amount: randomIntFromInterval(cd.minAmount, cd.maxAmount, true)});

       //calculate item drops
    //    for (let id of bd.itemDrops) if (randomIntFromInterval(0,100) <= id.chance) this.itemDrops.push({id: id.id, amount: id.minAmount && id.maxAmount ? randomIntFromInterval(id.minAmount, id.maxAmount, true) : 1});

    }

    getHealthPercentage() { return this.hp / this.stats.max_hp * 100; }
}

