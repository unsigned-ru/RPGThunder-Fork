import Discord from "discord.js";
import { CC, parseComblatLogString, round, randomIntFromInterval } from "./utils";
import { User} from "./classes/user";

export interface _currency
{
  _id: number,
  name: string,
  icon: string,
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
  expReward: number,
  level: number,
  weightMultiplier: number,
  weightDistribution: {atk: number, def: number, acc: number}
  intro_dialogue: string[],
  abilities: {id: number, chance: number}[],
  currency_drops: { id:number, chance: number, minAmount: number, maxAmount:number }[],
  item_drops: { id:number, chance: number, minAmount?: number, maxAmount?: number }[]
}

export interface statObject 
{
  base: {
      hp: number;
      atk: number;
      def: number;
      acc: number;
  };
  gear?: {
      atk: number;
      def: number;
      acc: number;
  };
  total: {
      hp: number;
      atk: number;
      def: number;
      acc: number;
  };
}

