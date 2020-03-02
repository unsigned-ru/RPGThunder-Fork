export class Profession
{
  _id: number;
  name: string;
  maxSkill: number;
  icon: string;
  recipes: { 
    skill_req: number;
    skill_gain: number;
    item_id: number;
    costs: { item_id: 1; amount: 1}[];
    green_zone: number;
    gray_zone: number;
  }[] = [];

  constructor(dbObj: any)
  {
    this._id = dbObj._id;
    this.name = dbObj.name;
    this.maxSkill = dbObj.max_skill;
    this.recipes = dbObj.recipes;
    this.icon = dbObj.icon;
  }
}