import { Ability } from "./ability";
import { Actor } from "./actor";
import { parseComblatLogString, round, randomIntFromInterval, clamp, displayRound } from "../utils";
import Discord from 'discord.js';

export abstract class BaseEffect
{
  target: string;
  combatLog: string;
  maxDamage: number;
  maxHealing: number;

  constructor(dbObject: any)
  {
    this.target = dbObject.target;
    this.combatLog = dbObject.combatLog;
    this.maxDamage = dbObject.maxDamage;
    this.maxHealing = dbObject.maxHealing;
  }

  abstract execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor,BaseBuff[]>): boolean;
  
}

export class InstantDamageEffect extends BaseEffect
{
  multiplier: number;
  baseHitChance: number;

  constructor(dbObject: any) 
  {
    super(dbObject);
    this.multiplier = dbObject.multiplier;
    this.baseHitChance = dbObject.baseHitChance; 
  }

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor,BaseBuff[]>): boolean
  {
    const {dmg, crit, miss} = user.dealDamage(this.baseHitChance);
    if (miss) {log.push(`\`${user.getName()}\` tried to attack \`${targets.map(x => x.getName()).slice(0,5).join(", ")}${targets.length > 5 ? "...": ""}\` but **missed**!`); return false;}
    let totalDamage = 0;
    for (const t of targets) totalDamage += t.takeDamage(clamp(dmg * this.multiplier, 0, this.maxDamage), true, buffs).dmgTaken;

    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __🗡️${displayRound(totalDamage)}__ ${crit ? "**[CRIT]**": ""}`);
    return true;
  }

}

export class InstantHealingEffect extends BaseEffect
{
  multiplier: number;
  baseHitChance: number;

  constructor(dbObject: any) 
  {
    super(dbObject);
    this.multiplier = dbObject.multiplier;
    this.baseHitChance = dbObject.baseHitChance; 
  }

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[]): boolean
  {
    const {dmg, crit, miss} = user.dealDamage(this.baseHitChance);
    if (miss) {log.push(`\`${user.getName()}\` tried to heal \`${targets.map(x => x.getName()).slice(0,5).join(", ")}${targets.length > 5 ? "...": ""}\` but **missed**!`); return false;}
    let totalHealing = 0;
    for (const t of targets) totalHealing += t.takeHealing(clamp(dmg * this.multiplier, 0, this.maxDamage), true);
    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __❤️${displayRound(totalHealing)}__ ${crit ? "**[CRIT]**": ""}`);

    return true;
  }
}

export class InstantDrainLifeEffect extends BaseEffect
{
  multiplier: number;
  healingMultiplier: number;
  baseHitChance: number;

  constructor(dbObject: any) 
  {
    super(dbObject);
    this.multiplier = dbObject.multiplier;
    this.healingMultiplier = dbObject.healingMultiplier;
    this.baseHitChance = dbObject.baseHitChance; 
  }

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor,BaseBuff[]>): boolean
  {
    const {dmg, crit, miss} = user.dealDamage(this.baseHitChance);
    if (miss) {log.push(`\`${user.getName()}\` tried to attack \`${targets.map(x => x.getName()).slice(0,5).join(", ")}${targets.length > 5 ? "...": ""}\` but **missed**!`); return false;}
    let totalDamage = 0;
    for (const t of targets) totalDamage += t.takeDamage(clamp(dmg * this.multiplier, 0, this.maxDamage), true, buffs).dmgTaken;
    const healingTaken = user.takeHealing(clamp(totalDamage * this.healingMultiplier, 0, this.maxHealing), true);
    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __🗡️${displayRound(totalDamage)}__ + __❤️${displayRound(healingTaken)}__${crit ? "**[CRIT]**": ""}`);
    return true;
  }

}

export abstract class BaseBuffEffect extends BaseEffect
{
  duration: number;
  interval = 0;

  constructor(dbObject: any) 
  {
    super(dbObject);
    this.duration = dbObject.duration;
    if (dbObject.interval) this.interval = dbObject.interval;
  }

  applyBuff(buffs: Discord.Collection<Actor, BaseBuff[]>, buff: BaseBuff, target: Actor)
  {
    //setup buffs if there is no array for this actor yet.
    if (!buffs.get(target)) buffs.set(target,[]);
    const tbs = buffs.get(target); if (!tbs) return false;

    //check if the buff already exists, if it does extend its duration.
    //if not add a new buff.
    const existingBuff = tbs.find(x => x.abilityid == buff.abilityid);
    if (existingBuff) existingBuff.duration += buff.duration;
    else tbs.push(buff);
  }

}
export abstract class BaseBuff
{
  abilityid: number;
  duration: number;
  interval = 0

  constructor(abilityid: number, duration: number, interval: number) 
  {
    this.abilityid = abilityid;
    this.duration = duration;
    this.interval = interval;
  }
}

export class DamageOverTimeDebuffEffect extends BaseBuffEffect
{
  spread = true;
  successChance: number;
  multiplier: number;
  combatLogTick: string;

  constructor(dbObject: any)
  {
    super(dbObject);
    if (dbObject.spread) this.spread = dbObject.spread;
    this.successChance = dbObject.successChance;
    this.multiplier = dbObject.multiplier;
    this.combatLogTick = dbObject.combatLogTick;
  }

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor, BaseBuff[]>): boolean 
  { 
    //check if it misses.
    if (randomIntFromInterval(0,100) > this.successChance) { log.push(`\`${user.getName()}\` tried to debuff \`${targets.map(x => x.getName()).slice(0,5).join(", ")}${targets.length > 5 ? "...": ""}\` but **missed**!`); return false; }

    //we didn't miss. Calculate damage.
    // eslint-disable-next-line prefer-const
    let {dmg, crit} = user.dealDamage(1); //dealdamage with a 100% hitchance.
    dmg *= this.multiplier;
    let totalDamage = 0;

    for (const t of targets)
    {
      //parse damage through defense of target. And add it to total damage to display in log.
      let {dmgTaken} = t.takeDamage(clamp(dmg, 0, this.maxDamage),false, buffs);
      if (!this.spread) totalDamage += dmgTaken * this.duration;
      else 
      {
        totalDamage += dmgTaken;
        dmgTaken /= this.duration;
      }

      //create and apply the debuff.
      const debuff = new DamageOverTimeBuff(ability.id, this.duration, this.interval, dmgTaken, this.combatLogTick);
      this.applyBuff(buffs, debuff, t);
    }
    //add to the log.
    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __🗡️ ${displayRound(totalDamage)} over ${this.duration} rounds.__ ${crit ? "**[CRIT]**": ""}`);

    return true;
  }
}

export class DamageOverTimeBuff extends BaseBuff
{
  damage: number;
  combatLogTick: string;
  constructor(abilityid: number, duration: number, interval: number, damage: number, combatLogTick: string) 
  {
    super(abilityid, duration, interval);
    this.damage = damage;
    this.combatLogTick = combatLogTick;
  }
}

export class HealingOverTimeBuffEffect extends BaseBuffEffect
{
  spread = true;
  successChance: number;
  multiplier: number;
  combatLogTick: string;

  constructor(dbObject: any)
  {
    super(dbObject);
    if (dbObject.spread) this.spread = dbObject.spread;
    this.successChance = dbObject.successChance;
    this.multiplier = dbObject.multiplier;
    this.combatLogTick = dbObject.combatLogTick;
  }

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor, BaseBuff[]>): boolean 
  { 
    //check if it misses.
    if (randomIntFromInterval(0,100) > this.successChance) { log.push(`\`${user.getName()}\` tried to buff \`${targets.map(x => x.getName()).slice(0,5).join(", ")}${targets.length > 5 ? "...": ""}\` but **missed**!`); return false; }

    //we didn't miss. Calculate healing.
    // eslint-disable-next-line prefer-const
    let {dmg, crit} = user.dealDamage(1);
    dmg = clamp(dmg * this.multiplier, 0, this.maxHealing);
    let totalHealing = 0;

    for (const t of targets)
    {
      if (!this.spread) totalHealing += dmg * this.duration;
      else 
      {
        totalHealing += dmg;
        dmg /= this.duration;
      }

      //create and apply the debuff.
      const buff = new HealingOverTimeBuff(ability.id, this.duration, this.interval, dmg, this.combatLogTick);
      this.applyBuff(buffs, buff, t);
    }
    //add to the log.
    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __❤️ ${displayRound(dmg)} over ${this.duration} rounds.__ ${crit ? "**[CRIT]**": ""}`);

    return true;
  }
}

export class HealingOverTimeBuff extends BaseBuff
{
  healing: number;
  combatLogTick: string;

  constructor(abilityid: number, duration: number, interval: number, healing: number, combatLogTick: string) 
  {
    super(abilityid, duration, interval);
    this.combatLogTick = combatLogTick;
    this.healing = healing;
  }
}


export class AbsorbBuffEffect extends BaseBuffEffect
{
  healthPercentage?: number;
  amount?: number;
  constructor(dbObject: any)
  {
    super(dbObject);
    if (dbObject.healthPercentage) this.healthPercentage = dbObject.healthPercentage;
    if (dbObject.amount) this.amount = dbObject.amount;
  }

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor, BaseBuff[]>): boolean
  {
    let totalAbsorb = 0;
    for (const t of targets)
    {
      const absorb = 
      this.healthPercentage ? clamp((this.healthPercentage! / 100) * t.getStats().total.hp, 0, this.maxHealing)
      : this.amount ? clamp(this.amount, 0, this.maxHealing)
        : 0;

      const buff = new AbsorbBuff(ability.id,this.duration,this.interval, absorb);
      this.applyBuff(buffs,buff,t);
      totalAbsorb += absorb;
    }
    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __💙${displayRound(totalAbsorb)}__`);
    return true;
  }
}
export class AbsorbBuff extends BaseBuff
{
  health: number;
  constructor(abilityid: number, duration: number, interval: number, health: number) 
  {
    super(abilityid, duration, interval);
    this.health = health;
  }
}

export class DamageReductionBuffEffect extends BaseBuffEffect
{
  multiplier: number;

  constructor(dbObject: any)
  {
    super(dbObject);
    this.multiplier = dbObject.multiplier;
  }

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor, BaseBuff[]>): boolean
  {
    for (const t of targets)
    {
      const buff = new DamageReductionBuff(ability.id,this.duration,this.interval, this.multiplier);
      this.applyBuff(buffs,buff,t);
    }
    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __💙${displayRound(this.multiplier * 100)}% DMG reduction for ${this.duration} rounds.__`);
    return true;
  }
}

export class DamageReductionBuff extends BaseBuff
{
  multiplier: number;
  constructor(abilityid: number, duration: number, interval: number, multiplier: number) 
  {
    super(abilityid, duration, interval);
    this.multiplier = multiplier;
  }
}


export class DamageImmunityBuffEffect extends BaseBuffEffect
{
  successChance: number;

  constructor(dbObject: any)
  {
    super(dbObject);
    this.successChance = dbObject.successChance;
  }

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor, BaseBuff[]>): boolean
  {
    //check if we fail to activate the ability
    if (randomIntFromInterval(0,100) > this.successChance) { log.push(`\`${user.getName()}\` tried to buff \`${targets.map(x => x.getName()).slice(0,5).join(", ")}${targets.length > 5 ? "...": ""}\` but **missed**!`); return false; }
    for (const t of targets)
    {
      const buff = new DamageImmunityBuff(ability.id,this.duration,this.interval);
      this.applyBuff(buffs,buff,t);
    }
    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __Immune to damage for ${this.duration} rounds.__`);
    return true;
  }
}

export class DamageImmunityBuff extends BaseBuff
{
  constructor(abilityid: number, duration: number, interval: number) 
  {
    super(abilityid, duration, interval);
  }
}