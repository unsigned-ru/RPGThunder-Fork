import Discord from 'discord.js';

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

export interface _class_ability
{
  id: number,
  name: string,
  dialogue: string,
  base_chance: number,
  max_atk: number,
  atk_multiplier: number,
  classes: string,
}

export interface _stats
{
  max_hp: number,
  current_hp: number,
  atk: number,
  bonus_atk: number,
  def: number,
  bonus_def: number,
  acc: number,
  bonus_acc: number,
}

export interface _user_equipment
{
  item: _item,
  bonus_atk: number,
  bonus_def: number,
  bonus_acc: number,
  slotDbName: string,
}

export interface _inventory_entry
{
  item: _item;
  bonus_atk: number,
  bonus_acc: number,
  bonus_def: number,
}

export interface _item{
  id: number,
  name: string,
  description: string,
  slot: number,
  type: number,
  atk: number,
  bonus_atk_min: number,
  bonus_atk_max: number,
  def: number,
  bonus_def_min: number,
  bonus_def_max: number,
  acc: number,
  bonus_acc_min: number,
  bonus_acc_max: number,
  level_req: number,
  sell_price: number,
  quality: number,
  icon_name: string,
  objType: "item"
}

export interface _command_cooldown{
  user_id: string,
  date: Date
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
  objType: "consumable"
}

export interface _zone
{
  id: number,
  name: string,
  boss_id: number,
}

export interface _crafting_recipe
{
  id: number,
  category: number,
  item_id: number,
  mat_costs: string,
}

export interface _material
{
  id:number,
  database_name: string,
  display_name: string,
  icon_name: string
  objType: "material"
}

export interface _equipment_slot
{
  id:number,
  database_name: string,
  display_name: string,
  icon_name: string
}

export interface _currency
{
  id:number,
  database_name: string,
  display_name: string,
  icon_name: string
}

export interface _zone_gather_drops
{
  id: number,
  zone_id: number,
  material_name: string,
  min_amount: number,
  max_amount: number,
}


export interface _zone_shop_entry
{
  id: number,
  zone_id: number,
  category_id: number,
  entry_id: number,
  entry_price: number,
}

export interface _shop_category
{
  id: number,
  name: string,
}

export interface _enemy
{
  id: number,
  name: string,

  base_level: number,
  base_hp: number,
  base_atk: number,
  base_def: number,
  base_acc: number,

  hp_increase: number,
  atk_increase: number,
  def_increase: number,
  acc_increase: number,

  encounter_zones: string,
  min_encounter_level: number,

  enemy_level_offset_min: number,
  enemy_level_offset_max: number,

  base_exp: number,
  exp_increase: number,
}

export interface _boss
{
  id: number,
  name: string,
  hp: number,
  atk: number,
  def: number,
  abilities: string,
  pre_dialogue: string,
}

export interface _boss_abbility
{
  id: number,
  name: string,
  atk_percentage: number,
  dialogue: string,
}

export interface _boss_currency_drop_data{
  id: number,
  boss_id: number,
  currency_name: string,
  amount_min: number,
  amount_max: number,
  drop_chance: number,
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

export interface _boss_material_drop_data{
  id: number,
  boss_id: number,
  material_name: string,
  amount_min: number,
  amount_max: number,
  drop_chance: number,
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

export interface _boss_item_drop_data{
  boss_id: number,
  item_id: number,
  drop_chance: number,
}

export interface _currency_drop{
  currency_name: string,
  amount: number,
}

export interface _material_drop{
  material_name: string,
  amount: number,
}

export interface _deck_card
{
  value: string,
  suit: string,
}

export interface blacklistedChannel
{
  id: number,
  channel_id: number,
}