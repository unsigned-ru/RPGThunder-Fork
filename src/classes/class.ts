import { DataManager } from "./dataManager";

export class _class {
    _id: number;
    name: string;
    icon: string;
    description: string;
    items: {slot: number, item: number}[];
    types: number[];
  
    constructor(databaseObj:any)
    {
      this._id = databaseObj._id;
      this.name = databaseObj.name;
      this.icon = databaseObj.icon;
      this.description = databaseObj.description;
      this.items = databaseObj.items;
      this.types = databaseObj.types;
    }
  
    public getTypes() {return DataManager.getItemTypes(this.types);}
  }
  