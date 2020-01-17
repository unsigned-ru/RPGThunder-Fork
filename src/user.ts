import { DataManager } from "./dataManager";
import { _class, _currency } from "./interfaces";
import Discord from 'discord.js'
import { _materialItem, _equipmentItem, _consumableItem, equipmentItem, _serializedEquipmentItem, _serializedConsumableItem, _serializedMaterialItem } from "./classes/items";
import * as cf from "./config.json"

export interface userConstructorParams
{
    user_id: string,
    zone?: number,
    level?: number,
    exp?: number,
    selectedClass: _class,
    joined?: Date,
    hp?: number,
    foundBosses?: number[],
    unlocked_zones?: number[],
    currencies?: {currency_id: number, amount: number}[],
    inventory?: _serializedEquipmentItem[] | _serializedConsumableItem[] | _serializedMaterialItem[],
    equipment?: {slot: number, item: _serializedEquipmentItem}[],
}
export class User
{
    user_id :string;
    zone :number = 1;
    level :number = 1;
    exp :number = 0;
    class: _class;
    joined: Date = new Date();
    found_bosses: number[] = [];
    unlocked_zones: number[] = [1];

    hp: number;
    currencies: Discord.Collection<number, {value:  number}> = new Discord.Collection();
    inventory: _materialItem[] | _equipmentItem[] | _consumableItem[] = [];
    equipment: Discord.Collection<number, {item: equipmentItem | undefined}> = new Discord.Collection();

    constructor(params: userConstructorParams)
    {
        this.user_id = params.user_id;
        this.class = params.selectedClass;
        //initialize optional parameters.
        if(params.zone) this.zone = params.zone;
        if(params.exp) this.exp = params.exp;
        if(params.joined) this.joined = params.joined;
        if(params.level) this.level = params.level;
        if(params.hp) this.hp = params.hp;
        if(params.foundBosses) this.found_bosses = params.foundBosses;
        if(params.unlocked_zones) this.unlocked_zones = params.unlocked_zones;
        else this.hp = cf.stats.base.hp + ((this.level - 1) * cf.stats.increase.hp);

        for (let currency of DataManager.currencies) this.currencies.set(currency[1]._id,{value: 0});
        if (params.currencies) for (let currency of params.currencies) this.currencies.set(currency.currency_id,{value: currency.amount});


        for (let slot of DataManager.itemSlots) this.equipment.set(slot[0], {item: undefined});

        if (params.equipment) for (let e of params.equipment) this.equipment.get(e.slot)!.item = new equipmentItem(e.item.id);
        else for (let e of this.class.items) this.equipment.get(e.slot)!.item = new equipmentItem(e.item);

        this.hp = cf.stats.base.hp + ((this.level - 1) * cf.stats.increase.hp);
    }

    getCurrency(id: number) { return this.currencies.get(id)!.value; }
    editCurrency(id: number, amount: number) { this.currencies.get(id)!.value += amount;}
    setCurrency(id: number, amount: number) {this.currencies.get(id)!.value = amount;}

    getStats()
    {
        var result = { 
            base: 
            {
                hp: cf.stats.base.hp + ((this.level-1) * cf.stats.increase.hp),
                atk: cf.stats.base.atk + ((this.level-1) * cf.stats.increase.atk),
                def: cf.stats.base.def + ((this.level-1) * cf.stats.increase.def),
                acc: cf.stats.base.acc + ((this.level-1) * cf.stats.increase.acc)
            },
            gear:
            {
                atk: 0,
                def: 0,
                acc: 0
            },
            total:
            {
                atk: 0,
                def: 0,
                acc: 0
            }
        }
        for (let e of this.equipment.values())
        {
            if (!e.item) continue;
            var i = DataManager.getItem(e.item.id) as _equipmentItem;
            result.gear.atk += i.stats.base.atk;
            result.gear.def += i.stats.base.def;
            result.gear.acc += i.stats.base.acc;
        }
        
        result.total.atk = result.base.atk + result.gear.atk;
        result.total.def = result.base.def + result.gear.def;
        result.total.acc = result.base.acc + result.gear.acc;
        return result;
    }
}

export class SerializedUser
{
    user_id: string;
    zone: number;
    level :number;
    exp :number;
    class_id: number;
    joined: Date;
    found_bosses: number[];
    unlocked_zones: number[];
    currencies: {currency_id: number, amount: number}[] = []
    inventory: _serializedEquipmentItem[] | _serializedConsumableItem[] | _serializedMaterialItem[] = []
    equipment: {slot: number, item: _serializedEquipmentItem}[] = []
    hp: number;

    constructor(user: User)
    {
        this.user_id = user.user_id;
        this.zone = user.zone;
        this.level = user.level;
        this.exp = user.exp;
        this.class_id = user.class._id;
        this.joined = user.joined;
        this.found_bosses = user.found_bosses;
        this.unlocked_zones = user.unlocked_zones;
        this.hp = user.hp;

        for (let c of user.currencies) {this.currencies.push({currency_id: c[0], amount: c[1].value});}
    }
}