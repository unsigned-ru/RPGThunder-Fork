import * as cf from './config.json';

export function randomIntFromInterval(min:number, max:number) :number 
{
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function clamp(number:number,min:number, max:number) 
{
  return Math.min(Math.max(number, min), max);
}

export function getTotalWeightForLevel(lvl: number) 
{ 
  return (cf.stats.base.atk + ((lvl-1)*cf.stats.increase.atk)) + ((cf.stats.base.def + ((lvl-1)*cf.stats.increase.def)) /2) + ((((cf.stats.base.acc + ((lvl-1)*cf.stats.increase.acc)) / (lvl *10)) - 0.85) * (0.5 * (cf.stats.base.atk + ((lvl-1)*cf.stats.increase.atk)))); 
}

export function tempName(lvl:number, weight: number)
{
  return weight / ((((((8.5 * lvl)+1) / (lvl *10)) - 0.85) * (0.5 * (cf.stats.base.atk + ((lvl-1) * cf.stats.increase.atk)))) - ((((8.5 * lvl) / (lvl *10)) - 0.85) * (0.5 * (cf.stats.base.atk + ((lvl-1) * cf.stats.increase.atk)))));
}
export function round(n:number)
{
  return +n.toFixed(2);
}