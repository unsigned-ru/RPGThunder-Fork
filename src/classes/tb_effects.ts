import { Ability } from "./ability";
import { Actor } from "./actor";
import { parseComblatLogString, round, randomIntFromInterval } from "../utils";
import Discord from 'discord.js';

export abstract class BaseEffect
{
  target: string;
  combatLog: string;

  constructor(dbObject: any)
  {
    this.target = dbObject.target;
    this.combatLog = dbObject.combatLog;
  }

  abstract execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor,BaseBuff[]>) :boolean;
  
}

export class InstantDamageEffect extends BaseEffect
{
  multiplier: number;
  baseHitChance: number;

  constructor(dbObject:any) 
  {
    super(dbObject);
    this.multiplier = dbObject.multiplier;
    this.baseHitChance = dbObject.baseHitChance; 
  }

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor,BaseBuff[]>) :boolean
  {
    let {dmg, crit, miss} = user.dealDamage(this.baseHitChance);
    if (miss) {log.push(`\`${user.getName()}\` tried to attack \`${targets.map(x => x.getName()).slice(0,5).join(", ")}${targets.length > 5 ? "...": ""}\` but **missed**!`); return false;}
    let totalDamage = 0;
    for (let t of targets) totalDamage += t.takeDamage(dmg, true, buffs).dmgTaken;

    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __🗡️${round(totalDamage)}__ ${crit ? "**[CRIT]**": ""}`);
    return true;
  }

}

export class InstantHealingEffect extends BaseEffect
{
  multiplier: number;
  baseHitChance: number;

  constructor(dbObject:any) 
  {
    super(dbObject);
    this.multiplier = dbObject.multiplier;
    this.baseHitChance = dbObject.baseHitChance; 
  }

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor,BaseBuff[]>) :boolean
  {
    let {dmg, crit, miss} = user.dealDamage(this.baseHitChance);
    if (miss) {log.push(`\`${user.getName()}\` tried to heal \`${targets.map(x => x.getName()).slice(0,5).join(", ")}${targets.length > 5 ? "...": ""}\` but **missed**!`); return false;}
    let totalHealing = 0;
    for (let t of targets) totalHealing += t.takeHealing(dmg,true);
    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __🗡️${round(totalHealing)}__ ${crit ? "**[CRIT]**": ""}`);

    return true;
  }
}

export abstract class BaseBuffEffect extends BaseEffect
{
  duration: number;
  interval: number = 0;

  constructor(dbObject:any) 
  {
    super(dbObject);
    this.duration = dbObject.duration;
    if (dbObject.interval) this.interval = dbObject.interval;
  }

  applyBuff(buffs: Discord.Collection<Actor, BaseBuff[]>, buff: BaseBuff, target: Actor)
  {
    //setup buffs if there is no array for this actor yet.
    if (!buffs.get(target)) buffs.set(target,[]);
    let tbs = buffs.get(target); if (!tbs) return false;

    //check if the buff already exists, if it does extend its duration.
    //if not add a new buff.
    let existingBuff = tbs.find(x => x.abilityid == buff.abilityid);
    if (existingBuff) existingBuff.duration += buff.duration;
    else tbs.push(buff);
  }

}
export abstract class BaseBuff
{
  abilityid: number;
  duration: number;
  interval: number = 0

  constructor(abilityid: number, duration: number, interval:number) 
  {
    this.abilityid = abilityid;
    this.duration = duration;
    this.interval = interval;
  }
}

export class DamageOverTimeDebuffEffect extends BaseBuffEffect
{
  spread: boolean = true;
  successChance: number;
  multiplier: number;
  combatLogTick: string;

  constructor(dbObject:any)
  {
    super(dbObject);
    if (dbObject.spread) this.spread = dbObject.spread;
    this.successChance = dbObject.successChance;
    this.multiplier = dbObject.multiplier;
    this.combatLogTick = dbObject.combatLogTick;
  }

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor, BaseBuff[]>) :boolean 
  { 
    //check if it misses.
    if (randomIntFromInterval(0,100) > this.successChance * 100) { log.push(`\`${user.getName()}\` tried to debuff \`${targets.map(x => x.getName()).slice(0,5).join(", ")}${targets.length > 5 ? "...": ""}\` but **missed**!`); return false; }

    //we didn't miss. Calculate damage.
    let {dmg, crit, miss} = user.dealDamage(1);
    dmg *= this.multiplier;
    let totalDamage = 0;

    for (let t of targets)
    {
      //parse damage through defense of target. And add it to total damage to display in log.
      let {dmgTaken} = t.takeDamage(dmg,false, buffs);
      if (!this.spread) totalDamage += dmgTaken * this.duration;
      else 
      {
        totalDamage += dmgTaken;
        dmgTaken /= this.duration;
      }

      //create and apply the debuff.
      let debuff = new DamageOverTimeDebuff(ability.id, this.duration, this.interval, dmgTaken, this.combatLogTick);
      this.applyBuff(buffs, debuff, t);
    }
    //add to the log.
    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __🗡️ ${round(totalDamage)} over ${this.duration} rounds.__ ${crit ? "**[CRIT]**": ""}`);

    return true;
  }
}

export class DamageOverTimeDebuff extends BaseBuff
{
  damage: number;
  combatLogTick: string;
  constructor(abilityid: number, duration: number, interval:number, damage: number, combatLogTick: string) 
  {
    super(abilityid, duration, interval)
    this.damage = damage;
    this.combatLogTick = combatLogTick;
  }
}

export class HealingOverTimeBuffEffect extends BaseBuffEffect
{
  spread: boolean = true;
  successChance: number;
  multiplier: number;
  combatLogTick: string;

  constructor(dbObject:any)
  {
    super(dbObject);
    if (dbObject.spread) this.spread = dbObject.spread;
    this.successChance = dbObject.successChance;
    this.multiplier = dbObject.multiplier;
    this.combatLogTick = dbObject.combatLogTick;
  }

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor, BaseBuff[]>) :boolean 
  { 
    //check if it misses.
    if (randomIntFromInterval(0,100) > this.successChance * 100) { log.push(`\`${user.getName()}\` tried to buff \`${targets.map(x => x.getName()).slice(0,5).join(", ")}${targets.length > 5 ? "...": ""}\` but **missed**!`); return false; }

    //we didn't miss. Calculate healing.
    let {dmg, crit, miss} = user.dealDamage(1);
    dmg *= this.multiplier;
    let totalHealing = 0;

    for (let t of targets)
    {
      if (!this.spread) totalHealing += dmg * this.duration;
      else 
      {
        totalHealing += dmg;
        dmg /= this.duration;
      }

      //create and apply the debuff.
      let buff = new HealingOverTimeBuff(ability.id, this.duration, this.interval, dmg, this.combatLogTick);
      this.applyBuff(buffs, buff, t);
    }
    //add to the log.
    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __❤️ ${round(dmg)} over ${this.duration} rounds.__ ${crit ? "**[CRIT]**": ""}`);

    return true;
  }
}

export class HealingOverTimeBuff extends BaseBuff
{
  healing: number;
  combatLogTick: string;

  constructor(abilityid: number, duration: number, interval:number, healing: number, combatLogTick: string) 
  {
    super(abilityid, duration, interval)
    this.combatLogTick = combatLogTick;
    this.healing = healing;
  }
}


export class AbsorbBuffEffect extends BaseBuffEffect
{
  healthPercentage?: number;

  constructor(dbObject: any)
  {
    super(dbObject);
    if (dbObject.healthPercentage) this.healthPercentage = dbObject.healthPercentage;
  }

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor, BaseBuff[]>) :boolean
  {
    let totalAbsorb = 0;
    for (let t of targets)
    {
      let absorb = this.healthPercentage! * t.getStats().total.hp;
      let buff = new AbsorbBuff(ability.id,this.duration,this.interval, absorb);
      this.applyBuff(buffs,buff,t);
      totalAbsorb += absorb;
    }
    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __💙${round(totalAbsorb)}__`);
    return true;
  }
}
export class AbsorbBuff extends BaseBuff
{
  health: number;
  constructor(abilityid: number, duration: number, interval:number, health: number) 
  {
    super(abilityid, duration, interval)
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

  execute(ability: Ability, user: Actor, targets: Actor[], log: string[], buffs: Discord.Collection<Actor, BaseBuff[]>) :boolean
  {
    for (let t of targets)
    {
      let buff = new DamageReductionBuff(ability.id,this.duration,this.interval, this.multiplier);
      this.applyBuff(buffs,buff,t);
    }
    log.push(`${parseComblatLogString(this.combatLog,user,targets)} __💙${round(this.multiplier * 100)}% DMG reduction for ${this.duration} rounds.__`);
    return true;
  }
}
export class DamageReductionBuff extends BaseBuff
{
  multiplier: number;
  constructor(abilityid: number, duration: number, interval:number, multiplier: number) 
  {
    super(abilityid, duration, interval)
    this.multiplier = multiplier;
  }
}