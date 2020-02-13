import { BaseEffect, BaseBuffEffect, InstantDamageEffect, InstantHealingEffect, AbsorbBuffEffect, DamageOverTimeDebuffEffect, DamageReductionBuffEffect, HealingOverTimeBuffEffect } from "./tb_effects";

type AnyEffect = BaseEffect | BaseBuffEffect | InstantDamageEffect | InstantHealingEffect | AbsorbBuffEffect | DamageOverTimeDebuffEffect | DamageReductionBuffEffect;


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
        if (ed.effect == "DMG_REDUCTION") this.effects.push(new DamageReductionBuffEffect(ed));
        else if (ed.effect == "ABSORB") this.effects.push(new AbsorbBuffEffect(ed));
        else if (ed.effect == "HealingOverTime") this.effects.push(new HealingOverTimeBuffEffect(ed));
      }
      else if (ed.type == "DEBUFF")
      {
        if (ed.effect == "DamageOverTime") this.effects.push(new DamageOverTimeDebuffEffect(ed));
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