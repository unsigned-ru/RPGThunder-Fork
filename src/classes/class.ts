import { DataManager } from "./dataManager";

export class Class {
    _id: number;
    name: string;
    icon: string;
    description: string;
    items: {slot: number, item: number}[];
    types: number[];
    spellbook: {ability: number, level: number}[]
  
    constructor(databaseObj:any)
    {
      this._id = databaseObj._id;
      this.name = databaseObj.name;
      this.icon = databaseObj.icon;
      this.description = databaseObj.description;
      this.items = databaseObj.items;
      this.types = databaseObj.types;
      this.spellbook = databaseObj.spellbook;
    }
  
    public getTypes() {return DataManager.getItemTypes(this.types);}

    public getSpellbook() {return this.spellbook.map(x => { return { ability: DataManager.getAbility(x.ability), level: x.level } });}
  }
  