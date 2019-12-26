import * as Discord from "discord.js";
import {_class,_item,_consumable,_stats, _class_ability, _user_equipment, _equipment_slot, _inventory_entry} from "../interfaces";
import {queryPromise, calculateReqExp, clamp, getItemData } from "../utils";
import {classes, currencies, materials, equipment_slots, class_abilities} from "../staticdata";
import * as cf from "../config.json";

export enum userDataModules 
{
    basic,
    currencies,
    materials,
    equipment,
    inventory,
    consumables,
    stats,
    abilities,
    spellbook,
}

export class basicModule
{
    class: _class | undefined;
    zone: number | undefined;
    level: number | undefined;
    exp: number | undefined;
    current_hp: number | undefined;
    foundBosses: number[] = [];
    unlockedZones: number[] = [];

    public async init(user_id:string)
    {
        const result = (await queryPromise(`SELECT * FROM users WHERE user_id='${user_id}';`))[0];

        this.class = classes.get(result.class_id)!;
        this.zone = result.zone;
        this.exp = result.exp;
        this.level = result.level;
        this.current_hp = result.current_hp;
        this.foundBosses = result.found_bosses.split(",").filter((x:string) => x.trim().length > 0).map((x:string) => parseInt(x));
        this.unlockedZones = result.unlocked_zones.split(",").filter((x:string) => x.trim().length > 0).map((x:string) => parseInt(x));
    }

    public async update(user_id:string)
    {
        await queryPromise(`UPDATE users SET class_id=${this.class!.id},level=${this.level},exp=${this.exp},current_hp=${this.current_hp},zone=${this.zone},found_bosses='${this.foundBosses.join(",")}',unlocked_zones='${this.unlockedZones.join(",")}' WHERE user_id='${user_id}';`);
    }
}

export class currencyModule
{
    currencies: Discord.Collection<string,number> = new Discord.Collection();

    public async init(user_id:string) 
    {
        const result = (await queryPromise(`SELECT * FROM user_currencies WHERE user_id=${user_id};`))[0];
        for (var c of currencies)
        {
            const name = Object.keys(result).find(x => x == c[1].database_name)!
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
        for (var m of materials)
        {
            const name = Object.keys(result).find(x => x == m[1].database_name)!
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
    equipment: Discord.Collection<string,_user_equipment> = new Discord.Collection();
    public async init(user_id:string) 
    {
        const result = (await queryPromise(`SELECT * FROM user_equipment WHERE user_id=${user_id};`))[0];

        for (var s of equipment_slots)
        {
            const itemResult = (await queryPromise(`SELECT * FROM items WHERE id='${result[s[1].database_name]}';`))[0];
            var equipmentEntry: _user_equipment = 
            {
                item: itemResult,
                slotDbName: s[1].database_name,
                bonus_atk: result[`${s[1].database_name}_bonus_atk`],
                bonus_def: result[`${s[1].database_name}_bonus_def`],
                bonus_acc: result[`${s[1].database_name}_bonus_acc`]
            } 
            this.equipment.set(s[1].database_name,equipmentEntry);
        }
    }

    public getStatIncrease() :_stats
    {
        var rv :_stats = {atk: 0, bonus_atk: 0, def: 0, bonus_def: 0, acc: 0, bonus_acc:0, current_hp: 0,max_hp: 0};
        for (var item of this.equipment)
        {
            if (!item[1].item) continue;
            rv.atk += item[1].item.atk
            rv.bonus_atk = item[1].bonus_atk;
            rv.def += item[1].item.def
            rv.bonus_def = item[1].bonus_def;
            rv.acc += item[1].item.acc
            rv.bonus_acc = item[1].bonus_acc;
        }

        return rv;
    }

    public async update(user_id:string)
    {
        var sqlparam = "";
        for (var eq of this.equipment) 
        {
            sqlparam += `${eq[1].slotDbName}=${eq[1].item ? eq[1].item.id : "NULL"}, ${eq[1].slotDbName}_bonus_atk = ${eq[1].bonus_atk}, ${eq[1].slotDbName}_bonus_acc = ${eq[1].bonus_acc}, ${eq[1].slotDbName}_bonus_def = ${eq[1].bonus_def},`
        }
        await queryPromise(`UPDATE user_equipment SET ${sqlparam.slice(0,-1)} WHERE user_id='${user_id}';`);
    }
}

export class inventoryModule
{
    inventory: Discord.Collection<number,_inventory_entry> = new Discord.Collection();
    isEmpty: boolean = false;

    public async init(user_id:string) 
    {
        const result = await queryPromise(`SELECT * FROM user_inventory WHERE user_id=${user_id}`);
        if (result.length == 0) return this.isEmpty = true;

        var itemQuery = "SELECT * FROM items WHERE";
        for (var row of result) itemQuery += ` id=${row.item} OR ` 
        const itemResult = await queryPromise(itemQuery.slice(0,-4)+';');


        var itemData: Discord.Collection<number,_item> = new Discord.Collection();
        for (var ir of itemResult)
        {
            if (Array.isArray(ir)) itemData.set(ir[0].id, ir[0]);
            else itemData.set(ir.id, ir);
        }
        
        var counter = 1;
        for (var r of result)
        {
            this.inventory.set(counter, {item: itemData.get(r.item)!, bonus_atk: r.bonus_atk, bonus_def: r.bonus_def, bonus_acc: r.bonus_acc});
            counter++;
        }
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
        this.stats.set("base_atk",basicMod.class!.base_atk + ((basicMod.level!-1) * basicMod.class!.atk_increase));
        this.stats.set("base_def",basicMod.class!.base_def + ((basicMod.level!-1) * basicMod.class!.def_increase));
        this.stats.set("base_acc",basicMod.class!.base_acc + ((basicMod.level!-1) * basicMod.class!.acc_increase));
        this.stats.set("base_hp",basicMod.class!.base_hp + ((basicMod.level!-1) * basicMod.class!.hp_increase));

        //calculate gear stats (gear_STAT)
        const gear_stats = equipmentMod.getStatIncrease();
        this.stats.set("gear_atk",gear_stats.atk + gear_stats.bonus_atk);
        this.stats.set("gear_def",gear_stats.def + gear_stats.bonus_def);
        this.stats.set("gear_acc",gear_stats.acc + gear_stats.bonus_acc);
        
        //calculate totalStats
        this.stats.set("max_hp",basicMod.class!.base_hp + ((basicMod.level!-1) * basicMod.class!.hp_increase));
        this.stats.set("total_atk",this.stats.get("base_atk")! + this.stats.get("gear_atk")!);
        this.stats.set("total_def",this.stats.get("base_def")! + this.stats.get("gear_def")!);
        this.stats.set("total_acc",this.stats.get("base_acc")! + this.stats.get("gear_acc")!);
    }
}

export class spellbookModule
{
    spellbook: Discord.Collection<number,_class_ability> = new Discord.Collection();
    isEmpty: boolean = false;

    public async init(user_id:string) 
    {
        const result: any[] = await queryPromise(`SELECT * FROM user_spellbook WHERE user_id=${user_id}`);

        if (result.length == 0) return this.isEmpty = true;

        for (let r of result)
        {
            this.spellbook.set(r.id,class_abilities.get(r.ability_id)!);
        }
    }
}

export class abilityModule
{
    abilities: Discord.Collection<number,_class_ability> = new Discord.Collection();

    public async init(user_id:string) 
    {
        //Get ability id's
        var result = (await queryPromise(`SELECT * FROM user_abilities WHERE user_id=${user_id}`))[0];
        //Get ability Data and add it to the collection for all abilities.
        for (let i = 1; i <= 4; i++)
        {
            this.abilities.set(i,class_abilities.get(result[i.toString()])!);
        }
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
                        case userDataModules.abilities:
                            newModule = new abilityModule();
                            await newModule.init(this.user_id);
                            this.modules.set(userDataModules.abilities,newModule);
                            break;
                        case userDataModules.spellbook:
                            newModule = new spellbookModule();
                            await newModule.init(this.user_id);
                            this.modules.set(userDataModules.spellbook,newModule);
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
    static levelDeathPenalty(basicMod :basicModule)
    {
        if (basicMod.level! > 1) 
        {
            basicMod.level! -= 1;
            basicMod.exp! = (calculateReqExp(basicMod.level!-1) / 100 * basicMod.exp! / calculateReqExp(basicMod.level!)*100);
        }				
    }
    static takeDamage(basicMod :basicModule,statsMod:statsModule, damageToTake:number) :number
    {
        clamp((damageToTake * 0.75) - statsMod.stats.get("total_def")!/3,0,Number.MAX_VALUE)
        const damage = (damageToTake * 0.25) + (clamp((damageToTake * 0.75) - statsMod.stats.get("total_def")!/3,0,Number.MAX_VALUE))
        if (basicMod.current_hp! - damage < 0) basicMod.current_hp = 0;
        else basicMod.current_hp! -= damage;

        return damage;
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
    static async addConsumable(user_id:string, consumablesMod:consumablesModule, consumableID:number)
    {
        //TODO: add it to the consumable collection.
        await queryPromise(`INSERT INTO user_consumables (user_id, consumable_id) VALUES ('${user_id}', ${consumableID})`);
    }

    static async addItemToInventory(user_id:string, inventoryMod: inventoryModule, item_id:number, bonus_atk:number,bonus_def:number, bonus_acc:number)
    {
        //gett item data
        var item = await getItemData(item_id) as _item;
        inventoryMod.inventory.set(inventoryMod.inventory.size, {item: item, bonus_atk: bonus_atk, bonus_def: bonus_def, bonus_acc: bonus_acc});
        await queryPromise(`INSERT INTO user_inventory (user_id, item, bonus_atk, bonus_acc, bonus_def) VALUES ('${user_id}', ${item_id}, ${bonus_atk},${bonus_acc},${bonus_def})`);
    }
    static async removeItemFromInventory(user_id:string, inventoryMod: inventoryModule, entry_id: number)
    {
        const entry = inventoryMod.inventory.get(entry_id)!;
        inventoryMod.inventory.delete(entry_id);
        
        await queryPromise(`DELETE FROM user_inventory WHERE user_id=${user_id} AND item=${entry.item.id} AND bonus_atk=${entry.bonus_atk} AND bonus_def=${entry.bonus_def} AND bonus_acc=${entry.bonus_acc} LIMIT 1`)
    }

    static async equipItemFromInventory(user_id:string, equipmentMod: equipmentModule, inventoryMod: inventoryModule, slot:string, itemToEquip:_item, bonus_atk:number, bonus_def:number, bonus_acc: number)
    {
        //put the previous equipped item in the inventory.
        const previousEquipmentData = (await queryPromise(`SELECT ${slot}, ${slot}_bonus_atk, ${slot}_bonus_def, ${slot}_bonus_acc FROM user_equipment WHERE user_id=${user_id};`))[0]
        
        if (previousEquipmentData[slot] != null) await UserData.addItemToInventory(user_id, inventoryMod, previousEquipmentData[slot], previousEquipmentData[`${slot}_bonus_atk`], previousEquipmentData[`${slot}_bonus_def`], previousEquipmentData[`${slot}_bonus_acc`]);
        

        equipmentMod.equipment.set(slot, {item: itemToEquip, slotDbName: slot, bonus_acc: bonus_acc, bonus_atk: bonus_atk, bonus_def: bonus_def});
        await UserData.removeItemFromInventory(user_id, inventoryMod, inventoryMod.inventory.findKey(x => x.item.id == itemToEquip.id && x.bonus_atk == bonus_atk && x.bonus_acc == bonus_acc && x.bonus_def == bonus_def));
    }

    //returns true if the user has leveled.
    static grantExp(basicMod:basicModule,equipMod:equipmentModule, statsMod:statsModule,amount:number) :Promise<boolean>
    {
        return new Promise(async function(resolve, reject)
        {
            try
            {
                if (basicMod.level! >= cf.level_cap) return resolve(false);

                if (basicMod.exp! + amount > calculateReqExp(basicMod.level!))
                {
                    amount - calculateReqExp(basicMod.level!);
                    basicMod.level!++;
                    basicMod.exp! = amount;
                    //Reset hp cause of level
                    await statsMod.init(basicMod,equipMod);
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
    //returns true if the user has leveled.
    static resetHP(basicMod:basicModule, statsMod:statsModule)
    {
        basicMod.current_hp = statsMod.stats.get("max_hp")!;
    }
}