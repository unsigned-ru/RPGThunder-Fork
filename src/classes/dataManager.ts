import Discord from 'discord.js';
import mongo from 'mongodb'
import * as cf from "../config.json"
import {_currency} from '../interfaces';
import { User, SerializedUser } from './user.js';
import { _materialItem, _equipmentItem, _consumableItem, _item, _anyItem, _itemQuality, _itemType, _itemSlot } from './items.js';
import { SetupEvents } from '../events/events.js';
import { setupAllCommands, client } from '../main.js';
import { randomIntFromInterval, constructCurrencyString } from '../utils.js';
import { CronJob } from 'cron';
import { Profession } from './profession.js';
import { Lottery, SerializedLottery } from './Lottery.js';
import { _class } from './class.js';
import { Zone } from './zone.js';
import { _enemy, _enemyType } from './enemy.js';
import { Session } from './session.js';

export abstract class DataManager 
{
    public static users :Discord.Collection<string,User> = new Discord.Collection();
    public static professions :Discord.Collection<number, Profession> = new Discord.Collection();
    public static classes :Discord.Collection<number,_class> = new Discord.Collection();
    public static currencies :Discord.Collection<number,_currency> = new Discord.Collection();
    public static zones :Discord.Collection<number,Zone> = new Discord.Collection();
    public static items :Discord.Collection<number, _anyItem> = new Discord.Collection();
    private static itemQualities :Discord.Collection<number,_itemQuality> = new Discord.Collection();
    private static itemTypes :Discord.Collection<number,_itemType> = new Discord.Collection();
    public static itemSlots :Discord.Collection<number,_itemSlot> = new Discord.Collection();
    public static serverPrefixes :Discord.Collection<string,string> = new Discord.Collection();
    public static blacklistedChannels :string[] = [];
    public static enemies :Discord.Collection<number, _enemy> = new Discord.Collection();
    public static enemyTypes :Discord.Collection<number, _enemyType> = new Discord.Collection();
    public static activeLottery: Lottery;
    public static sessions :Discord.Collection<string, Session> = new Discord.Collection();
    
    static async initializeData()
    {
        try
        {
            let mongoClient = new mongo.MongoClient(`mongodb://${cf.host}:27017`, { auth: { user: cf.mongo_user, password: cf.mongo_pass }, useUnifiedTopology: true });
            await mongoClient.connect();
            let db = await mongoClient.db(cf.mongo_dbname);
            let classesColection = await db.collection("classes");
            for (let c of await classesColection.find({}).toArray()) this.classes.set(c._id,new _class(c));

            let currenciesCollection = await db.collection("currencies");
            for (let c of await currenciesCollection.find({}).toArray()) this.currencies.set(c._id,c)

            let itemQualitiesCollection = await db.collection("itemQualities");
            for (let iq of await itemQualitiesCollection.find({}).toArray()) this.itemQualities.set(iq._id,iq)

            let itemTypesCollection = await db.collection("itemTypes");
            for (let it of await itemTypesCollection.find({}).toArray()) this.itemTypes.set(it._id,it)

            let itemSlotsCollection = await db.collection("itemSlots");
            for (let is of await itemSlotsCollection.find({}).toArray()) this.itemSlots.set(is._id,is)

            let zoneDataCollection = await db.collection("zoneData");
            for (let zd of await zoneDataCollection.find({}).toArray()) this.zones.set(zd._id,new Zone(zd))
            
            let enemiesCollection = await db.collection("enemies");
            for (let ed of await enemiesCollection.find({}).toArray()) this.enemies.set(ed._id, ed);

            let enemyTypesCollection = await db.collection("enemyTypes");
            for (let ed of await enemyTypesCollection.find({}).toArray()) this.enemyTypes.set(ed._id, ed);
            
            let lotteryCollection = await db.collection("lotteries");
            this.activeLottery = new Lottery((await lotteryCollection.findOne({})));

            let blacklistCollection = await db.collection("blacklists");
            this.blacklistedChannels = (await blacklistCollection.findOne({})).channels;

            let professionsCollection = await db.collection("professions");
            for (let pd of await professionsCollection.find({}).toArray()) this.professions.set(pd._id, pd);

            let itemCollection = await db.collection("items");
            for (let i of await itemCollection.find({}).toArray())
            {
                switch (i.data_type.toLowerCase())
                {
                    
                    case "equipment":
                        let eqi = new _equipmentItem(i);
                        this.items.set(eqi._id, eqi);
                        break;
                    case "consumable":
                        let ci = new _consumableItem(i);
                        this.items.set(ci._id, ci);
                        break;
                    case "material":
                        let mi = new _materialItem(i);
                        this.items.set(mi._id, mi);
                        break;
                }
            }
            
            await this.loadCharacterData(db);

            await mongoClient.close();
            setupAllCommands();
            SetupEvents();
        }
        catch(err)
        {
            console.log(err);
        }
    }

    static registerUser(user: Discord.User, selectedClass: _class)
    {
        let newUser = new User({user_id: user.id, selectedClass: selectedClass});
        this.users.set(newUser.user_id,newUser);
        
        newUser.addItemToInventoryFromId(21,5);
    }

    //getters
    static getCurrency(id: number) : _currency
    {
        let currency = this.currencies.get(id);
        if (!currency) console.error(`StaticData.getCurrency not found.`);
        return currency!;
    }
    static getClass(id: number) :_class
    {
        let selclass = this.classes.get(id)
        if (!selclass) console.error(`StaticData.getClass not found.`);
        return selclass!;
    }
    static getItem(id: number) :_anyItem | undefined { return this.items.get(id); }
    static getItemByName(name: string) :_anyItem | undefined { return this.items.find(x => x.name.toLowerCase().trim() == name.toLowerCase().trim()); }
    static getItemType(id: number) : _itemType
    {
        let itemType = this.itemTypes.get(id);
        if (!itemType) console.error(`StaticData.getItemType not found.`);
        return itemType!;
    }
    static getItemTypes(ids: number[]) :_itemType[]
    {
        let returnval = []
        for (let id of ids)
        {
            let itemType = this.itemTypes.get(id);
            if (!itemType) console.error(`StaticData.getItemQuality ${id} not found.`);
            else returnval.push(itemType);
        }

        return returnval;
    }
    static getItemQuality(id: number) :_itemQuality
    {
        let itemQuality = this.itemQualities.get(id);
        if (!itemQuality) console.error(`StaticData.getItemQuality not found.`);
        return itemQuality!;
    }
    static getItemSlot(id: number) :_itemSlot
    {
        let itemSlot = this.itemSlots.get(id);
        if (!itemSlot) console.error(`StaticData.getItemQuality not found.`);
        return itemSlot!;
    }
    static getItemSlots(ids: number[]) :_itemSlot[]
    {
        let returnval = []
        for (let id of ids)
        {
            let itemSlot = this.itemSlots.get(id);
            if (!itemSlot) console.error(`StaticData.getItemQuality ${id} not found.`);
            else returnval.push(itemSlot);
        }

        return returnval;
    }
    static getUser(user_id: string) : User | undefined
    {
        let user = this.users.get(user_id);
        return user;
    }
    static getEnemy(id: number) : _enemy | undefined { return this.enemies.get(id); }
    static getEnemyType(id: number) : _enemyType | undefined { return this.enemyTypes.get(id); }

    static async drawLottery()
    {
        //one last update
        this.activeLottery.updateMessage();
        //make ticket array
        let ticketCollection:string[]= [];
        for (let t of DataManager.activeLottery.tickets) for (let i = 0; i < t[1].tickets; i++) ticketCollection.push(t[0]);

        //select random winner
        let winner = ticketCollection[randomIntFromInterval(0,ticketCollection.length-1,true)];
        while (!client.users.get(winner) && ticketCollection.length > 0)
        {
            ticketCollection = ticketCollection.filter(x => x != winner);
            winner = ticketCollection[randomIntFromInterval(0,ticketCollection.length-1,true)];
        }
        let userWinner = client.users.get(winner);   

        let channel = (client.channels.get(cf.lottery_textChannel) as Discord.TextChannel);
        if (userWinner)
        {
            //announce winner and message
            await channel.send(`${userWinner.toString()} has won the lottery and received ${constructCurrencyString(1,this.activeLottery.getPrize())}!`);
            await userWinner.send(`✨ **Congratulations** ✨\n You have won the lottery of ${constructCurrencyString(1,this.activeLottery.getPrize())}!`);

            //reward the winner
            this.getUser(userWinner.id)!.getCurrency(1).value += this.activeLottery.getPrize();
        }
        else
        {
            //no winner, no one played.
            await channel.send(`No one won the lottery because no one bought tickets. Congratulations no one.`);
        }        

        //create new lottery
        let msg = await channel.send("Lottery message initializing...") as Discord.Message;
        let d = new Date();
        d.setDate(d.getDate() + 1)
        d.setHours(18,0,0,0);
        this.activeLottery = new Lottery({id: this.activeLottery.id+1, msg_id: msg.id, ticketCost: randomIntFromInterval(cf.lottery_ticketprice_min, cf.lottery_ticketprice_max,true),drawDate: d, tickets: []});
        new CronJob(this.activeLottery.drawDate, this.drawLottery, undefined, true, undefined, DataManager);
        //update message.
        this.activeLottery.updateMessage();
    }

    static getProfessionData(id: number) { return this.professions.get(id); }

    static async writeUserData(db: mongo.Db)
    {
        let userCollection = await db.collection("userData");

        //convert userdata to serialized format
        let serializedUserData = []
        for (let u of DataManager.users.values()) serializedUserData.push(new SerializedUser(u));

        let bulkData = []
        for (let sud of serializedUserData) bulkData.push({updateOne: {filter: {_id: sud.user_id}, update: sud, upsert: true}});
        
        await userCollection.bulkWrite(bulkData)
    }
    static async writeLotteryData(db: mongo.Db)
    {
        let lotteryCollection = await db.collection("lotteries");
        await (lotteryCollection.updateOne({_id:1},{$set: new SerializedLottery(this.activeLottery)}));
    }
    static async writeBlacklistedChannels(db: mongo.Db)
    {
        let blacklists = await db.collection("blacklists");
        await (blacklists.updateOne({_id:1},{$set: {channels: this.blacklistedChannels}}));
    }

    static async pushDatabaseUpdate()
    {
        console.log(`Starting database push - ${new Date().toTimeString()}`);
        let mongoClient = new mongo.MongoClient(`mongodb://${cf.host}:27017`, { auth: { user: cf.mongo_user, password: cf.mongo_pass }, useUnifiedTopology: true });
        await mongoClient.connect();
        let db = await mongoClient.db(cf.mongo_dbname);

        await this.writeLotteryData(db);
        await this.writeUserData(db);
        await this.writeBlacklistedChannels(db)

        await mongoClient.close();
        console.log(`Database push completed - ${new Date().toTimeString()}`);
    }

    static async loadCharacterData(db: mongo.Db)
    {
        let userCollection = await db.collection("userData");

        for (let pd of await userCollection.find({}).toArray()) this.users.set(pd._id, new User({
            user_id: pd._id,
            selectedClass: DataManager.getClass(pd.class_id),
            currencies: pd.currencies,
            equipment: pd.equipment,
            exp: pd.exp,
            foundBosses: pd.found_bosses,
            hp: pd.hp,
            inventory: pd.inventory,
            joined: pd.joined,
            level: pd.level,
            professions: pd.professions,
            unlocked_zones: pd.unlocked_zones,
            zone: pd.zone,
            cooldowns: pd.cooldowns
        }))
    }
   
}