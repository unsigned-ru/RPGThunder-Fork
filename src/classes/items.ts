import { getTotalWeightForLevel, getAccFromLevelWeight, round } from "../utils";
import { DataManager } from "./dataManager";

export type _anyItem = _item | _consumableItem | _equipmentItem | _materialItem;
export type anyItem = ConsumableItem | EquipmentItem | MaterialItem; 

export class _item
{
  _id: number;
  name: string;
  description: string;
  icon: string;
  quality: number;
  soulbound?: boolean;
  sell_price: number;

  constructor(dbObject :any)
  {
    this._id = dbObject._id;
    this.name = dbObject.name;
    this.description = dbObject.description;
    this.icon = dbObject.icon;
    this.quality = dbObject.quality;
    this.soulbound = dbObject.soulbound;
    this.sell_price = dbObject.sell_price;
  }

  public getDisplayString(){return `${this._id} - ${this.icon} __${this.name}__`;}
  public getDataString()
  {
    let returnVal = "";
    returnVal += `\n[${this.getQuality().icon}`;
    if (this instanceof _equipmentItem) 
    {
       returnVal += ` | 🗡️ ${round(this.stats.base.atk)} | 🛡️ ${round(this.stats.base.def)} | ⚡ ${round(this.stats.base.acc)}`
    }
    else if (this instanceof _consumableItem) returnVal += `` 
    else if (this instanceof _materialItem) returnVal += ``				
    returnVal+= `]`;
    return returnVal;
  }
  public getQuality() {  return DataManager.getItemQuality(this.quality); }
}

export class _equipmentItem extends _item
{
  slots: number[];
  two_hand?: boolean;
  type: number;
  level_requirement: number;

  stats = 
  {
    base: { atk: 0, def: 0, acc: 0 },
    crafting: { atk: 0, def: 0, acc: 0 }
  };

  constructor(dbObject:any)
  {
    super(dbObject);

    this.slots = dbObject.slots;
    this.two_hand = dbObject.two_hand;
    this.type = dbObject.type;
    this.level_requirement = dbObject.level_requirement;
    
    this.calculateStats();
  }

  private calculateStats() 
  {
    //total user stat weight for itemreq level * the quality multiplier to get the amount of weight to distribute.
    //Also multiplied by the slot weight.
    var weight = (getTotalWeightForLevel(this.level_requirement) * this.getQuality().weight) * this.getSlots()[0].weight;
    if (this.two_hand) weight *= 2;
    //get the item type.
    var type = this.getType()

    this.stats.base.atk = weight * type.atk;
    this.stats.base.def = (weight * type.def) * 2;
    this.stats.base.acc = getAccFromLevelWeight(this.level_requirement, (weight * type.acc));

    this.stats.crafting.atk = weight * 0.1 * type.atk;
    this.stats.crafting.def = weight * 0.1 * type.def * 2;
    this.stats.crafting.acc = getAccFromLevelWeight(this.level_requirement, (weight * 0.1 * type.acc));
  }
  public getType() { return DataManager.getItemType(this.type); }
  public getSlots() { return DataManager.getItemSlots(this.slots); }
} 

export class _materialItem extends _item
{
  constructor(dbObject:any)
  {
    super(dbObject);
  }
} 
export class _consumableItem extends _item
{
  effects: {effect: string, [key:string]:any}[]
  constructor(dbObject:any)
  {
    super(dbObject);
    this.effects = dbObject.effects;
  }

  getEffectsString()
  {
    let rv = ""
    for (let e of this.effects)
    {
      let pvstring = Object.keys(e).filter(x => x != "effect").map(x => `\`${x}:${e[x]}\``).join(" ,");
      rv += `\`${e.effect}\`: {${pvstring}}\n`;
    }
    return rv;
  }
} 

export class Item
{
  id: number;
  constructor(id: number) {this.id = id}

  public getData() {return DataManager.getItem(this.id);}
  public getDataString()
  {
    let returnVal = "";
    if (this instanceof ConsumableItem || this instanceof MaterialItem) returnVal += ` x${this.amount}`;
    returnVal += `\n[${this.getData()!.getQuality().icon}`;
    if (this instanceof EquipmentItem) {let totalStats = this.getTotalStats(); returnVal += `| 🗡️ ${round(totalStats.atk)} | 🛡️ ${round(totalStats.def)} | ⚡ ${round(totalStats.acc)}`}
    else if (this instanceof ConsumableItem) returnVal += `` 
    else if (this instanceof MaterialItem) returnVal += ``				
    returnVal+= `]\n\n`;
    return returnVal;
  }
}
export class EquipmentItem extends Item
{
  craftingBonus = {atk: 0, def: 0, acc: 0};
  constructor(id: number, craftingBonus?:{atk: number, def:number, acc:number})
  {
    super(id);
    if (craftingBonus) this.craftingBonus = craftingBonus;
  }

  getTotalStats()
  {
    let id = DataManager.getItem(this.id) as _equipmentItem;
    
    let totalStats =
    {
      atk: this.craftingBonus.atk + id.stats.base.atk,
      def: this.craftingBonus.def + id.stats.base.def,
      acc: this.craftingBonus.acc + id.stats.base.acc
    }
    
    return totalStats
  }
}

export class MaterialItem extends Item
{
  amount: number;

  constructor(id:number, amount: number)
  {
    super(id);
    this.amount = amount;
  }
} 

export class ConsumableItem extends Item
{
  amount: number;
  effects: {effect: string, [key:string]:any}[]
  constructor(id:number, amount: number, effects: {effect: string, [key:string]:any}[])
  {
    super(id);
    this.amount = amount;
    this.effects = effects;
  }
} 


export class _serializedItem
{
  id: number;
  constructor(id:number)
  {
    this.id = id;
  }
}
export class _serializedEquipmentItem extends _serializedItem
{
  bonus_stats?:
  {
    atk: number,
    def: number,
    acc: number,
  }

  constructor(id:number, bonus_stats?:{ atk: number, def: number, acc: number,})
  {
    super(id);
    this.bonus_stats = bonus_stats;
  }

}
export class _serializedMaterialItem extends _serializedItem
{
  amount = 0;
  constructor(id:number, amount?: number)
  {
    super(id);
    if (amount) this.amount = amount;
  }
}
export class _serializedConsumableItem extends _serializedItem
{
  amount = 0;
  constructor(id:number, amount?: number)
  {
    super(id);
    if (amount) this.amount = amount;
  }
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
