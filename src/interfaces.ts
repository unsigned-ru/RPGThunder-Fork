import Discord from 'discord.js';
import {blackjackSessions, client } from './main';
import {official_server_id, session_category_id} from "./config.json";
import {sleep, randomIntFromInterval, queryPromise} from "./utils"

export interface _client {
  c: Discord.Client,
  commands: Discord.Collection<any,any>
  [key: string]: any
}

export interface _class {
  id: number,
  name: string,
  base_hp: number,
  base_atk: number,
  base_def: number,
  base_acc: number,
  hp_increase: number,
  atk_increase: number,
  def_increase: number,
  acc_increase: number,
  description: string,
  starting_item_main_hand: number,
  starting_item_off_hand: number,
  starting_item_head: number,
  starting_item_chest: number,
  starting_item_legs: number,
  starting_item_feet: number,
  starting_item_trinket: number,
  allowed_item_types: string,
}

export interface _stats
{
  max_hp: number,
  current_hp: number,
  atk: number,
  def: number,
  acc: number,
}



export interface _item{
  id: number,
  name: string,
  description: string,
  slot: number,
  type: number,
  atk: number,
  def: number,
  acc: number,
  level_req: number,
  sell_price: number,
  quality: number,
  icon_name: string,
}

export interface _command_cooldown{
  user_id: string,
  date: Date
}

export interface _equipment_slot{
  id: number,
  name: string
}

export interface _item_type{
  id: number,
  name: string
}
export interface _item_quality{
  id: number,
  name: string
}

export interface _shop_item
{
  [key: string]: any; //used for ID
  price: number,
}

export interface _consumable
{
  id: number,
  name: string,
  hp: number,
  icon_name:string
}

export interface _enemy{
  id: number,
  name: string,

  base_hp: number,
  base_atk: number,
  base_def: number,
  base_acc: number,

  hp_increase: number,
  atk_increase: number,
  def_increase: number,
  acc_increase: number,

  encounter_level_range_min: number,
  encounter_level_range_max: number,

  enemy_level_offset_min: number,
  enemy_level_offset_max: number,

  base_exp: number,
  exp_multiplier: number,
}

export interface _enemy_currency_drop_data{
  id: number,
  enemy_id: number,
  currency_name: string,
  base_amount_min: number,
  base_amount_max: number,
  amount_increase: number,
  base_drop_chance: number,
  drop_chance_increase: number,
}

export interface _enemy_material_drop_data{
  id: number,
  enemy_id: number,
  material_name: string,
  base_amount_min: number,
  base_amount_max: number,
  amount_increase: number,
  base_drop_chance: number,
  drop_chance_increase: number
}


export interface _enemy_item_drop_data{
  enemy_id: number,
  item_id: number,
  base_chance: number,
  chance_increase: number,
}

export interface _enemy_currency_drop{
  currency_name: string,
  amount: number,
}
export interface _enemy_material_drop{
  material_name: string,
  amount: number,
}
export interface _deck_card
{
  value: string,
  suit: string,
}