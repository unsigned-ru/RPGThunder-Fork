import { clamp } from "../utils";
import cf from '../config.json';
import Discord from 'discord.js';
import { DamageReductionBuff, AbsorbBuff, BaseBuff, DamageImmunityBuff } from "./tb_effects";
import { StatObjectInterface } from "../interfaces";

export abstract class Actor
{
    hp: number;
    level = 1;
    constructor(hp?: number, level?: number)
    {
        if (level) this.level = level;
        if (hp) this.hp = hp;
        else this.hp = cf.stats.base.hp + ((this.level - 1) * cf.stats.increase.hp);
    }

    abstract getStats(): StatObjectInterface; 
    abstract async getName(): Promise<string>; 
    abstract dealDamage(baseHitChance: number): {dmg: number; miss: boolean; crit: boolean};
    /**
     * 
     * @param damageToTake The amount of damage that should be parsed through their defense, absorbs and damage reductions.
     * @param execute Should de damage be applied after calculation?
     */
    takeDamage(damageToTake: number, execute: boolean, buffs: Discord.Collection<Actor, BaseBuff[]> | undefined, ignoreDefence = false): {dmgTaken: number; died: boolean}
    {
        //parse damage through defence stat.
        const stats = this.getStats().total;
        let parsedDamage = ignoreDefence ? damageToTake : damageToTake - clamp(stats.def/2, 0, damageToTake * 0.85);
        let died = false;

        //get the buffs.
        const bfs = buffs?.get(this);
        
        //iterate over damage reduction buffs and get total damage reduction. Then apply the damage reduction to the incoming damage.
        let totalReduction = 0;
        if (bfs)
        {
            for (const bf of bfs.filter(x => x instanceof DamageReductionBuff) as DamageReductionBuff[]) totalReduction += bf.multiplier;
            for (const bf of bfs.filter(x => x instanceof DamageImmunityBuff) as DamageImmunityBuff[]) parsedDamage = 0;
        }
        parsedDamage = clamp(parsedDamage - parsedDamage * totalReduction, 0, Number.POSITIVE_INFINITY);

        if (execute)
        { 
            //check if we have a shield / shields. If so iterate over them and take damage on the shields first.
            let damageToDo = parsedDamage;
            //iterate over shield buffs sorted by ascending duration to remove the nearest expired first in benefit of the player.
            if (bfs) for (const bf of (bfs.filter(x => x instanceof AbsorbBuff) as AbsorbBuff[]).sort((a,b) => a.duration - b.duration))
            {
                if (damageToDo == 0) break;
                if (damageToDo > bf.health)
                {
                    //reduce damage by absorb amount.
                    damageToDo -= bf.health;
                    //remove buff because it has been drained.
                    bfs.splice(bfs.indexOf(bf),1);
                }
                else { bf.health -= damageToDo; damageToDo = 0; }
            }

            //Buffs are gone, remove from actual health now.
            this.hp = clamp(this.hp-damageToDo,0,Number.POSITIVE_INFINITY);
        }
        if (this.hp <= 0) { died = true;}
        return {dmgTaken: parsedDamage, died: died};
    }
    takeHealing(healingToTake: number, execute: boolean): number
    {
        const hpBefore = this.hp;
        const hpToSet = clamp(this.hp+healingToTake,0,this.getStats().total.hp);
        if (execute) this.hp = hpToSet;
        return Math.abs(hpToSet - hpBefore);
    }
}