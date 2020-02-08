import Discord, {  } from "discord.js";
import { CC } from "./utils";
import { User } from "./classes/user";

type AnyEffect = BaseEffect | BaseBuff | InstantDamageEffect | InstantHealingEffect | AbsorbBuff | DamageOverTimeDebuff | DamageReductionBuff;

export interface _currency
{
  _id: number,
  name: string,
  icon: string,
}

export class Ability
{
  id: number;
  name: string;
  icon: string;
  description: string = "";
  cooldown: number;
  effects: AnyEffect[] = [];

  constructor(dbObject: any)
  {
    this.id = dbObject._id;
    this.name = dbObject.name;
    this.cooldown = dbObject.cooldown;
    this.icon = dbObject.icon;
    this.description = dbObject.description;


    //parse the effects.
    for (let ed of dbObject.effects)
    {
      if (ed.type == "INSTANT")
      {
          if(ed.effect == "DMG") this.effects.push(new InstantDamageEffect(ed));
          if(ed.effect == "HEAL") this.effects.push(new InstantHealingEffect(ed));
      }
      else if (ed.type == "BUFF")
      {
        if (ed.effect == "DMG_REDUCTION") this.effects.push(new DamageReductionBuff(ed));
        else if (ed.effect == "ABSORB") this.effects.push(new AbsorbBuff(ed));
        else if (ed.effect == "HealingOverTime") this.effects.push(new HealingOverTimeBuff(ed));
      }
      else if (ed.type == "DEBUFF")
      {
        if (ed.effect == "DamageOverTime") this.effects.push(new DamageOverTimeDebuff(ed));
      }
    }
  }
}

export class UserAbility
{
  data: Ability;
  remainingCooldown = 0;

  constructor(ability: Ability)
  {
    this.data = ability;
  }
}

export class BossAbility
{
  data: Ability;
  remainingCooldown = 0;
  chance: number;
  constructor(ability: Ability, chance: number)
  {
    this.data = ability;
    this.chance = chance
  }
}

export class BaseEffect
{
  target: string;
  combatLog: string;

  constructor(dbObject: any)
  {
    this.target = dbObject.target;
    this.combatLog = dbObject.combatLog;
  }
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
}

export class BaseBuff extends BaseEffect
{
  duration: number;
  interval: number = 0;

  constructor(dbObject:any) 
  {
    super(dbObject);
    this.duration = dbObject.duration;
    if (dbObject.interval) this.interval = dbObject.interval;
  }
}

export class DamageOverTimeDebuff extends BaseBuff
{
  spread: boolean = true;
  successChance: number;

  constructor(dbObject:any)
  {
    super(dbObject);
    if (dbObject.spread) this.spread = dbObject.spread;
    this.successChance = dbObject.successChance;
  }
}

export class HealingOverTimeBuff extends BaseBuff
{
  spread: boolean = true;
  successChance: number;

  constructor(dbObject:any)
  {
    super(dbObject);
    if (dbObject.spread) this.spread = dbObject.spread;
    this.successChance = dbObject.successChance;
  }
}

export class AbsorbBuff extends BaseBuff
{
  healthPercentage?: number;

  constructor(dbObject: any)
  {
    super(dbObject);
    if (dbObject.healthPercentage) this.healthPercentage = dbObject.healthPercentage;
  }
}

export class DamageReductionBuff extends BaseBuff
{
  multiplier: number;

  constructor(dbObject: any)
  {
    super(dbObject);
    this.multiplier = dbObject.multiplier;
  }
}


export interface _command
{
  name: string,
  category: CC,
  executeWhileTravelling: boolean,
  mustBeRegistered?: boolean,
  aliases: string[],
  description: string,
  usage: string,
  cooldown?: {name: string, duration: number},
  needOperator?: boolean, 
  execute(msg: Discord.Message, args: string[], user?: User): void
}

export interface _bossData
{
  _id: number,
  name: string,
  max_hp: number,
  level: number,
  weightMultiplier: number,
  weightDistribution: {atk: number, def: number, acc: number}
  intro_dialogue: string[],
  abilities: {id: number, chance: number}[],
  currencyDrops: { id:number, chance: number, minAmount: number, maxAmount:number }[],
  itemDrops: { id:number, chance: number, minAmount?: number, maxAmount?: number }[]
}