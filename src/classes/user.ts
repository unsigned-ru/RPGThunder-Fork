import { DataManager } from "./dataManager";
import {_currency} from "../interfaces";
import Discord from 'discord.js'
import { _materialItem, _equipmentItem, EquipmentItem, _serializedEquipmentItem, _serializedConsumableItem, _serializedMaterialItem, _consumableItem, ConsumableItem, MaterialItem, _anyItem, anyItem } from "./items";
import * as cf from "../config.json"
import { formatTime, clamp, randomIntFromInterval } from "../utils";
import { CronJob } from "cron";
import { client } from "../main";
import { _class } from "./class";

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
    inventory?: (_serializedEquipmentItem | _serializedConsumableItem | _serializedMaterialItem)[],
    equipment?: {slot: number, item: _serializedEquipmentItem}[],
    professions?: {id: number, skill: number}[]
    cooldowns?: {name: "", date: Date}[]
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
    command_cooldowns: Discord.Collection<string, CronJob> = new Discord.Collection();
    hp: number;
    currencies: Discord.Collection<number, {value:  number}> = new Discord.Collection();
    inventory: (ConsumableItem | EquipmentItem | MaterialItem)[] = [];
    equipment: Discord.Collection<number, {item: EquipmentItem | undefined}> = new Discord.Collection();
    reaction = { isPending: false, timer_id: 0 }
    professions: Discord.Collection<number, {skill: number}> = new Discord.Collection();
    constructor(params: userConstructorParams)
    {
        //initialize required parameters
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
        
        //populate cooldowns if param was provided.
        if(params.cooldowns)
        {
            for (let cd of params.cooldowns)
            {
                if (cd.date < new Date()) continue;
                this.command_cooldowns.set(cd.name, new CronJob(cd.date, 
                function(this: {command_cooldowns: Discord.Collection<String,CronJob>, name: string}) 
                {
                    this.command_cooldowns.delete(this.name);
                }, undefined, true, undefined, {command_cooldowns: this.command_cooldowns, name: cd.name}));
            }
            
        }
        
        //initialize all currencies to a value of 0
        for (let currency of DataManager.currencies) this.currencies.set(currency[1]._id,{value: 0});
        //populate currencies if param was provided.
        if (params.currencies) for (let currency of params.currencies) this.currencies.set(currency.currency_id,{value: currency.amount});

        //initialize slots
        for (let slot of DataManager.itemSlots) this.equipment.set(slot[0], {item: undefined});
        //populate slots if param was provided
        if (params.equipment) for (let e of params.equipment) if (e.item) this.equipment.get(e.slot)!.item = new EquipmentItem(e.item.id); else this.equipment.get(e.slot)!.item = undefined;
        else for (let e of this.class.items) this.equipment.get(e.slot)!.item = new EquipmentItem(e.item);

        //set the users hp (full hp if param not provided)
        if (params.hp) this.hp = params.hp;
        else this.hp = cf.stats.base.hp + ((this.level - 1) * cf.stats.increase.hp);
        
        //initialize all professions with skill 0
        for (let p of DataManager.professions) this.professions.set(p[1]._id , {skill: 0});
        //populate professions if param was provided
        if (params.professions) for (let p of params.professions) this.professions.set(p.id, {skill: p.skill});

        //populate inventory if param was provided.
        if (params.inventory) 
        {
            for (let i of params.inventory)
            {
                let id = DataManager.getItem(i.id);
                if (id instanceof _equipmentItem) this.inventory.push(new EquipmentItem(i.id,(i as _serializedEquipmentItem).bonus_stats));
                if (id instanceof _consumableItem) this.inventory.push(new ConsumableItem(i.id,(i as _serializedConsumableItem).amount, id.effects));
                if (id instanceof _materialItem) this.inventory.push(new MaterialItem(i.id,(i as _serializedMaterialItem).amount));
            }
        }

    }
    getCurrency(id: number) { return this.currencies.get(id)!; }

    getZone() {return DataManager.zones.get(this.zone)!}

    getUnlockedZones() {return DataManager.zones.filter(x => this.unlocked_zones.includes(x._id))}

    isWearingTwoHand() {return this.equipment.get(1)?.item?.id == undefined ? false : (DataManager.getItem(this.equipment.get(1)!.item!.id) as _equipmentItem).two_hand;}

    getRequiredExp(level = this.level) {return Math.round(cf.exp_req_base_exp + (cf.exp_req_base_exp * ((level  ** cf.exp_req_multiplier)-level)));}

    async equipItem(item: _anyItem, msg: Discord.Message)
    {
        //check if user owns the item in inventory.
        let finv = this.inventory.filter(x=> x.id == item._id)
        if (finv.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you do not own the item: ${item._id} - ${item.icon} __${item.name}__.`);

        //check if the this can equip it
        if (item instanceof _equipmentItem)
        {
            if (item.level_requirement > this.level) return msg.channel.send(`\`${msg.author.username}\`, you are too low level to equip that item. (The level requirement is lvl ${item.level_requirement})`);
            if (!this.class.types.includes(item.type)) return msg.channel.send(`\`${msg.author.username}\`, your class in not allowed to wear the item type: \`${item.getType().name}\``);
        }

        let selItem: anyItem | undefined = finv.length > 1
        ? await new Promise(async function (resolve)
            {
                let itemSelectEmbed = new Discord.RichEmbed()
                .setColor('#fcf403')
                .setTitle(`Duplicate items found`)
                .setDescription(`**You have multiple items with that id. Which one do you want to equip, \`${msg.author.username}\`?**`)
                .setTimestamp()
                .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
                let optionString = "";
                for (let fi of finv) optionString += `${finv.indexOf(fi) + 1} - ${item.icon} ${item.name} ${fi.getDataString()}`;
                itemSelectEmbed.addField("**Options**", optionString);
                msg.channel.send(itemSelectEmbed);
                //await response and check it
                var rr = (await msg.channel.awaitMessages((m: Discord.Message) => m.author.id == msg.author.id, { time: 30000, maxMatches: 1 })).first().content;
                if (isNaN(+rr) || +rr - 1 < 0 || +rr > finv.length) return resolve(undefined);
                return resolve(finv[+rr - 1]);
            })
        : finv[0];
        if (!selItem) return msg.channel.send(`\`${msg.author.username}\`, incorrect input.`);

        if (selItem instanceof EquipmentItem && item instanceof _equipmentItem)
        {
            let selSlot: number = item.slots.length > 1 && !item.two_hand
            ? await new Promise(async function (resolve)
            {
                let slotSelectEmbed = new Discord.RichEmbed()
                .setColor('#fcf403')
                .setTitle(`Multiple slots possible.`)
                .setDescription(`**This item can be equipped in multiple slots. What slot would you like it to be equipped in, \`${msg.author.username}\`?**`)
                .setTimestamp()
                .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
                let slotString = "";
                for (let s of item.getSlots()) slotString += `${s._id} - ${s.name}\n\n`;
                slotSelectEmbed.addField("**Possible slots**", slotString);
                msg.channel.send(slotSelectEmbed);
                //await response and check it
                var rr = (await msg.channel.awaitMessages((m: Discord.Message) => m.author.id == msg.author.id, { time: 30000, maxMatches: 1 })).first().content;
                if (isNaN(+rr) || !item.slots.includes(+rr)) return resolve(-1);
                return resolve(+rr);
            })
            : item.slots[0];

            if (selSlot == -1) return msg.channel.send(`\`${msg.author.username}\`, you entered an invallid slot.`);
            
            if (item.two_hand)
            {
                let mainhand = this.equipment.get(1)?.item;
                let offhand = this.equipment.get(2)?.item;
                if (mainhand) this.addItemToInventory(mainhand);
                if (offhand) this.addItemToInventory(offhand);

                this.equipment.set(1,{item: selItem});
                this.equipment.set(2,{item: undefined});
            }
            else if ((item.slots.includes(1) || item.slots.includes(2)) && this.isWearingTwoHand())
            {
                let old = this.equipment.get(1)?.item;
                if (old) this.addItemToInventory(old);
                this.equipment.set(1, {item: undefined});
                this.equipment.set(selSlot, {item: selItem});
            }
            else 
            {
                let old = this.equipment.get(selSlot)?.item;
                if (old) this.addItemToInventory(old);
                this.equipment.set(selSlot, {item: selItem});
            }
            this.inventory.splice(this.inventory.indexOf(selItem),1);
            return msg.channel.send(`\`${msg.author.username}\` has sucessfully equipped ${item._id} - ${item.icon} __${item.name}__ in the slot __${DataManager.getItemSlot(selSlot).name}__`);
        }
        else return msg.channel.send(`\`${msg.author.username}\`, that item is not equippable.`);
    }
    async useItem(item: _anyItem, msg: Discord.Message, amount: number = 1)
    {
        //check if user owns the item in inventory.
        let finv = this.inventory.filter(x=> x.id == item._id)
        if (finv.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you do not own the item: ${item._id} - ${item.icon} __${item.name}__.`);
        let invi = finv[0];
        if (invi instanceof EquipmentItem) await this.equipItem(item,msg)
        if (invi instanceof MaterialItem) return msg.channel.send(`\`${msg.author.username}\`, that item cannot be used.`);
        if (invi instanceof ConsumableItem) 
        {
            if (invi.amount < amount) return msg.channel.send(`\`${msg.author.username}\`, you do not own enough of the item: ${item._id} - ${item.icon} __${item.name}__. You only own ${invi.amount}.`)
            for (let ac = 0; ac < amount; ac++) 
            {
                for (let e of invi.effects) this.applyEffect(e)
                if (invi.amount > amount) invi.amount-= amount;
                else (this.inventory.splice(this.inventory.indexOf(invi),1));
            }
            msg.channel.send(`\`${msg.author.username}\`, has sucessfully used: ${item._id} - ${item.icon} __${item.name}__ ${amount ? `x${amount}` :""}`);
        }
    }
    applyEffect(e: {effect: string, [key:string]:any})
    {
        switch(e.effect.toUpperCase())
        {
            case "INSTANT_HEAL":
                if (e.amount && this.hp < this.getStats().base.hp) this.hp = clamp(this.hp + e.amount, 0, this.getStats().base.hp);
                break;
        }
    }
    getUser() { return client.users.get(this.user_id)!; }
    setCooldown(name: string, duration: number)
    {
        if (this.command_cooldowns.has(name)) return;
        let d = new Date();
        d.setSeconds(d.getSeconds() + duration);
        this.command_cooldowns.set(name, new CronJob(d, 
        function(this: {command_cooldowns: Discord.Collection<String,CronJob>, name: string}) 
        {
            this.command_cooldowns.delete(this.name);
        }, undefined, true, undefined, {command_cooldowns: this.command_cooldowns, name: name}));
    }
    getCooldown(name:string)
    {
        if (!this.command_cooldowns.has(name)) return undefined;
        let cd = this.command_cooldowns.get(name)!.nextDate().toDate().getTime() - new Date().getTime();
        return formatTime(cd);
    }
    clearCooldown(name:string) { if(this.command_cooldowns.has(name)) this.command_cooldowns.get(name)?.stop(); this.command_cooldowns.delete(name) }
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
    addItemToInventoryFromId(id: number, amount = 1) :void
    {
        let itemData = DataManager.getItem(id);
        if (itemData instanceof _equipmentItem) { for (let i = 0; i < amount; i++) this.addItemToInventory(new EquipmentItem(itemData._id));}
        else if (itemData instanceof _materialItem) this.addItemToInventory(new MaterialItem(itemData._id,amount));
        else if (itemData instanceof _consumableItem) this.addItemToInventory(new ConsumableItem(itemData._id,amount,itemData.effects));
    }
    removeItemFromInventoryFromId(id: number, amount = 1) :void
    {
        let itemData = DataManager.getItem(id);
        let invEntry = this.inventory.find(x => x.id == id);
        if (itemData instanceof _equipmentItem && invEntry) for (let i = 0; i < amount; i++) this.inventory.splice(this.inventory.indexOf(invEntry),1);
        else if (itemData instanceof _materialItem && invEntry && invEntry instanceof MaterialItem) 
        {
            if (invEntry.amount > amount) invEntry.amount -= amount;
            else this.inventory.splice(this.inventory.indexOf(invEntry),1)
        }
        else if (itemData instanceof _consumableItem && invEntry && invEntry instanceof ConsumableItem) 
        {
            if (invEntry.amount > amount) invEntry.amount -= amount;
            else this.inventory.splice(this.inventory.indexOf(invEntry),1)
        }
    }
    removeEntryFromInventory(item: EquipmentItem | ConsumableItem | MaterialItem) :void
    {
        this.inventory.splice(this.inventory.indexOf(item),1);
    }
    addItemToInventory(item: EquipmentItem | ConsumableItem | MaterialItem) :void
    {
        if (item instanceof ConsumableItem || item instanceof MaterialItem)
        {
            let i = this.inventory.find(x => Object.getPrototypeOf(item) == Object.getPrototypeOf(x) && x.id == item.id) as ConsumableItem | MaterialItem;
            if (i) i.amount += item.amount;
            else this.inventory.push(item);
        }
        else this.inventory.push(item);
    }
    
    //returns damage to deal.
    dealDamage()
    {
        let rng = randomIntFromInterval(0,100);
        let stats = this.getStats().total;
        let dmg = stats.atk;
        let critChance = ((stats.acc / (this.level * 10)) - 0.85) * 100;
        if (rng < critChance) dmg *= 1.5;
        return dmg;
    }
    //returns damage taken
    takeDamage(damageToTake: number)
    {
        let stats = this.getStats().total;
        let parsedDamage = damageToTake - clamp(stats.def/2, 0, damageToTake * 0.85);
        this.hp = clamp(this.hp-parsedDamage,0,Number.POSITIVE_INFINITY);
        
        let died = false;
        if (this.hp == 0) { died = true; this.onDeath();}
        return {dmgTaken: parsedDamage, died: died}
    }
    gainExp(amount: number, msg: Discord.Message)
    {
        while (amount > 0)
        {
            let reqExp = this.getRequiredExp();
            if (this.exp + amount > reqExp)
            {
                amount -= reqExp - this.exp;
                this.level++;
                this.exp = 0;
                this.onLevel(msg);
            }
            else { this.exp += amount; amount = 0; }
        }
    }
    onLevel(msg : Discord.Message)
    {
        msg.channel.send(`\`${this.getUser().username}\` has reached level ${this.level}!`);
        this.hp = this.getStats().base.hp;
    }
    onDeath()
    {
        //set exp to same % but in previous level and lose a level
        let percentage = this.exp / this.getRequiredExp();
        this.level = clamp(this.level-1, 1, Number.POSITIVE_INFINITY);
        this.exp = percentage * this.getRequiredExp();
        
        //reset hp
        this.hp = this.getStats().base.hp;
    }
    getProfession(id: number)
    {
        return this.professions.get(id);
    }
    gainProfessionSkill(id: number, skill:number, greenZone:number, grayZone: number, isGathering: boolean = false)
    {
        let prof = this.getProfession(id);
        let pd = DataManager.getProfessionData(id);
        if (!prof || !pd) return {skillgain: 0, newRecipes: []}; 
        if (prof.skill >= grayZone) return {skillgain: 0, newRecipes: []}; 
        if (prof.skill >= pd.max_skill) return {skillgain: 0, newRecipes: []}; 
        if (prof.skill >= greenZone)
        {
            if (isGathering && randomIntFromInterval(0,100) > 25) return {skillgain: 0, newRecipes: []}; 
            if (!isGathering && randomIntFromInterval(0,100) > 50) return {skillgain: 0, newRecipes: []}; 
        } 

        //filter to recipes we don't have then filter to recipes we have when adding skill
        let newRecipes = pd.recipes.filter(x => x.skill_req > prof!.skill).filter(x => x.skill_req <= prof!.skill + skill).map(x => DataManager.getItem(x.item_id)!);

        //increase skill and return
        if (isGathering && randomIntFromInterval(0,100) > 50) return {skillgain: 0, newRecipes: []}; 
        prof.skill += skill;
        return {skillgain: skill, newRecipes: newRecipes};
    }
    checkForItemsAndAmount(costs: {item: _anyItem | undefined, amount: number}[], multiplier: number = 1)
    {
        //check if user has enough of the costs.
        let costErrorStrings = [];
        for (let cost of costs)
        {
            if (!cost.item) continue;
            let invEntry = this.inventory.find(x => x.id == cost.item?._id);
            if (!invEntry) { costErrorStrings.push(`${cost.item.getDisplayString()} x${multiplier * cost.amount}`); continue; }
            if (invEntry instanceof ConsumableItem || invEntry instanceof MaterialItem)
            {
                if (invEntry.amount < cost.amount * multiplier) costErrorStrings.push(`${cost.item.getDisplayString()} x${(cost.amount * multiplier) - invEntry.amount}`);
            }
            if (invEntry instanceof EquipmentItem)
            {
                let um = this.inventory.filter(x => x.id == cost.item?._id).length;
                if (um < cost.amount * multiplier) costErrorStrings.push(`${cost.item.getDisplayString()} x${(cost.amount * multiplier) - um}`);
            }
        }
        return costErrorStrings;
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
    inventory: (_serializedEquipmentItem | _serializedConsumableItem | _serializedMaterialItem)[] = []
    equipment: {slot: number, item: _serializedEquipmentItem | undefined}[] = []
    cooldowns: {name:string, date: Date}[] = []
    hp: number;
    professions: {id: number, skill: number}[] = [];
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
        for (let c of user.currencies) {this.currencies.push({currency_id: c[0], amount: c[1].value});}
        for (let invEntry of user.inventory)
        {
            if (invEntry instanceof EquipmentItem) this.inventory.push(new _serializedEquipmentItem(invEntry.id,invEntry.craftingBonus));
            if (invEntry instanceof MaterialItem) this.inventory.push(new _serializedMaterialItem(invEntry.id,invEntry.amount));
            if (invEntry instanceof ConsumableItem) this.inventory.push(new _serializedConsumableItem(invEntry.id,invEntry.amount));
        }
        for (let e of user.equipment) this.equipment.push({item: e[1].item ? new _serializedEquipmentItem(e[1].item.id, e[1].item?.craftingBonus): undefined, slot: e[0]})
        this.hp = user.hp;
        for (let p of user.professions) this.professions.push({id: p[0], skill: p[1].skill})
        for (let cd of user.command_cooldowns) this.cooldowns.push({name: cd[0], date: cd[1].nextDate().toDate()});
    }
}