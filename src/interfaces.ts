import Discord from 'discord.js';
//interfaces

export interface _client {
  c: Discord.Client,
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
  starting_item_trinket: number
}

export interface _equipment_slot{
  id: number,
  name: string
}

export interface _item_type{
  id: number,
  name: string
}
export class _user_stats{
  level: number = 0;
  max_hp: number = 0;
  hp: number = 0;

  base_atk: number = 0;
  base_def: number = 0;
  base_acc: number = 0;

  equipment_atk: number = 0;
  equipment_def: number = 0;
  equipment_acc: number = 0;

  total_atk: number = 0;
  total_def: number = 0;
  total_acc: number = 0;
}

