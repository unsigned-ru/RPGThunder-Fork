import * as Discord from "discord.js";
import {_class,_item,_consumable,_stats} from "../interfaces";
import {queryPromise, calculateReqExp } from "../utils";
import {classes} from "../staticdata";
import * as cf from "../config.json";

export enum userDataModules 
{
    basic,
    currencies,
    materials,
    equipment,
    inventory,
    consumables,
    stats
}

export class basicModule
{
    class: _class | undefined;
    area: number | undefined;
    level: number | undefined;
    exp: number | undefined;
    current_hp: number | undefined;

    public async init(user_id:string)
    {
        const result = (await queryPromise(`SELECT class_id,level,exp,current_hp,area FROM users WHERE user_id='${user_id}';`))[0];

        this.class = classes.get(result.class_id)!;
        this.area = result.area;
        this.exp = result.exp;
        this.level = result.level;
        this.current_hp = result.current_hp;
    }

    public async update(user_id:string)
    {
        await queryPromise(`UPDATE users SET class_id=${this.class!.id},level=${this.level},exp=${this.exp},current_hp=${this.current_hp},area=${this.area} WHERE user_id='${user_id}';`);
    }
}

export class currencyModule
{
    currencies: Discord.Collection<string,number> = new Discord.Collection();

    public async init(user_id:string) 
    {
        const result = (await queryPromise(`SELECT * FROM user_currencies WHERE user_id=${user_id};`))[0];
        for (var c of cf.currencies)
        {
            const name = Object.keys(result).find(x => x == c.database_name)!
            this.currencies.set(name,result[name]);
        }
    }

    public async update(user_id:string)
    {
        var sqlparam = "";
        for (var currency of this.currencies) sqlparam += `${currency[0]}=${currency[1]},`
        await queryPromise(`UPDATE user_currencies SET ${sqlparam.slice(0,-1)} WHERE user_id='${user_id}';`);
    }
}

export class materialsModule
{
    materials: Discord.Collection<string,number> = new Discord.Collection();

    public async init(user_id:string) 
    {
        const result = (await queryPromise(`SELECT * FROM user_materials WHERE user_id=${user_id};`))[0];
        for (var m of cf.materials)
        {
            const name = Object.keys(result).find(x => x == m.database_name)!
            this.materials.set(name,result[name]);
        }
    }

    public async update(user_id:string)
    {
        var sqlparam = "";
        for (var currency of this.materials) sqlparam += `${currency[0]}=${currency[1]},`
        await queryPromise(`UPDATE user_materials SET ${sqlparam.slice(0,-1)} WHERE user_id='${user_id}';`);
    }
}

export class equipmentModule
{
    equipment: Discord.Collection<string,_item> = new Discord.Collection();
    public async init(user_id:string) 
    {
        const result = (await queryPromise(`SELECT * FROM user_equipment WHERE user_id=${user_id};`))[0];

        for (var s of cf.equipment_slots)
        {
            const itemResult = (await queryPromise(`SELECT * FROM items WHERE id='${result[s.database_name]}';`))[0];
            this.equipment.set(s.database_name,itemResult);
        }
    }

    public getStatIncrease() :_stats
    {
        var rv :_stats = {acc: 0,atk: 0,current_hp: 0,def: 0,max_hp: 0};
        for (var item of this.equipment)
        {
            if (!item[1]) continue;
            rv.acc += item[1].acc;
            rv.atk += item[1].atk;
            rv.def += item[1].def;
        }

        return rv;
    }

    public async update(user_id:string)
    {
        var sqlparam = "";
        for (var id of this.equipment) 
        {
            sqlparam += `${id[0]}=${id[1] == undefined || id[1] == null? "NULL" : id[1].id},`
        }
        await queryPromise(`UPDATE user_equipment SET ${sqlparam.slice(0,-1)} WHERE user_id='${user_id}';`);
    }
}

export class inventoryModule
{
    inventory: Discord.Collection<number,{item: _item, count: number}> = new Discord.Collection();
    isEmpty: boolean = false;

    public async init(user_id:string) 
    {
        const result = await queryPromise(`SELECT item FROM user_inventory WHERE user_id=${user_id}`);

        if (result.length == 0) return this.isEmpty = true;

        var itemQuery = "";
        for (var row of result) itemQuery += `SELECT * from items WHERE id=${row.item};` 

        const itemResult = await queryPromise(itemQuery);
        var itemData = [];
        for (var ir of itemResult)
        {
            if (Array.isArray(ir)) itemData.push(ir[0]);
            else itemData.push(ir);
        }

        const inv :{item: _item, count: number}[] = [];
        for (var id of itemData)
        {
            if (inv.some(x => x.item.id == id.id)) inv.find(x => x.item.id == id.id)!.count++;
            else inv.push({item: id, count: 1});
        }
        inv.sort((a,b) => a.item.id - b.item.id);
        for (var i of inv) this.inventory.set(i.item.id,i);
    }
}

export class consumablesModule
{
    consumables: Discord.Collection<number,{cons: _consumable, count: number}> = new Discord.Collection();
    isEmpty: boolean = false;
    public async init(user_id:string) 
    {
        const result = await queryPromise(`SELECT consumable_id FROM user_consumables WHERE user_id=${user_id}`);
        if (result.length == 0) return this.isEmpty = true;
        var consumableQuery = "";
        for (var row of result) consumableQuery += `SELECT * from consumables WHERE id=${row.consumable_id};` 

        const consumableResult = await queryPromise(consumableQuery);
        var consData = [];
        for (var cr of consumableResult)
        {
            if (Array.isArray(cr)) consData.push(cr[0]);
            else consData.push(cr);
        }

        const consbls :{cons: _consumable, count: number}[] = [];
        for (var cd of consData)
        {
            if (consbls.some(x => x.cons.id == cd.id)) consbls.find(x => x.cons.id == cd.id)!.count++;
            else consbls.push({cons: cd, count: 1});
        }
        consbls.sort((a,b) => a.cons.id - b.cons.id);

        for (var i of consbls) this.consumables.set(i.cons.id,i);
    }
}

export class statsModule
{
    stats: Discord.Collection<string,number> = new Discord.Collection();

    public async init(basicMod:basicModule, equipmentMod:equipmentModule) 
    {
        //calculate base stats (base_STAT) atk - def - acc - current_hp - max_hp
        this.stats.set("base_atk",basicMod.class!.base_atk + (basicMod.level! * basicMod.class!.atk_increase));
        this.stats.set("base_def",basicMod.class!.base_def + (basicMod.level! * basicMod.class!.def_increase));
        this.stats.set("base_acc",basicMod.class!.base_acc + (basicMod.level! * basicMod.class!.acc_increase));
        this.stats.set("base_hp",basicMod.class!.base_hp + (basicMod.level! * basicMod.class!.hp_increase));

        //calculate gear stats (gear_STAT)
        const gear_stats = equipmentMod.getStatIncrease();
        this.stats.set("gear_atk",gear_stats.atk);
        this.stats.set("gear_def",gear_stats.def);
        this.stats.set("gear_acc",gear_stats.acc);
        
        //calculate totalStats
        this.stats.set("max_hp",basicMod.class!.base_hp + (basicMod.level! * basicMod.class!.hp_increase));
        this.stats.set("total_atk",this.stats.get("base_atk")! + this.stats.get("gear_atk")!);
        this.stats.set("total_def",this.stats.get("base_def")! + this.stats.get("gear_def")!);
        this.stats.set("total_acc",this.stats.get("base_acc")! + this.stats.get("gear_acc")!);
    }
}


export class UserData
{
    user_id: string = "";
    
    loadOrder :number[] = []

    activatedModules: Discord.Collection<number,boolean> = new Discord.Collection([
        [userDataModules.basic,false],
        [userDataModules.consumables,false],
        [userDataModules.currencies,false],
        [userDataModules.equipment,false],
        [userDataModules.inventory,false],
        [userDataModules.stats,false]
    ]);

    modules: Discord.Collection<number,any> = new Discord.Collection();

    constructor(user_id: string, modules: number[])
    {
        this.user_id = user_id;
        this.loadOrder = modules;
        for (var module of modules)
        {
            if (Object.values(userDataModules).includes(module)) this.activatedModules.set(module,true);
        }
    }

    async init() : Promise<any[]>
    {
        return new Promise(async (resolve, reject) => {
            try
            {
                var rv = [];
                for (var modnumber of this.loadOrder)
                {
                    var newModule:any;
                    switch(modnumber)
                    {
                        case userDataModules.basic:
                            newModule = new basicModule();
                            await newModule.init(this.user_id);
                            this.modules.set(userDataModules.basic,newModule);
                            break;
                        case userDataModules.currencies:
                            newModule = new currencyModule();
                            await newModule.init(this.user_id);
                            this.modules.set(userDataModules.currencies,newModule);
                            break;
                        case userDataModules.materials:
                            newModule = new materialsModule();
                            await newModule.init(this.user_id);
                            this.modules.set(userDataModules.materials,newModule);
                            break;
                        case userDataModules.equipment:
                            newModule = new equipmentModule();
                            await newModule.init(this.user_id);
                            this.modules.set(userDataModules.equipment,newModule);
                            break;
                        case userDataModules.inventory:
                            newModule = new inventoryModule();
                            await newModule.init(this.user_id);
                            this.modules.set(userDataModules.inventory,newModule);
                            break;
                        case userDataModules.consumables:
                            newModule = new consumablesModule();
                            await newModule.init(this.user_id);
                            this.modules.set(userDataModules.consumables,newModule);
                            break;
                        case userDataModules.stats:
                            if (!this.modules.has(userDataModules.basic) || !this.modules.has(userDataModules.equipment)) {console.error("WARNING: you tried to initialize stats module while basic and equipment module are disabled."); continue;}
                            newModule = new statsModule();
                            await newModule.init(this.modules.get(userDataModules.basic)!,this.modules.get(userDataModules.equipment)!);
                            this.modules.set(userDataModules.stats,newModule);
                            break;
                    }
                    rv.push(newModule);
                }
                return resolve(rv);
            }
            catch(error)
            {
                return reject(error);
            }
            
        });
    }

    static async update(modules: any[])
    {
        for (var mod of modules)
        {
            if (mod) await mod.update();
        }
    }
    static heal(basicMod :basicModule, statsMod:statsModule, amount:number)
    {
        if (basicMod.current_hp! + amount > statsMod.stats.get("max_hp")!) basicMod.current_hp = statsMod.stats.get("max_hp")!;
        else basicMod.current_hp! += amount;
    }
    static takeDamage(basicMod :basicModule, amount:number)
    {
        if (basicMod.current_hp! - amount < 0) basicMod.current_hp = 0;
        else basicMod.current_hp! -= amount;
    }
    static async removeConsumable(user_id:string, consumablesMod:consumablesModule, consumable: _consumable)
    {
        //Remove from collection
        const temp = consumablesMod.consumables.get(consumable.id)!;
        temp.count -= 1;
        consumablesMod.consumables.set(consumable.id,temp);
        consumablesMod.consumables.sweep(x => x.count == 0);
        await queryPromise(`DELETE FROM user_consumables WHERE consumable_id=${consumable.id} AND user_id=${user_id} LIMIT 1`);
    }

    static async addItemToInventory(user_id:string, inventoryMod: inventoryModule, itemID:number)
    {
        //TODO: add it to the inventory collection.
        await queryPromise(`INSERT INTO user_inventory (user_id, item) VALUES ('${user_id}', ${itemID})`);
    }
    static async removeItemFromInventory(user_id:string, inventoryMod: inventoryModule, item:_item)
    {
        inventoryMod.inventory.sweep(x => x.item == item);
        await queryPromise(`DELETE FROM user_inventory WHERE user_id=${user_id} AND item=${item.id} LIMIT 1`)
    }

    static async equipItemFromInventory(user_id:string, equipmentMod: equipmentModule, inventoryMod: inventoryModule, slot:string, itemToEquip:_item)
    {
        //put the previous equipped item in the inventory.
        const previousItem = (await queryPromise(`SELECT ${slot} FROM user_equipment WHERE user_id=${user_id};`))[0]
        if (previousItem[slot] != null) await UserData.addItemToInventory(user_id, inventoryMod, previousItem[slot]);
        
        equipmentMod.equipment.set(slot,itemToEquip);
        await UserData.removeItemFromInventory(user_id, inventoryMod, itemToEquip);
    }

    //returns true if the user has leveled.
    static grantExp(basicMod:basicModule, statsMod:statsModule,amount:number) :Promise<boolean>
    {
        return new Promise(async function(resolve, reject)
        {
            try
            {
                if (basicMod.exp! + amount > calculateReqExp(basicMod.level!))
                {
                    amount - calculateReqExp(basicMod.level!);
                    basicMod.level!++;
                    basicMod.exp! = amount;
                    //Reset hp cause of level
                    basicMod.current_hp = statsMod.stats.get("max_hp")!;
                    return resolve(true);
                }
                else 
                {
                    basicMod.exp! += amount;
                    return resolve(false);
                }
            }
            catch(err) {reject(err);}
        });
    }
}