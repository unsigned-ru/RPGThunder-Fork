import Discord from "discord.js";

export interface _class {
  _id: number,
  name: string,
  icon: string,
  description: string,
  items: {slot: number, item: number}[],
  types: number[]
}

export interface _currency
{
  _id: number,
  name: string,
  icon: string,
}
export interface _itemQuality
{
  _id: number,
  name: string,
  weight: number,
  icon: string,
}
export interface _itemType
{
  _id: number,
  name: string,
  atk: number,
  def: number,
  acc: number,
}
export interface _itemSlot
{
  _id: number,
  name: string,
  weight: number,
}
export interface _zone
{
  _id: number,
  name: string,
}