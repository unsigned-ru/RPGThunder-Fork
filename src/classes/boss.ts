
import { BossDataInterface} from "../interfaces.js";
import { DataManager } from "./dataManager.js";
import { getTotalWeightForLevel, getAccFromLevelWeight, randomIntFromInterval } from "../utils.js";
import { Actor } from "./actor.js";
import { BossAbility } from "./ability.js";

export class Boss extends Actor
{
    id: number;
    name: string;
    expReward: number;
    stats: 
    {
        max_hp: number;
        atk: number;
        def: number;
        acc: number;
    }
    dialogue: string[];
    abilities: BossAbility[];

    currencyDrops: {id: number; amount: number}[] = [];
    itemDrops: {id: number; amount: number}[] = [];

    constructor(bd: BossDataInterface)
    {
        super(bd.max_hp, bd.level);
        this.id = bd._id;
        this.name = bd.name;
        this.dialogue = bd.intro_dialogue;
        this.abilities = bd.abilities.map(x => new BossAbility(DataManager.getAbility(x.id), x.chance));
        const weight = getTotalWeightForLevel(this.level) * bd.weightMultiplier;
        this.expReward = bd.expReward;
        this.stats = 
        {
            // eslint-disable-next-line @typescript-eslint/camelcase
            max_hp: bd.max_hp,
            atk: weight * bd.weightDistribution.atk,
            def: (weight * bd.weightDistribution.def) * 2,
            acc: getAccFromLevelWeight(this.level, weight * bd.weightDistribution.acc)
        };

        // calculate currency drops
        for (const cd of bd.currency_drops) if (randomIntFromInterval(0,100) <= cd.chance) this.currencyDrops.push({id: cd.id, amount: randomIntFromInterval(cd.minAmount, cd.maxAmount, true)});

        // calculate item drops
        for (const id of bd.item_drops) if (randomIntFromInterval(0,100) <= id.chance) this.itemDrops.push({id: id.id, amount: id.minAmount && id.maxAmount ? randomIntFromInterval(id.minAmount, id.maxAmount, true) : 1});

    }

    getHealthPercentage() { return this.hp / this.stats.max_hp * 100; }

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
    getName() { return this.name;}
    getStats() 
    {
        return { 
            base: 
            {
                hp: this.stats.max_hp,
                atk: this.stats.atk,
                def: this.stats.def,
                acc: this.stats.acc
            },
            total: 
            {
                hp: this.stats.max_hp,
                atk: this.stats.atk,
                def: this.stats.def,
                acc: this.stats.acc
            },
        };
    }
}

