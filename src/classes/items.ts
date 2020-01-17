import { getTotalWeightForLevel, tempName } from "../utils";
import { DataManager } from "../dataManager";

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
    this.stats.base.acc = tempName(this.level_requirement, (weight * type.acc));
  }
  public getType() { return DataManager.getItemType(this.type); }
  public getSlots() { return DataManager.getItemSlots(this.slots); }
} 

export class equipmentItem
{
  id: number;

  constructor(id:number)
  {
    this.id = id;
  }
}

export class _materialItem extends _item 
{
  amount: number;

  constructor(dbObject:any)
  {
    super(dbObject);
    
    this.amount = dbObject.amount;
  }
} 

export class _consumableItem extends _item
{
  amount: number;

  constructor(dbObject:any)
  {
    super(dbObject);
    
    this.amount = dbObject.amount;
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
  constructor(id:number)
  {
    super(id);
  }
}