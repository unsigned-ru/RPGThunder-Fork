import Discord from 'discord.js';
import mongo from 'mongodb'
import * as cf from "./config.json"
import { _class, _currency, _itemQuality, _itemType, _itemSlot, _zone} from './interfaces';
import { User, SerializedUser } from './user.js';
import { _materialItem, _equipmentItem, _consumableItem, _item } from './classes/items.js';

export abstract class DataManager 
{
    public static users :Discord.Collection<string,User> = new Discord.Collection();
    
    public static classes :Discord.Collection<number,_class> = new Discord.Collection();
    public static currencies :Discord.Collection<number,_currency> = new Discord.Collection();
    private static items :Discord.Collection<number, _materialItem | _equipmentItem | _consumableItem> = new Discord.Collection();
    private static itemQualities :Discord.Collection<number,_itemQuality> = new Discord.Collection();
    private static itemTypes :Discord.Collection<number,_itemType> = new Discord.Collection();
    public static itemSlots :Discord.Collection<number,_itemSlot> = new Discord.Collection();
    static mongoClient = new mongo.MongoClient(`mongodb://${cf.host}:27017`, { auth: { user: cf.mongo_user, password: cf.mongo_pass }, useUnifiedTopology: true });
    
    static async initializeData()
    {
        try
        {
            await this.mongoClient.connect();

            var db = await this.mongoClient.db(cf.mongo_dbname);
            var classesColection = await db.collection("classes");
            for (let c of await classesColection.find({}).toArray()) this.classes.set(c._id,c);

            var currenciesCollection = await db.collection("currencies");
            for (let c of await currenciesCollection.find({}).toArray()) this.currencies.set(c._id,c)

            var itemQualitiesCollection = await db.collection("itemQualities");
            for (let iq of await itemQualitiesCollection.find({}).toArray()) this.itemQualities.set(iq._id,iq)

            var itemTypesCollection = await db.collection("itemTypes");
            for (let it of await itemTypesCollection.find({}).toArray()) this.itemTypes.set(it._id,it)

            var itemSlotsCollection = await db.collection("itemSlots");
            for (let is of await itemSlotsCollection.find({}).toArray()) this.itemSlots.set(is._id,is)

            var itemCollection = await db.collection("items");
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
        }
        catch(err)
        {
            console.log(err);
        }
    }

    static registerUser(user: Discord.User, selectedClass: _class)
    {
        var newUser = new User({user_id: user.id, selectedClass: selectedClass});
        this.users.set(newUser.user_id,newUser);
    }

    //getters
    static getCurrency(id: number) : _currency
    {
        var currency = this.currencies.get(id);
        if (!currency) console.error(`StaticData.getCurrency not found.`);
        return currency!;
    }
    static getClass(id: number) :_class
    {
        var selclass = this.classes.get(id)
        if (!selclass) console.error(`StaticData.getClass not found.`);
        return selclass!;
    }
    static getItem(id: number) :_item | _materialItem | _equipmentItem | _consumableItem
    {
        var item = this.items.get(id);
        if (!item) console.error(`StaticData.getItem not found.`);
        return item!;
    }
    static getItemType(id: number) : _itemType
    {
        var itemType = this.itemTypes.get(id);
        if (!itemType) console.error(`StaticData.getItemType not found.`);
        return itemType!;
    }
    static getItemQuality(id: number) :_itemQuality
    {
        var itemQuality = this.itemQualities.get(id);
        if (!itemQuality) console.error(`StaticData.getItemQuality not found.`);
        return itemQuality!;
    }
    static getItemSlot(id: number) :_itemSlot
    {
        var itemSlot = this.itemSlots.get(id);
        if (!itemSlot) console.error(`StaticData.getItemQuality not found.`);
        return itemSlot!;
    }
    static getItemSlots(ids: number[]) :_itemSlot[]
    {
        var returnval = []
        for (let id of ids)
        {
            var itemSlot = this.itemSlots.get(id);
            if (!itemSlot) console.error(`StaticData.getItemQuality ${id} not found.`);
            else returnval.push(itemSlot);
        }

        return returnval;
    }
    static getUser(user_id: string) : User | undefined
    {
        var user = this.users.get(user_id);
        if (!user) console.error(`StaticData.getUser ${user_id} not found.`);
        return user;
    }
    // static getZone(zone: number) : _zone
    // {
    //     var zone = this.zones.get(user_id);
    //     if (!user) console.error(`StaticData.getUser ${user_id} not found.`);
    //     return user;
    // }

    static async writeUserData()
    {
        var db = await this.mongoClient.db(cf.mongo_dbname);
        var userCollection = await db.collection("userdata");

        //convert userdata to serialized format
        var serializedUserData = []
        for (let u of DataManager.users.values()) serializedUserData.push(new SerializedUser(u));

        await userCollection.insertMany(serializedUserData);
    }

   
}