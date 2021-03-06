import { getTotalWeightForLevel, getAccFromLevelWeight, displayRound } from "../utils";
import { DataManager } from "./dataManager";

export type _anyItem = DbItem | DbConsumableItem | DbEquipmentItem | DbMaterialItem | DbEasterEgg;
export type anyItem = ConsumableItem | EquipmentItem | MaterialItem | EasterEgg; 

export class DbItem
{
  _id: number;
  name: string;
  description: string;
  icon: string;
  quality: number;
  soulbound = false;
  sellPrice = 0;
  sellable = true;

  constructor(dbObject: any)
  {
    this._id = dbObject._id;
    this.name = dbObject.name;
    this.description = dbObject.description;
    this.icon = dbObject.icon;
    this.quality = dbObject.quality;
    if (dbObject.soulbound) this.soulbound = dbObject.soulbound;
    if (dbObject.sellable) this.sellable = dbObject.sellable;
    this.sellPrice = dbObject.sell_price;
  }

  public getDisplayString(){return `${this._id} - ${this.icon} __${this.name}__`;}
  public getDataString()
  {
    let returnVal = "";
    returnVal += `\n[${this.getQuality().icon}`;
    if (this instanceof DbEquipmentItem) 
    {
       returnVal += ` | 🗡️ ${displayRound(this.stats.base.atk)} | 🛡️ ${displayRound(this.stats.base.def)} | ⚡ ${displayRound(this.stats.base.acc)}`;
    }
    else if (this instanceof DbConsumableItem) returnVal += ``; 
    else if (this instanceof DbMaterialItem) returnVal += ``;				
    returnVal+= `]`;
    return returnVal;
  }
  public getQuality() {  return DataManager.getItemQuality(this.quality); }
}

export class DbEquipmentItem extends DbItem
{
  slots: number[];
  twoHand = false;
  type: number;
  levelRequirement: number;

  stats = 
  {
    base: { atk: 0, def: 0, acc: 0 },
    crafting: { atk: 0, def: 0, acc: 0 }
  };

  constructor(dbObject: any)
  {
    super(dbObject);

    this.slots = dbObject.slots;
    this.twoHand = dbObject.two_hand;
    this.type = dbObject.type;
    this.levelRequirement = dbObject.level_requirement;
    
    this.calculateStats();
  }

  private calculateStats() 
  {
    //total user stat weight for itemreq level * the quality multiplier to get the amount of weight to distribute.
    //Also multiplied by the slot weight.
    let weight = (getTotalWeightForLevel(this.levelRequirement) * this.getQuality().weight) * this.getSlots()[0].weight;
    if (this.twoHand) weight *= 2;
    //get the item type.
    const type = this.getType();

    this.stats.base.atk = weight * type.atk;
    this.stats.base.def = (weight * type.def) * 2;
    this.stats.base.acc = getAccFromLevelWeight(this.levelRequirement, (weight * type.acc));

    this.stats.crafting.atk = weight * 0.1 * type.atk;
    this.stats.crafting.def = weight * 0.1 * type.def * 2;
    this.stats.crafting.acc = getAccFromLevelWeight(this.levelRequirement, (weight * 0.1 * type.acc));
  }
  public getType() { return DataManager.getItemType(this.type); }
  public getSlots() { return DataManager.getItemSlots(this.slots); }
} 

export class DbEasterEgg extends DbItem
{
  expPercentage: number;
  coinsMin: number;
  coinsMax: number;
  itemDrops: {item: number; chance: number; minAmount: number; maxAmount: number}[];

  constructor(dbObject: any)
  {
    super(dbObject);
    this.expPercentage = dbObject.expPercentage;
    this.coinsMin = dbObject.coinsMin;
    this.coinsMax = dbObject.coinsMax;
    this.itemDrops = dbObject.itemDrops;
  }
} 

export class DbMaterialItem extends DbItem
{
  constructor(dbObject: any)
  {
    super(dbObject);
  }
} 
export class DbConsumableItem extends DbItem
{
  effects: {effect: string; [key: string]: any}[]
  constructor(dbObject: any)
  {
    super(dbObject);
    this.effects = dbObject.effects;
  }

  getEffectsString()
  {
    let rv = "";
    for (const e of this.effects)
    {
      const pvstring = Object.keys(e).filter(x => x != "effect").map(x => `\`${x}:${e[x]}\``).join(" ,");
      rv += `\`${e.effect}\`: {${pvstring}}\n`;
    }
    return rv;
  }
} 

export class Item
{
  id: number;
  constructor(id: number) {this.id = id;}

  public getData() {return DataManager.getItem(this.id);}
  public getDataString()
  {
    let returnVal = "";
    if (this instanceof ConsumableItem || this instanceof MaterialItem) returnVal += ` x${this.amount}`;
    returnVal += `\n[${this.getData()!.getQuality().icon}`;
    if (this instanceof EquipmentItem) {const totalStats = this.getTotalStats(); returnVal += `| 🗡️ ${displayRound(totalStats.atk)} | 🛡️ ${displayRound(totalStats.def)} | ⚡ ${displayRound(totalStats.acc)}`;}
    else if (this instanceof ConsumableItem) returnVal += ``; 
    else if (this instanceof MaterialItem) returnVal += ``;				
    returnVal+= `]\n\n`;
    return returnVal;
  }
}
export class EquipmentItem extends Item
{
  craftingBonus = {atk: 0, def: 0, acc: 0};
  constructor(id: number, craftingBonus?: {atk: number; def: number; acc: number})
  {
    super(id);
    if (craftingBonus) this.craftingBonus = craftingBonus;
  }

  getTotalStats()
  {
    const id = DataManager.getItem(this.id) as DbEquipmentItem;
    
    const totalStats =
    {
      atk: this.craftingBonus.atk + id.stats.base.atk,
      def: this.craftingBonus.def + id.stats.base.def,
      acc: this.craftingBonus.acc + id.stats.base.acc
    };
    
    return totalStats;
  }
}
export class StackableItem extends Item
{
  amount: number;
  constructor(id: number, amount: number)
  {
    super(id);
    this.amount = amount;
  }
}
export class MaterialItem extends StackableItem
{
  constructor(id: number, amount: number)
  {
    super(id, amount);
  }
}

export class EasterEgg extends StackableItem
{
  constructor(id: number, amount: number)
  {
    super(id,amount);
  }
} 

export class ConsumableItem extends StackableItem
{
  effects: {effect: string; [key: string]: any}[]
  constructor(id: number, amount: number, effects: {effect: string; [key: string]: any}[])
  {
    super(id, amount);
    this.effects = effects;
  }
} 

export class SerializedItem
{
  id: number;
  constructor(id: number)
  {
    this.id = id;
  }
}
export class SerializedEquipmentItem extends SerializedItem
{
  bonusStats?:
  {
    atk: number;
    def: number;
    acc: number;
  }

  constructor(id: number, bonusStats?: { atk: number; def: number; acc: number})
  {
    super(id);
    this.bonusStats = bonusStats;
  }
}
export class SerializedEasterEggItem extends SerializedItem
{
  amount = 0;
  constructor(id: number, amount?: number)
  {
    super(id);
    if (amount) this.amount = amount;
  }
}

export class SerializedMaterialItem extends SerializedItem
{
  amount = 0;
  constructor(id: number, amount?: number)
  {
    super(id);
    if (amount) this.amount = amount;
  }
}

export class SerializedConsumableItem extends SerializedItem
{
  amount = 0;
  constructor(id: number, amount?: number)
  {
    super(id);
    if (amount) this.amount = amount;
  }
}

export interface ItemQualityInterface
{
  _id: number;
  name: string;
  weight: number;
  icon: string;
}
export interface ItemTypeInterface
{
  _id: number;
  name: string;
  atk: number;
  def: number;
  acc: number;
}
export interface ItemSlotInterface
{
  _id: number;
  name: string;
  weight: number;
}
