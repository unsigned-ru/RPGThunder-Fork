import Discord from 'discord.js';
import mongo from 'mongodb';
import * as cf from "../config.json";
import {CurrencyInterface, BossDataInterface, PatreonRankInterface} from '../interfaces';
import { User, SerializedUser } from './user.js';
import { DbMaterialItem, DbEquipmentItem, DbConsumableItem, _anyItem, ItemQualityInterface, ItemTypeInterface, ItemSlotInterface } from './items.js';
import { client } from '../RPGThunder.js';
import { randomIntFromInterval, constructCurrencyString, PatreonGet, get, sleep } from '../utils.js';
import { CronJob } from 'cron';
import { Profession } from './profession.js';
import { Lottery, SerializedLottery } from './lottery.js';
import { Class } from './class.js';
import { Zone } from './zone.js';
import {  EnemyTypeInterface, EnemyInterface } from './enemy.js';
import { Session } from './session.js';
import { Ability } from './ability.js';

export abstract class DataManager 
{
    public static users: Discord.Collection<string,User> = new Discord.Collection();
    public static professions: Discord.Collection<number, Profession> = new Discord.Collection();
    public static classes: Discord.Collection<number,Class> = new Discord.Collection();
    public static currencies: Discord.Collection<number,CurrencyInterface> = new Discord.Collection();
    public static zones: Discord.Collection<number,Zone> = new Discord.Collection();
    public static items: Discord.Collection<number, _anyItem> = new Discord.Collection();
    private static itemQualities: Discord.Collection<number,ItemQualityInterface> = new Discord.Collection();
    private static itemTypes: Discord.Collection<number,ItemTypeInterface> = new Discord.Collection();
    public static itemSlots: Discord.Collection<number,ItemSlotInterface> = new Discord.Collection();
    public static serverPrefixes: Discord.Collection<string,string> = new Discord.Collection();
    public static blacklistedChannels: string[] = [];
    public static abilities: Discord.Collection<number, Ability> = new Discord.Collection();
    public static enemies: Discord.Collection<number, EnemyInterface> = new Discord.Collection();
    public static bossdata: Discord.Collection<number, BossDataInterface> = new Discord.Collection();
    public static enemyTypes: Discord.Collection<number, EnemyTypeInterface> = new Discord.Collection();
    public static activeLottery: Lottery;
    public static sessions: Discord.Collection<string, Session> = new Discord.Collection();
    public static patreonRanks: Discord.Collection<string, PatreonRankInterface> = new Discord.Collection();
    
    static async initializeData()
    {
        try
        {
            const mongoClient = new mongo.MongoClient(`mongodb://${cf.host}:27017`, { auth: { user: cf.mongo_user, password: cf.mongo_pass }, useUnifiedTopology: true });
            await mongoClient.connect();
            const db = await mongoClient.db(cf.mongo_dbname);
            const classesColection = await db.collection("classes");
            for (const c of await classesColection.find({}).toArray()) this.classes.set(c._id,new Class(c));

            const currenciesCollection = await db.collection("currencies");
            for (const c of await currenciesCollection.find({}).toArray()) this.currencies.set(c._id,c);

            const itemQualitiesCollection = await db.collection("itemQualities");
            for (const iq of await itemQualitiesCollection.find({}).toArray()) this.itemQualities.set(iq._id,iq);

            const itemTypesCollection = await db.collection("itemTypes");
            for (const it of await itemTypesCollection.find({}).toArray()) this.itemTypes.set(it._id,it);

            const abilityCollection = await db.collection("abilities");
            for (const ab of await abilityCollection.find({}).toArray()) this.abilities.set(ab._id,new Ability(ab));

            const itemSlotsCollection = await db.collection("itemSlots");
            for (const is of await itemSlotsCollection.find({}).toArray()) this.itemSlots.set(is._id,is);

            const zoneDataCollection = await db.collection("zoneData");
            for (const zd of await zoneDataCollection.find({}).toArray()) this.zones.set(zd._id,new Zone(zd));
            
            const enemiesCollection = await db.collection("enemies");
            for (const ed of await enemiesCollection.find({}).toArray()) this.enemies.set(ed._id, ed);

            const bossCollection = await db.collection("bosses");
            for (const bs of await bossCollection.find({}).toArray()) this.bossdata.set(bs._id, bs);

            const enemyTypesCollection = await db.collection("enemyTypes");
            for (const ed of await enemyTypesCollection.find({}).toArray()) this.enemyTypes.set(ed._id, ed);
            
            const lotteryCollection = await db.collection("lotteries");
            this.activeLottery = new Lottery((await lotteryCollection.findOne({})));

            const blacklistCollection = await db.collection("blacklists");
            this.blacklistedChannels = (await blacklistCollection.findOne({})).channels;

            const professionsCollection = await db.collection("professions");
            for (const pd of await professionsCollection.find({}).toArray()) this.professions.set(pd._id, new Profession(pd));

            const patreonRankCollection = await db.collection("patreonTiers");
            for (const pt of await patreonRankCollection.find({}).toArray()) this.patreonRanks.set(pt._id, pt);

            const itemCollection = await db.collection("items");
            for (const i of await itemCollection.find({}).toArray())
            {
                switch (i.data_type.toLowerCase())
                {
                    
                    case "equipment":
                    {
                        const eqi = new DbEquipmentItem(i);
                        this.items.set(eqi._id, eqi);
                        break;
                    }
                    case "consumable":
                    {
                        const ci = new DbConsumableItem(i);
                        this.items.set(ci._id, ci);
                        break;
                    }
                    case "material":
                    {
                        const mi = new DbMaterialItem(i);
                        this.items.set(mi._id, mi);
                        break;
                    }
                }
            }
            await this.loadCharacterData(db);

            const serverPrefixesCollection = await db.collection("serverPrefixes");
            for (const prefix of (await serverPrefixesCollection.findOne({_id: 1})).prefixes) this.serverPrefixes.set(prefix.serverID, prefix.prefix);

            await mongoClient.close();
        }
        catch(err)
        {
            console.log(err);
        }
    }

    static async registerUser(user: Discord.User, selectedClass: Class)
    {
        const newUser = new User({userID: user.id, selectedClass: selectedClass});
        this.users.set(newUser.userID,newUser);
        newUser.addItemToInventoryFromId(21,5); //pots
        newUser.getCurrency(1).value += 50; //coins

        //check if user has subscription active.
        const res = await PatreonGet("campaigns/2881951/members?include=user,currently_entitled_tiers&fields%5Buser%5D=social_connections");
        for (const d of res.data.filter((x: any) => get(x, "relationships.currently_entitled_tiers.data.length") > 0))
        {
            const userObj = res.included.find((x: any) => x.id == get(d, "relationships.user.data.id") && x.type == get(d, "relationships.user.data.type"));
            if (!userObj) continue;
            const tierID = d.relationships.currently_entitled_tiers.data[0].id;
            if (get(userObj, "attributes.social_connections.discord.user_id") == user.id) //if he has a subscription then assign it.
            {
                //get tier object
                const rank = DataManager.getPatreonRank(tierID);
                if(!rank) continue;
                newUser.patreonRank = rank._id;
                newUser.patreonMemberID = d.id;
                client.guilds.get(cf.official_server)?.members.get(user.id)?.addRole(rank.discordrole_id);
            }
        }
        
    }

    //getters
    static getCurrency(id: number): CurrencyInterface | undefined
    {
        const currency = this.currencies.get(id);
        if (!currency) console.error(`StaticData.getCurrency not found.`);
        return currency;
    }
    static getClass(id: number): Class
    {
        const selclass = this.classes.get(id);
        if (!selclass) console.error(`StaticData.getClass not found.`);
        return selclass!;
    }
    static getItem(id: number): _anyItem | undefined { return this.items.get(id); }
    static getItemByName(name: string): _anyItem | undefined { return this.items.find(x => x.name.toLowerCase().trim() == name.toLowerCase().trim()); }
    static getSpell(id: number): Ability | undefined { return this.abilities.get(id); }
    static getSpellByName(name: string): Ability | undefined { return this.abilities.find(x => x.name.toLowerCase().trim() == name.toLowerCase().trim()); }
    static getItemType(id: number): ItemTypeInterface
    {
        const itemType = this.itemTypes.get(id);
        if (!itemType) console.error(`StaticData.getItemType not found.`);
        return itemType!;
    }
    static getItemTypes(ids: number[]): ItemTypeInterface[]
    {
        const returnval = [];
        for (const id of ids)
        {
            const itemType = this.itemTypes.get(id);
            if (!itemType) console.error(`StaticData.getItemQuality ${id} not found.`);
            else returnval.push(itemType);
        }

        return returnval;
    }
    static getItemQuality(id: number): ItemQualityInterface
    {
        const itemQuality = this.itemQualities.get(id);
        if (!itemQuality) console.error(`StaticData.getItemQuality not found.`);
        return itemQuality!;
    }
    static getItemSlot(id: number): ItemSlotInterface
    {
        const itemSlot = this.itemSlots.get(id);
        if (!itemSlot) console.error(`StaticData.getItemQuality not found.`);
        return itemSlot!;
    }
    static getAbility(id: number): Ability
    {
        const ability = this.abilities.get(id);
        if (!ability) console.error(`StaticData.getAbility not found.`);
        return ability!;
    }
    static getItemSlots(ids: number[]): ItemSlotInterface[]
    {
        const returnval = [];
        for (const id of ids)
        {
            const itemSlot = this.itemSlots.get(id);
            if (!itemSlot) console.error(`StaticData.getItemQuality ${id} not found.`);
            else returnval.push(itemSlot);
        }

        return returnval;
    }
    static getUser(userID: string): User | undefined
    {
        const user = this.users.get(userID);
        return user;
    }
    static getEnemy(id: number): EnemyInterface | undefined { return this.enemies.get(id); }
    static getBossData(id: number): BossDataInterface | undefined { return this.bossdata.get(id); }
    static getEnemyType(id: number): EnemyTypeInterface | undefined { return this.enemyTypes.get(id); }
    static getPatreonRank(id: string) { return this.patreonRanks.get(id);}
    static async drawLottery()
    {
        //one last update
        this.activeLottery.updateMessage();

        //make ticket array
        let ticketCollection: string[] = [];
        for (const t of DataManager.activeLottery.tickets) for (let i = 0; i < t[1].tickets; i++) ticketCollection.push(t[0]);

        //select random winner
        let winner = ticketCollection[randomIntFromInterval(0,ticketCollection.length-1,true)];
        
        //Check if the winner is still within the official server, and is mentionable. if not then lot a new random winner.
        while (!client.users.get(winner) && ticketCollection.length > 0)
        {
            ticketCollection = ticketCollection.filter(x => x != winner);
            winner = ticketCollection[randomIntFromInterval(0,ticketCollection.length-1,true)];
        }
        const userWinner = client.users.get(winner);   

        const channel = (client.channels.get(cf.lottery_textChannel) as Discord.TextChannel);
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
        const msg = await channel.send("Lottery message initializing...") as Discord.Message;
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(18,0,0,0);
        this.activeLottery = new Lottery({id: this.activeLottery.id+1, msgID: msg.id, ticketCost: randomIntFromInterval(cf.lottery_ticketprice_min, cf.lottery_ticketprice_max,true),drawDate: d, tickets: []});
        new CronJob(this.activeLottery.drawDate, this.drawLottery, undefined, true, undefined, DataManager);
        
        //update message.
        this.activeLottery.updateMessage();
    }

    static getProfessionData(id: number) { return this.professions.get(id); }

    static async writeUserData(db: mongo.Db)
    {
        const userCollection = await db.collection("userData");

        //convert userdata to serialized format
        const serializedUserData = [];
        for (const u of DataManager.users.values()) serializedUserData.push(new SerializedUser(u));

        const bulkData = [];
        for (const sud of serializedUserData) bulkData.push({updateOne: {filter: {_id: sud.userID}, update: sud, upsert: true}});
        
        await userCollection.bulkWrite(bulkData);
    }
    static async writeLotteryData(db: mongo.Db)
    {
        const lotteryCollection = await db.collection("lotteries");
        await (lotteryCollection.updateOne({_id:1},{$set: new SerializedLottery(this.activeLottery)}));
    }
    static async writeBlacklistedChannels(db: mongo.Db)
    {
        const blacklists = await db.collection("blacklists");
        await (blacklists.updateOne({_id:1},{$set: {channels: this.blacklistedChannels}}));
    }
    static async writeServerPrefixes(db: mongo.Db)
    {
        const prefixes = await db.collection("serverPrefixes");
        const serializedPrefixes: {}[] = [];
        this.serverPrefixes.map((v,k) => serializedPrefixes.push({serverID: k, prefix: v}));
        await (prefixes.updateOne({_id:1},{$set: {prefixes: serializedPrefixes}}));
    }

    static async pushDatabaseUpdate()
    {
        console.log(`Starting database push - ${new Date().toTimeString()}`);
        const mongoClient = new mongo.MongoClient(`mongodb://${cf.host}:27017`, { auth: { user: cf.mongo_user, password: cf.mongo_pass }, useUnifiedTopology: true });
        await mongoClient.connect();
        const db = await mongoClient.db(cf.mongo_dbname);

        await this.writeLotteryData(db);
        await this.writeUserData(db);
        await this.writeBlacklistedChannels(db);
        await this.writeServerPrefixes(db);
        await mongoClient.close();
        console.log(`Database push completed - ${new Date().toTimeString()}`);
    }

    static async loadCharacterData(db: mongo.Db)
    {
        const userCollection = await db.collection("userData");

        for (const pd of await userCollection.find({}).toArray()) 
        {
            this.users.set(pd._id, new User({
                userID: pd._id,
                selectedClass: DataManager.getClass(pd.classID),
                currencies: pd.currencies,
                equipment: pd.equipment,
                exp: pd.exp,
                foundBosses: pd.foundBosses,
                hp: pd.hp,
                inventory: pd.inventory,
                joined: pd.joined,
                level: pd.level,
                professions: pd.professions,
                unlockedZones: pd.unlockedZones,
                zone: pd.zone,
                cooldowns: pd.cooldowns,
                abilities: pd.abilities,
                patreonRank: pd.patreonRank
            }));
        }
    }

    static async syncroniseRanks()
    {
        console.log(`RANK SYNCHRONIZATION STARTED -- ${new Date()}`);
        //make a key value pair array of users and ranks to assign.
        const rankValuePairs: {patreonID: string; discordID: string; tierID: string}[] = [];
        const res = await PatreonGet("campaigns/2881951/members?include=user,currently_entitled_tiers&fields%5Buser%5D=social_connections");
        for (const d of res.data.filter((x: any) => x?.relationships?.currently_entitled_tiers?.data?.length > 0))
        {
            const tierID = d.relationships.currently_entitled_tiers.data[0].id;
            const pUserID = d?.relationships?.user?.data?.id;

            const userObj = res.included.find((x: any) => x.id == pUserID && x.type == "user");
            const discordID = userObj?.attributes?.social_connections?.discord?.user_id;
            if (!discordID) continue;

            rankValuePairs.push({patreonID: d.id, discordID: discordID, tierID: tierID});
        }
        const rolesToRemove = DataManager.patreonRanks.map(x => x.discordrole_id);
        const officialServer = client.guilds.get(cf.official_server)!;
        for (const u of client.users.values())
        {
            let shouldWait = false;
            //removing
            const m = officialServer.members.get(u.id);
            if (m && m.roles.some((x) => rolesToRemove.includes(x.id))) {await m.removeRoles(rolesToRemove); shouldWait = true;}
            const userAccount = DataManager.getUser(u.id);
            if (userAccount) {userAccount.patreonRank = undefined; userAccount.patreonMemberID = undefined;}

            //re-adding
            const data = rankValuePairs.find(x => x.discordID == u.id);
            if (data)
            {
                if (userAccount) {userAccount.patreonRank = data.tierID; userAccount.patreonMemberID = data.patreonID;}
                if (m) {await m.addRole(DataManager.getPatreonRank(data.tierID)!.discordrole_id); shouldWait = true;}
            }
            if (shouldWait) await sleep(1);
        }

        console.log(`RANK SYNCHRONIZATION ENDED -- ${new Date()}`);
    }
}