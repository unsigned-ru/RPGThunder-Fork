import Discord from "discord.js";
import { CC } from "./utils";
import { User} from "./classes/user";

export interface CurrencyInterface
{
  _id: number;
  name: string;
  icon: string;
}

export interface CommandInterface
{
  name: string;
  category: CC;
  executeWhileTravelling: boolean;
  mustBeRegistered?: boolean;
  aliases: string[];
  description: string;
  usage: string;
  cooldown?: {name: string; duration: number};
  ignoreCooldownReduction?: boolean;
  needOperator?: boolean; 
  execute(msg: Discord.Message, args: string[], user?: User): void;
}

export interface PatreonRankInterface
{
  _id: string;
  name: string;
  cooldown_reduction: number;
  travel_cooldown_reduction: number;
  daily_reward_multiplier: number;
  weekly_reward_multiplier: number;
  discordrole_id: string;
}

export interface BossDataInterface
{
  _id: number;
  name: string;
  max_hp: number;
  expReward: number;
  level: number;
  weightMultiplier: number;
  weightDistribution: {atk: number; def: number; acc: number};
  intro_dialogue: string[];
  abilities: {id: number; chance: number}[];
  currency_drops: { id: number; chance: number; minAmount: number; maxAmount: number }[];
  firstTimeDrops?: { id: number; chance: number; minAmount?: number; maxAmount?: number }[];
  item_drops: { id: number; chance: number; minAmount?: number; maxAmount?: number }[];
  portraitURL: string;
}

export interface StatObjectInterface 
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

