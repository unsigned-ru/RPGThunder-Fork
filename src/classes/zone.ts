import { DataManager } from "./dataManager";

export class Zone
{
  _id: number;
  name: string;
  loc: {x: number; y: number}
  boss: number;
  levelSuggestion: string;
  gathering:
  {
    mining: 
    {
      drops: {item: number; chance: number; min: number; max: number}[];
      skill: {req: number; greenZone: number; grayZone: number};
    };
    fishing: 
    {
      drops: {item: number; chance: number; min: number; max: number}[];
      skill: {req: number; greenZone: number; grayZone: number};
    };
    harvesting: 
    {
      drops: {item: number; chance: number; min: number; max: number}[];
      skill: {req: number; greenZone: number; grayZone: number};
    };
    woodworking: 
    {
      drops: {item: number; chance: number; min: number; max: number}[];
      skill: {req: number; greenZone: number; grayZone: number};
    };
  };
  shop: ZoneShopInterface
  enemies: ZoneEnemyInterface[]

  constructor(zoneObject: any) 
  {
    this._id = zoneObject._id;
    this.name = zoneObject.name;
    this.loc = zoneObject.loc;
    this.boss = zoneObject.boss;
    this.levelSuggestion = zoneObject.level_suggestion;
    this.gathering = zoneObject.gathering;
    this.shop = zoneObject.shop;
    this.enemies = zoneObject.enemies;
  }
  
  getMiningDrops() {return this.gathering.mining.drops;}
  getFishingDrops() {return this.gathering.fishing.drops;}
  getWoodworkingDrops() {return this.gathering.woodworking.drops;}
  getHarvestingDrops() {return this.gathering.harvesting.drops;}
  getShopListings()
  {
    const listings = [];
    for (const si of this.shop.listings) listings.push({ itemdata: DataManager.getItem(si.item), currencyCosts: si.currencyCosts, itemCosts: si.itemCosts });
    return listings;
  }
}

export interface ZoneEnemyInterface
{
  id: number;
  weight: number;
  min_encounter_level: number;
  max_level: number;
  level_offset: {below: number; above: number};
  currencyDrops: { id: number; chance: number; minAmount: number; maxAmount: number }[];
  itemDrops: { id: number; chance: number; minAmount?: number; maxAmount?: number }[];
}

export interface ZoneShopInterface
{
  listings:
  {
    item: number;
    currencyCosts: { id: number; amount: number }[];
    itemCosts: { id: number; amount: number }[];
  }[];
}