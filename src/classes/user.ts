import { DataManager } from "./dataManager";
import Discord from 'discord.js';
import { DbMaterialItem, DbEquipmentItem, EquipmentItem, SerializedEquipmentItem, SerializedConsumableItem, SerializedMaterialItem, DbConsumableItem, ConsumableItem, MaterialItem, _anyItem, anyItem } from "./items";
import cf from "../config.json";
import { formatTime, clamp, randomIntFromInterval } from "../utils";
import { CronJob } from "cron";
import { client } from "../main";
import { Class } from "./class";
import { Actor } from "./actor";
import { UserAbility } from "./ability";

export interface UserConstructorParams
{
    userID: string;
    zone?: number;
    patreonRank?: string;
    patreon_member_id?: string;
    level?: number;
    exp?: number;
    selectedClass: Class;
    joined?: Date;
    hp?: number;
    foundBosses?: number[];
    unlockedZones?: number[];
    currencies?: {currency_id: number; amount: number}[];
    inventory?: (SerializedEquipmentItem | SerializedConsumableItem | SerializedMaterialItem)[];
    equipment?: {slot: number; item: SerializedEquipmentItem}[];
    professions?: {id: number; skill: number}[];
    cooldowns?: {name: ""; date: Date}[];
    abilities?: {slot: number; ability: number | undefined}[];

}

export class User extends Actor
{
    userID: string;
    exp = 0;
    class: Class;
    zone = 1;
    joined: Date = new Date();
    patreonRank: string|undefined = undefined;
    patreonMemberID?: string|undefined = undefined;
    foundBosses: number[] = [];
    unlockedZones: number[] = [1];

    currencies: Discord.Collection<number, {value:  number}> = new Discord.Collection();
    inventory: (ConsumableItem | EquipmentItem | MaterialItem)[] = [];
    equipment: Discord.Collection<number, {item: EquipmentItem | undefined}> = new Discord.Collection();
    command_cooldowns: Discord.Collection<string, CronJob> = new Discord.Collection();
    professions: Discord.Collection<number, {skill: number}> = new Discord.Collection();
    abilities: Discord.Collection<number, {ability: UserAbility | undefined}> = new Discord.Collection();

    reaction = { isPending: false, timerID: 0 }

    constructor(params: UserConstructorParams)
    {
        super(params.hp, params.level);
        //initialize required parameters
        this.userID = params.userID;
        this.class = params.selectedClass;

        //initialize optional parameters.
        if(params.patreonRank) this.patreonRank = params.patreonRank;
        if(params.patreon_member_id) this.patreonMemberID = params.patreon_member_id;
        if(params.zone) this.zone = params.zone;
        if(params.exp) this.exp = params.exp;
        if(params.joined) this.joined = params.joined;
        if(params.foundBosses) this.foundBosses = params.foundBosses;
        if(params.unlockedZones) this.unlockedZones = params.unlockedZones;
        
        //populate cooldowns if param was provided.
        if(params.cooldowns)
        {
            for (const cd of params.cooldowns)
            {
                if (cd.date < new Date()) continue;
                this.command_cooldowns.set(cd.name, new CronJob(cd.date, 
                function(this: {command_cooldowns: Discord.Collection<string,CronJob>; name: string}) 
                {
                    this.command_cooldowns.delete(this.name);
                }, undefined, true, undefined, {commandCooldowns: this.command_cooldowns, name: cd.name}));
            }
        }
        
        //initialize all currencies to a value of 0
        for (const currency of DataManager.currencies) this.currencies.set(currency[1]._id,{value: 0});
        //populate currencies if param was provided.
        if (params.currencies) for (const currency of params.currencies) this.currencies.set(currency.currency_id,{value: currency.amount});

        //initialize all professions with skill 0
        for (const p of DataManager.professions) this.professions.set(p[1]._id , {skill: 0});
    
        //populate professions if param was provided
        if (params.professions) for (const p of params.professions) this.professions.set(p.id, {skill: p.skill});

        //initialize slots
        for (const slot of DataManager.itemSlots) this.equipment.set(slot[0], {item: undefined});
        //populate slots if param was provided
        if (params.equipment) 
            for (const e of params.equipment) 
                if (e.item) 
                    this.equipment.get(e.slot)!.item = new EquipmentItem(e.item.id, e.item.bonusStats); 
                else this.equipment.get(e.slot)!.item = undefined;

        else for (const e of this.class.items) this.equipment.get(e.slot)!.item = new EquipmentItem(e.item);
        
        //populate inventory if param was provided.
        if (params.inventory) 
        {
            for (const i of params.inventory)
            {
                const id = DataManager.getItem(i.id);
                if (id instanceof DbEquipmentItem) this.inventory.push(new EquipmentItem(i.id,(i as SerializedEquipmentItem).bonusStats));
                if (id instanceof DbConsumableItem) this.inventory.push(new ConsumableItem(i.id,(i as SerializedConsumableItem).amount, id.effects));
                if (id instanceof DbMaterialItem) this.inventory.push(new MaterialItem(i.id,(i as SerializedMaterialItem).amount));
            }
        }
        //intialize abilities
        this.abilities.set(1, {ability: new UserAbility(DataManager.getAbility(1))});
        for (let i = 2; i <= 4; i++) this.abilities.set(i, {ability: undefined});
        //populate abilities from database.
        if (params.abilities) for (const ab of params.abilities) this.abilities.set(ab.slot, {ability: ab.ability ? new UserAbility(DataManager.getAbility(ab.ability)) : undefined});
    }

    //GENERAL GETTERS ------------------------------
    getCurrency(id: number) { return this.currencies.get(id)!; }
    getZone() {return DataManager.zones.get(this.zone)!;}
    getUnlockedZones() {return DataManager.zones.filter(x => this.unlockedZones.includes(x._id));}
    getRequiredExp(level = this.level) {return Math.round(cf.exp_req_base_exp + (cf.exp_req_base_exp * ((level  ** cf.exp_req_multiplier)-level)));}
    getUser() { return client.users.get(this.userID)!; }
    getName() { return client.users.get(this.userID)!.username; }
    getHealthPercentage() { return this.hp / this.getStats().base.hp * 100; }
    getCooldown(name: string)
    {
        if (!this.command_cooldowns.has(name)) return undefined;
        const cd = this.command_cooldowns.get(name)!.nextDate().toDate().getTime() - new Date().getTime();
        return formatTime(cd);
    }
    getProfession(id: number) { return this.professions.get(id); }
    getUnlockedAbilities() { return this.class.getSpellbook().filter(x => x.level <= this.level); }
    getPatreonRank() { return this.patreonRank ? DataManager.getPatreonRank(this.patreonRank) : undefined;}
    //GENERAL SETTERS
    setCooldown(name: string, duration: number, ignoreReduction = false)
    {
        if (this.command_cooldowns.has(name)) return;
        const d = new Date();
        let reduction = this.getPatreonRank() ? this.getPatreonRank()!.cooldown_reduction : 0;
        if (client.guilds.get(cf.official_server)?.members.get(this.userID)?.roles.has("651567406967291904")) reduction += 0.03;
        if (ignoreReduction) d.setSeconds(d.getSeconds() + duration);
        else d.setSeconds(d.getSeconds() + (duration * (clamp(1 - reduction, 0, 1))));
        this.command_cooldowns.set(name, new CronJob(d, 
        function(this: {command_cooldowns: Discord.Collection<string,CronJob>; name: string}) 
        {
            this.command_cooldowns.delete(this.name);
        }, undefined, true, undefined, {commandCooldowns: this.command_cooldowns, name: name}));
    }
    clearCooldown(name: string) { if(this.command_cooldowns.has(name)) this.command_cooldowns.get(name)?.stop(); this.command_cooldowns.delete(name); }
    gainExp(amount: number, msg: Discord.Message)
    {
        while (amount > 0)
        {
            if (this.level >= cf.level_cap) return;
            const reqExp = this.getRequiredExp();
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
    gainProfessionSkill(id: number, skill: number, greenZone: number, grayZone: number, isGathering = false)
    {
        const prof = this.getProfession(id);
        const pd = DataManager.getProfessionData(id);
        if (!prof || !pd) return {skillgain: 0, newRecipes: []}; 
        if (prof.skill >= grayZone) return {skillgain: 0, newRecipes: []}; 
        if (prof.skill >= pd.maxSkill) return {skillgain: 0, newRecipes: []}; 
        if (prof.skill >= greenZone)
        {
            if (isGathering && randomIntFromInterval(0,100) > 25) return {skillgain: 0, newRecipes: []}; 
            if (!isGathering && randomIntFromInterval(0,100) > 50) return {skillgain: 0, newRecipes: []}; 
        } 

        //filter to recipes we don't have then filter to recipes we have when adding skill
        const newRecipes = pd.recipes.filter(x => x.skill_req > prof!.skill).filter(x => x.skill_req <= prof!.skill + skill).map(x => DataManager.getItem(x.item_id)!);

        //increase skill and return
        if (isGathering && randomIntFromInterval(0,100) > 50) return {skillgain: 0, newRecipes: []}; 
        prof.skill = clamp(prof.skill + skill, 0, pd.maxSkill);
        return {skillgain: skill, newRecipes: newRecipes};
    }

    //EQUIPMENT & ITEMS ------------------------------
    async equipItem(item: _anyItem, msg: Discord.Message)
    {
        //check if user owns the item in inventory.
        const finv = this.inventory.filter(x=> x.id == item._id);
        if (finv.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you do not own the item: ${item._id} - ${item.icon} __${item.name}__.`);

        //check if the this can equip it
        if (item instanceof DbEquipmentItem)
        {
            if (item.levelRequirement > this.level) return msg.channel.send(`\`${msg.author.username}\`, you are too low level to equip that item. (The level requirement is lvl ${item.levelRequirement})`);
            if (!this.class.types.includes(item.type)) return msg.channel.send(`\`${msg.author.username}\`, your class in not allowed to wear the item type: \`${item.getType().name}\``);
        }

        const selItem: anyItem | undefined = finv.length > 1
        // eslint-disable-next-line no-async-promise-executor
        ? await new Promise(async function (resolve)
            {
                const itemSelectEmbed = new Discord.RichEmbed()
                .setColor('#fcf403')
                .setTitle(`Duplicate items found`)
                .setDescription(`**You have multiple items with that id. Which one do you want to equip, \`${msg.author.username}\`?**`)
                .setTimestamp()
                .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
                let optionString = "";
                for (const fi of finv) optionString += `${finv.indexOf(fi) + 1} - ${item.icon} ${item.name} ${fi.getDataString()}`;
                itemSelectEmbed.addField("**Options**", optionString);
                msg.channel.send(itemSelectEmbed);
                //await response and check it
                const rr = (await msg.channel.awaitMessages((m: Discord.Message) => m.author.id == msg.author.id, { time: 30000, maxMatches: 1 })).first().content;
                if (isNaN(+rr) || +rr - 1 < 0 || +rr > finv.length) return resolve(undefined);
                return resolve(finv[+rr - 1]);
            })
        : finv[0];
        if (!selItem) return msg.channel.send(`\`${msg.author.username}\`, incorrect input.`);

        if (selItem instanceof EquipmentItem && item instanceof DbEquipmentItem)
        {
            const selSlot: number = item.slots.length > 1 && !item.twoHand
            // eslint-disable-next-line no-async-promise-executor
            ? await new Promise(async function (resolve)
            {
                const slotSelectEmbed = new Discord.RichEmbed()
                .setColor('#fcf403')
                .setTitle(`Multiple slots possible.`)
                .setDescription(`**This item can be equipped in multiple slots. What slot would you like it to be equipped in, \`${msg.author.username}\`?**`)
                .setTimestamp()
                .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
                let slotString = "";
                for (const s of item.getSlots()) slotString += `${s._id} - ${s.name}\n\n`;
                slotSelectEmbed.addField("**Possible slots**", slotString);
                msg.channel.send(slotSelectEmbed);
                //await response and check it
                const rr = (await msg.channel.awaitMessages((m: Discord.Message) => m.author.id == msg.author.id, { time: 30000, maxMatches: 1 })).first().content;
                if (isNaN(+rr) || !item.slots.includes(+rr)) return resolve(-1);
                return resolve(+rr);
            })
            : item.slots[0];

            if (selSlot == -1) return msg.channel.send(`\`${msg.author.username}\`, you entered an invallid slot.`);
            
            if (item.twoHand)
            {
                const mainhand = this.equipment.get(1)?.item;
                const offhand = this.equipment.get(2)?.item;
                if (mainhand) this.addItemToInventory(mainhand);
                if (offhand) this.addItemToInventory(offhand);

                this.equipment.set(1,{item: selItem});
                this.equipment.set(2,{item: undefined});
            }
            else if ((item.slots.includes(1) || item.slots.includes(2)) && this.isWearingTwoHand())
            {
                const old = this.equipment.get(1)?.item;
                if (old) this.addItemToInventory(old);
                this.equipment.set(1, {item: undefined});
                this.equipment.set(selSlot, {item: selItem});
            }
            else 
            {
                const old = this.equipment.get(selSlot)?.item;
                if (old) this.addItemToInventory(old);
                this.equipment.set(selSlot, {item: selItem});
            }
            this.inventory.splice(this.inventory.indexOf(selItem),1);
            return msg.channel.send(`\`${msg.author.username}\` has sucessfully equipped ${item._id} - ${item.icon} __${item.name}__ in the slot __${DataManager.getItemSlot(selSlot).name}__`);
        }
        else return msg.channel.send(`\`${msg.author.username}\`, that item is not equippable.`);
    }
    async useItem(item: _anyItem, msg: Discord.Message, amount = 1)
    {
        //check if user owns the item in inventory.
        const finv = this.inventory.filter(x=> x.id == item._id);
        if (finv.length == 0) return msg.channel.send(`\`${msg.author.username}\`, you do not own the item: ${item._id} - ${item.icon} __${item.name}__.`);
        const invi = finv[0];
        if (invi instanceof EquipmentItem) await this.equipItem(item,msg);
        if (invi instanceof MaterialItem) return msg.channel.send(`\`${msg.author.username}\`, that item cannot be used.`);
        if (invi instanceof ConsumableItem) 
        {
            if (invi.amount < amount) return msg.channel.send(`\`${msg.author.username}\`, you do not own enough of the item: ${item._id} - ${item.icon} __${item.name}__. You only own ${invi.amount}.`);
            for (let i=0; i < amount; i++) for (const e of invi.effects) this.applyEffect(e);
            if (invi.amount > amount) invi.amount-= amount;
            else (this.inventory.splice(this.inventory.indexOf(invi),1));
            msg.channel.send(`\`${msg.author.username}\`, has sucessfully used: ${item._id} - ${item.icon} __${item.name}__ ${amount ? `x${amount}` :""}`);
        }
    }
    applyEffect(e: {effect: string; [key: string]: any}) //TODO: change system
    {
        switch(e.effect.toUpperCase())
        {
            case "INSTANT_HEAL":
                if (e.amount && this.hp < this.getStats().base.hp) this.hp = clamp(this.hp + e.amount, 0, this.getStats().base.hp);
                break;
        }
    }
    isWearingTwoHand() {return this.equipment.get(1)?.item?.id == undefined ? false : (DataManager.getItem(this.equipment.get(1)!.item!.id) as DbEquipmentItem).twoHand;}
    addItemToInventoryFromId(id: number, amount = 1): void
    {
        const itemData = DataManager.getItem(id);
        if (itemData instanceof DbEquipmentItem) { for (let i = 0; i < amount; i++) this.addItemToInventory(new EquipmentItem(itemData._id));}
        else if (itemData instanceof DbMaterialItem) this.addItemToInventory(new MaterialItem(itemData._id,amount));
        else if (itemData instanceof DbConsumableItem) this.addItemToInventory(new ConsumableItem(itemData._id,amount,itemData.effects));
    }
    removeItemFromInventoryFromId(id: number, amount = 1): void
    {
        const itemData = DataManager.getItem(id);
        const invEntry = this.inventory.find(x => x.id == id);
        if (itemData instanceof DbEquipmentItem && invEntry) for (let i = 0; i < amount; i++) this.inventory.splice(this.inventory.indexOf(invEntry),1);
        else if (itemData instanceof DbMaterialItem && invEntry && invEntry instanceof MaterialItem) 
        {
            if (invEntry.amount > amount) invEntry.amount -= amount;
            else this.inventory.splice(this.inventory.indexOf(invEntry),1);
        }
        else if (itemData instanceof DbConsumableItem && invEntry && invEntry instanceof ConsumableItem) 
        {
            if (invEntry.amount > amount) invEntry.amount -= amount;
            else this.inventory.splice(this.inventory.indexOf(invEntry),1);
        }
    }
    removeEntryFromInventory(item: EquipmentItem | ConsumableItem | MaterialItem): void
    {
        this.inventory.splice(this.inventory.indexOf(item),1);
    }
    addItemToInventory(item: EquipmentItem | ConsumableItem | MaterialItem): void
    {
        if (item instanceof ConsumableItem || item instanceof MaterialItem)
        {
            const i = this.inventory.find(x => Object.getPrototypeOf(item) == Object.getPrototypeOf(x) && x.id == item.id) as ConsumableItem | MaterialItem;
            if (i) i.amount += item.amount;
            else this.inventory.push(item);
        }
        else this.inventory.push(item);
    }
    checkForItemsAndAmount(costs: {item: _anyItem | undefined; amount: number}[], multiplier = 1)
    {
        //check if user has enough of the costs.
        const costErrorStrings = [];
        for (const cost of costs)
        {
            if (!cost.item) continue;
            const invEntry = this.inventory.find(x => x.id == cost.item?._id);
            if (!invEntry) { costErrorStrings.push(`${cost.item.getDisplayString()} x${multiplier * cost.amount}`); continue; }
            if (invEntry instanceof ConsumableItem || invEntry instanceof MaterialItem)
            {
                if (invEntry.amount < cost.amount * multiplier) costErrorStrings.push(`${cost.item.getDisplayString()} x${(cost.amount * multiplier) - invEntry.amount}`);
            }
            if (invEntry instanceof EquipmentItem)
            {
                const um = this.inventory.filter(x => x.id == cost.item?._id).length;
                if (um < cost.amount * multiplier) costErrorStrings.push(`${cost.item.getDisplayString()} x${(cost.amount * multiplier) - um}`);
            }
        }
        return costErrorStrings;
    }

    //COMBAT METHODS
    getStats() 
    {
        const result = { 
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
                hp: cf.stats.base.hp + ((this.level-1) * cf.stats.increase.hp),
                atk: 0,
                def: 0,
                acc: 0
            }
        };
        for (const e of this.equipment.values())
        {
            if (!e.item) continue;
            const i = DataManager.getItem(e.item.id) as DbEquipmentItem;
            result.gear.atk += i.stats.base.atk;
            result.gear.def += i.stats.base.def;
            result.gear.acc += i.stats.base.acc;
        }
        
        result.total.atk = result.base.atk + result.gear.atk;
        result.total.def = result.base.def + result.gear.def;
        result.total.acc = result.base.acc + result.gear.acc;
        return result;
    }
    dealDamage(baseHitChance: number)
    {
        let miss = false;
        let crit = false;
        const stats = this.getStats().total;
        let dmg = stats.atk;

        const hitChance = (stats.acc / (this.level * 10)) * 100;
        const critChance = hitChance - 85;
        if (randomIntFromInterval(0,100) > baseHitChance + hitChance) miss = true; 
        if (randomIntFromInterval(0,100) < critChance) {dmg *= 1.5; crit = true; }
        return {dmg: dmg, miss: miss, crit: crit};
    }
    resetAbilities()
    {
        for (const ab of this.abilities)
        {
            if (!ab[1].ability) continue;
            ab[1].ability.remainingCooldown = 0;
        }
    }
    
    //EVENTS ----------
    onLevel(msg: Discord.Message)
    {
        //regenerate health
        this.hp = this.getStats().base.hp;

        //check for new abilities.
        let msgText = `\`${this.getUser().username}\` has reached level ${this.level}!`;
        const unlockedAbilities = this.class.getSpellbook().filter(x => x.level == this.level);
        if (unlockedAbilities.length > 0) msgText += `\nYou have unlocked the following abilities:\n ${unlockedAbilities.map(x => `${x.ability.id} - ${x.ability.name}`).join("\n")}`;
        
        msg.channel.send(msgText);
    }
    onDeath()
    {
        //set exp to same % but in previous level and lose a level
        const percentage = this.exp / this.getRequiredExp();
        this.level = clamp(this.level-1, 1, Number.POSITIVE_INFINITY);
        this.exp = percentage * this.getRequiredExp();
        
        //reset hp
        this.hp = this.getStats().base.hp;
    }
}

export class SerializedUser
{
    userID: string;
    zone: number;
    level: number;
    patreonRank: string|undefined;
    patreonMemberID: string|undefined;
    exp: number;
    classID: number;
    joined: Date;
    foundBosses: number[];
    unlockedZones: number[];
    currencies: {currencyID: number; amount: number}[] = []
    inventory: (SerializedEquipmentItem | SerializedConsumableItem | SerializedMaterialItem)[] = []
    equipment: {slot: number; item: SerializedEquipmentItem | undefined}[] = []
    abilities: {slot: number; ability: number | undefined}[] = []
    cooldowns: {name: string; date: Date}[] = []
    hp: number;
    professions: {id: number; skill: number}[] = [];
    constructor(user: User)
    {
        this.userID = user.userID;
        this.zone = user.zone;
        this.level = user.level;
        this.patreonRank = user.patreonRank;
        this.patreonMemberID = user.patreonMemberID;
        this.exp = user.exp;
        this.classID = user.class._id;
        this.joined = user.joined;
        this.foundBosses = user.foundBosses;
        this.unlockedZones = user.unlockedZones;
        for (const c of user.currencies) {this.currencies.push({currencyID: c[0], amount: c[1].value});}
        for (const invEntry of user.inventory)
        {
            if (invEntry instanceof EquipmentItem) this.inventory.push(new SerializedEquipmentItem(invEntry.id,invEntry.craftingBonus));
            if (invEntry instanceof MaterialItem) this.inventory.push(new SerializedMaterialItem(invEntry.id,invEntry.amount));
            if (invEntry instanceof ConsumableItem) this.inventory.push(new SerializedConsumableItem(invEntry.id,invEntry.amount));
        }
        for (const e of user.equipment) this.equipment.push({item: e[1].item ? new SerializedEquipmentItem(e[1].item.id, e[1].item?.craftingBonus): undefined, slot: e[0]});
        this.hp = user.hp;
        for (const p of user.professions) this.professions.push({id: p[0], skill: p[1].skill});
        for (const cd of user.command_cooldowns) this.cooldowns.push({name: cd[0], date: cd[1].nextDate().toDate()});
        for (const ab of user.abilities) this.abilities.push({slot: ab[0], ability: ab[1].ability ? ab[1].ability.data.id : undefined});
    }
}