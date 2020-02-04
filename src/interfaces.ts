import Discord, {  } from "discord.js";
import { CC } from "./utils";
import { User } from "./classes/user";

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