import Discord from "discord.js";
import { Boss } from "./boss";
import { client, zoneBossSessions } from "../main";
import {official_server_id,session_category_id} from "../config.json"
import { sleep, clamp, randomIntFromInterval, getCurrencyIcon, getCurrencyDisplayName, getMaterialIcon, getMaterialDisplayName, getItemData, getEquipmentSlotDisplayName, editCollectionNumberValue } from "../utils";
import { statsModule, equipmentModule, basicModule, abilityModule, UserData, currencyModule, materialsModule, inventoryModule } from "./userdata";
import { _boss_abbility, _item } from "../interfaces";
import { item_qualities, zones, materials } from "../staticdata";

export class ZoneBossSession
{
    executedChannel: Discord.TextChannel;
    user:Discord.User
    boss: Boss;
    sessionGuild: Discord.Guild | undefined;
    cmdChannel: Discord.TextChannel | undefined = undefined;
    destroyTimerID: number = 0;
    sessionMsg: Discord.Message | undefined;
    isStarted = false;
    isPlayerTurn = false;
    hasEnded = false;
    awaitingInput = false;
    invite: Discord.Invite | undefined;
    zoneName: string;
    log: string[] = [];
    basicMod: basicModule;
    equipmentMod: equipmentModule;
    statsMod: statsModule;
    abilityMod: abilityModule;
    currencyMod: currencyModule;
    materialMod: materialsModule;
    inventoryMod: inventoryModule;
    lastStatusString: string = "";
    lastColorString: string = "";
    lastRewardString: string = "";
    lastconditionString: string = "";
    lastExtraInfoString: string = "";

    constructor(executedChannel:Discord.TextChannel, user:Discord.User, boss: Boss,zoneName: string,basicMod:basicModule,equipmentMod:equipmentModule,statsMod:statsModule,abilityMod:abilityModule,currencyMod:currencyModule,materialMod: materialsModule,inventoryMod:inventoryModule)
    {
        this.executedChannel = executedChannel;
        this.user = user;
        this.boss = boss;
        this.zoneName = zoneName;
        this.basicMod = basicMod;
        this.equipmentMod = equipmentMod;
        this.statsMod = statsMod;
        this.abilityMod = abilityMod;
        this.currencyMod = currencyMod;
        this.materialMod = materialMod;
        this.inventoryMod = inventoryMod;
    }

    async initAsync()
    {
      try
      {
        //Get the official server
        this.sessionGuild = client.c.guilds.get(official_server_id)!;
  
        //create session channel with category as parent.
        var parentCategory = this.sessionGuild.channels.get(session_category_id)!;
        
        //if the channel exists delete it first. then create a channel for play and add permissions for user.
        if (this.sessionGuild!.channels.find(x => x.name.includes(this.user.id.slice(0,4)) && x.name.includes(this.boss.name.toLowerCase().split(" ").join('-')))) await this.sessionGuild.channels.find(x => x.name.includes(this.user.id.slice(0,4)) && x.name.includes(this.boss.name.toLowerCase().split(" ").join('-'))).delete();

        const newchannel = (await this.sessionGuild!.createChannel(`${this.boss.name}-#${this.user.id.slice(0,4)}`, {type: "text", parent: parentCategory, rateLimitPerUser: 1}));
        await newchannel.lockPermissions();
        newchannel.overwritePermissions(this.user,{ VIEW_CHANNEL: true, READ_MESSAGES: true, READ_MESSAGE_HISTORY: true, SEND_MESSAGES: true});
        this.cmdChannel = newchannel as Discord.TextChannel;
      
        this.invite = await this.cmdChannel.createInvite({maxAge: 0, unique: true});
        
        this.destroyTimerID = setTimeout(this.destroySession,180000,this,true) //3min timeout
        await this.promptStart();
      }
      catch(err)
      {
        console.log(err);
      }
      
    }

    async promptStart()
    {
      try
      {
        const embed = new Discord.RichEmbed()
        .setColor('#fcf403') //Yelow 
        .setAuthor("⚔️Boss Fight -- Start⚔️", "http://159.89.133.235/DiscordBotImgs/logo.png")
        .setTitle(`**${this.boss.name} of ${this.zoneName}**`)
  
        .addField("**Stats**",
        `❤️**HP:** ${this.boss.max_hp}\n`+
        `🗡️**ATK:** ${this.boss.atk}\n`+
        `🛡️**DEF:** ${this.boss.def}\n`
        ,true)

        .addField("**Abilities**",
        `1️⃣ ${this.boss.abilities[0].ability.name} [🗡️${(this.boss.atk * this.boss.abilities[0].ability.atk_percentage).toFixed(0)}ATK]\n`+
        `2️⃣ ${this.boss.abilities[1].ability.name} [🗡️${(this.boss.atk * this.boss.abilities[1].ability.atk_percentage).toFixed(0)}ATK]\n`+
        `3️⃣ ${this.boss.abilities[2].ability.name} [🗡️${(this.boss.atk * this.boss.abilities[2].ability.atk_percentage).toFixed(0)}ATK]\n`+
        `4️⃣ ${this.boss.abilities[3].ability.name} [🗡️${(this.boss.atk * this.boss.abilities[3].ability.atk_percentage).toFixed(0)}ATK]\n`
        ,true)

        .addField("**🕐Timing🕐**",
        `You have a 2 minute timer running for every turn. If you do not make within this timer the boss fight will result in a loss.`)

        .addField("**Turn-Based Fighting**",
        `When engaging a boss fight you will enter a turn-based session. Each turn you will you choose what ability to use. \nNote:\n*Some abilities hit harder and have less hit chance, some hit less hard but have a higher hit chance. Your stats make a diference when using these abilities.*`
        )

        .addField("**Using abilities**",
        `When it's your turn you get to choose what ability you use. You can do this by simply writing what slot the ability is in.\nExample: *In slot 1 i have the ability \`Basic Attack\`. Typing \`1\` will result in me using \`Basic Attack\`*`
        )

        .addField("**Starting**",
        `To start the session and engage the boss type \`start\``)

        .setTimestamp()
        .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
        
        await this.cmdChannel!.send(embed) as Discord.Message
      }
      catch(err)
      {
        console.log(err);
      }
    }

    async start()
    {
      clearTimeout(this.destroyTimerID)
      this.destroyTimerID = setTimeout(this.destroySession,120000,this,true) //2min timeout
      this.isStarted = true;

      //Create board
      this.sessionMsg = await this.cmdChannel!.send(await this.createSessionEmbed("Starting...","#00fff2")) as Discord.Message

      //play pre-dialogue
      while (this.boss.pre_dialogue.length > 0)
      {
        this.log.unshift(`${this.boss.name}: `+ this.boss.pre_dialogue.splice(0,1)[0]);
        this.sessionMsg.edit(await this.createSessionEmbed("Intro Dialogue","#00fff2"));
        await sleep(1000);
      }
      //Player turn.
      this.sessionMsg.edit(await this.createSessionEmbed("Your turn!","#61ff64"));
      this.isPlayerTurn = true;
      this.awaitingInput = true;
    }

    async userAttack(attackIndex: number)
    {
      clearTimeout(this.destroyTimerID)
      this.destroyTimerID = setTimeout(this.destroySession,120000,this,true) //2min timeout
      //Check if the abbility is not undefined.
      const ability = this.abilityMod.abilities.get(attackIndex);
      if (!ability) return;

      var hasCrit = false;
      //Update the boolean
      this.awaitingInput = false;
      
      //Calculate our hit chance.
      const hitChance = (((ability.base_chance /100) + (this.statsMod.stats.get("total_acc")! / (this.basicMod.level! * 10)) / 3)*100)

      if (randomIntFromInterval(0,100) <= hitChance) 
      {
        
        //Calculate the damage user does.
        var damageToDo = clamp(this.statsMod.stats.get("total_atk")! * ability.atk_multiplier, 0, ability.max_atk);
        
        //Check for a critical strike
        const critChance = hitChance - 85;
        if (randomIntFromInterval(0,100) <= critChance){hasCrit = true; damageToDo *= 1.5;}
        const damageDone = this.boss.takeDamage(damageToDo);

        const parsedDialogue = this.replaceDialogueParams(ability.dialogue,this.user.username,this.boss.name,ability.name)

        //Add to the log.
        var logEntry = parsedDialogue + ` - **Dealt 🗡️${damageDone.toFixed(0)}**`;
        if (hasCrit) logEntry += " __**[CRIT]**__"
        this.log.unshift(logEntry);
      }
      else
      {
        //Abbility has missed. Add to log.
        this.log.unshift(`**${this.user.username}** tried to attack with **${ability.name}** but **MISSED**`);
      }

      //Update hp bar and embed.
      if (this.boss.current_hp <= 0) return this.endSession("win");
      await this.sessionMsg!.edit(await this.createSessionEmbed("Enemy Turn", "#00fff2"))
      this.isPlayerTurn = false;
      await sleep(1000);
      
      this.enemyAttack();
    }
    async enemyAttack()
    {
      clearTimeout(this.destroyTimerID)
      this.destroyTimerID = setTimeout(this.destroySession,120000,this,true) //2min timeout
      //Calculate what ability should be used
      var chanceCounter = 0;
      var abilityChances: {chance:number, ability:_boss_abbility}[] = [] 
      for (let bability of this.boss.abilities)
      {
        chanceCounter += bability.chance;
        abilityChances.push({chance: chanceCounter, ability: bability.ability})
      }
      
      var ability :_boss_abbility;
      const rng = randomIntFromInterval(0,chanceCounter);
      for (let abilityChance of abilityChances)
      {
        if (rng <= abilityChance.chance)
        {
          ability = abilityChance.ability;
          break;
        }
      }

      //Calculate damageToDo
      var damageToDo = this.boss.atk * ability!.atk_percentage;
      var damageTaken = UserData.takeDamage(this.basicMod, this.statsMod, damageToDo);

      //add to log
      var parsedDialogue = this.replaceDialogueParams(ability!.dialogue,this.boss.name,this.user.username,ability!.name)
      var logEntry = parsedDialogue + ` - **Dealt 🗡️${damageTaken.toFixed(0)}**`;
      this.log.unshift(logEntry);

      //Check for loss condition
      if (this.basicMod.current_hp! <= 0) return this.endSession("loss");
      //Update session board
      this.sessionMsg!.edit(await this.createSessionEmbed("Your turn!","#61ff64"));

      this.awaitingInput = true;
      this.isPlayerTurn = true;
    }

    async endSession(condition: string)
    {
      try 
      {
        switch(condition)
        {
          case "timeout":
            if (this.hasEnded == true) return;
            this.executedChannel.send(`\`${this.user.username}\` timed out in their battle against **${this.boss.name}** and lost.`);
            UserData.levelDeathPenalty(this.basicMod);
            await this.statsMod.init(this.basicMod, this.equipmentMod);		
            UserData.resetHP(this.basicMod,this.statsMod);
            break;
          case "win":
            this.hasEnded = true;
            var rewardString = "";
            //Add drops to embed and userdata.
            for (var cd of this.boss.currency_drops)
            {
              rewardString += `${getCurrencyIcon(cd.currency_name)} ${cd.amount} ${getCurrencyDisplayName(cd.currency_name)}\n`;
              editCollectionNumberValue(this.currencyMod.currencies,cd.currency_name,cd.amount);
            } 
            for (var md of this.boss.material_drops) 
            {
              rewardString += `${materials.get(md.material_id)?.icon_name} ${md.amount} ${materials.get(md.material_id)?.display_name}\n`
              editCollectionNumberValue(this.materialMod.materials,md.material_id,md.amount);
            }
            var itemdrops = await getItemData(this.boss.item_drops) as _item[];
            for (var id of itemdrops) 
            {
              rewardString += `${id.icon_name} ${id.name} [${item_qualities.find(x => x.id == id.quality)!.name} ${getEquipmentSlotDisplayName(id.slot)}]\n`;
              UserData.addItemToInventory(this.user.id,this.inventoryMod,id.id,0,0,0);
            }
        
            var extraInfo = "";
            if (!this.basicMod.unlockedZones.includes(this.basicMod.zone! + 1))
            {
              this.basicMod.unlockedZones.push(this.basicMod.zone! +1);
              extraInfo += `You have unlocked the next zone: **${zones.get(this.basicMod.zone!+1)!.name}**\n`
            }
            await this.sessionMsg?.edit(await this.createSessionEmbed("Victory!","#61ff64","win",rewardString,extraInfo));

            this.executedChannel.send(`\`${this.user.username}\` has defeated the boss of **${this.zoneName}**, **${this.boss.name}**`);
            break;
          case "loss":
            this.hasEnded = true;
            UserData.levelDeathPenalty(this.basicMod);
            await this.statsMod.init(this.basicMod, this.equipmentMod);		
            UserData.resetHP(this.basicMod,this.statsMod);
            await this.sessionMsg?.edit(await this.createSessionEmbed("Defeat!","#fc0303","loss"));

            this.executedChannel.send(`\`${this.user.username}\` failed to defeat the boss of **${this.zoneName}**, **${this.boss.name}** and got killed.`);
            break;
        }
        this.basicMod.update(this.user.id);
        this.materialMod.update(this.user.id);
        this.currencyMod.update(this.user.id);
        clearTimeout(this.destroyTimerID)
        this.destroyTimerID = setTimeout(await this.destroySession,60000,this,false) //1min timeout
      } 
      catch (err) 
      {
        console.log(err);
      }
    }
    async destroySession(session:ZoneBossSession, timeout: boolean = false)
    {
      try
      {
        clearTimeout(session.destroyTimerID);
        if (session.invite) await session.invite.delete();
        if (session.cmdChannel!) await session.sessionGuild!.channels.get(session.cmdChannel!.id)!.delete();
        if (zoneBossSessions.has(session.user.id)) zoneBossSessions.delete(session.user.id);
        if (timeout) session.endSession("timeout");
      }
      catch(err)
      {
        console.log(err);
      }
    }
    async createSessionEmbed(status: string, color: string, condition = "",rewardString: string = "", extraInfo :string = "")
    {
      this.lastStatusString = status;
      this.lastColorString = color;
      this.lastconditionString = condition;
      this.lastRewardString = rewardString;
      this.lastExtraInfoString = extraInfo;

      var enemyHealthPercent = (this.boss.current_hp / this.boss.max_hp) * 100;
      var enemyHpBar = "▰".repeat(Math.floor(enemyHealthPercent/5));
      enemyHpBar = enemyHpBar.padEnd(20,"▱");

      var playerHealthPercent = 0;
      var playerHpBar = "▱".repeat(20);
      if (condition != "loss") 
      {
        playerHealthPercent = (this.basicMod.current_hp! / this.statsMod.stats.get("max_hp")!) * 100;
        playerHpBar = "▰".repeat(Math.ceil(playerHealthPercent/5));
        playerHpBar = playerHpBar.padEnd(20,"▱");
      }
      
      var abilityStrings: string[] = [];
      var abilityIcons:string[] = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']

      for (var a of this.abilityMod.abilities)
      {
        var abilityString :string = a[1] == undefined ? "❌ **NONE**" : `${abilityIcons[a[0]-1]} **${a[1].name}** | 🗡️${(a[1].atk_multiplier * this.statsMod.stats.get("total_atk")!).toFixed(0)} | ⚡${(((a[1].base_chance /100) + (this.statsMod.stats.get("total_acc")! / (this.basicMod.level! * 10)) / 3)*100).toFixed(0)}`;
        abilityStrings.push(abilityString);
      }

      var logString = "";
      for (let i = 0; i <= 5; i++) {if (this.log[i]) logString += `${this.log[i]}\n`}
      const embed = new Discord.RichEmbed()
      .setColor(color)
      .setAuthor(`⚔️Boss Fight -- ${status}⚔️`, "http://159.89.133.235/DiscordBotImgs/logo.png")
      .setTitle(`**${this.boss.name} of ${this.zoneName} ${condition == "win" ? "__💀[DEAD]💀__" : ""}**`)
      .setDescription(
        `❤️ ${enemyHpBar} ~ ${enemyHealthPercent.toFixed(0)}%\n\n`+
        `**${this.user.username} ${condition == "loss" ? "__💀[DEAD]💀__" : ""}**\n`+
        `❤️ ${playerHpBar} ~ ${playerHealthPercent.toFixed(0)}%\n`
      )
      .addField("**LOG**", `${logString.length == 0 ? "\u270b" : logString}`)
      .addField("**Abillities**", `${abilityStrings.join("\n")}`)
      .setTimestamp()
      .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')

      if (condition == "win")
      {
        if (rewardString.length > 0) embed.addField("**Rewards**",rewardString); 
        if (extraInfo.length > 0) embed.addField("**Extra Info**",extraInfo); 

        embed.addField("**Exit**", "When you are finished looking at the result type `exit` to close the session.");
      }
      if (condition == "loss")
      {
        embed.addField("**Defeat**", "You were defeated in battle.\n**YOU HAVE LOST 1 LEVEL AS DEATH PENALTY**\nYour health has been restored.");
        embed.addField("**Exit**", "When you are finished looking at the result type `exit` to close the session.");
      }

      return embed;
    }

    async handleSessionCommand(message:Discord.Message)
    {
      var messageContent = message.content.toLowerCase();
      try
      {
        var possibleNr = parseInt(messageContent);
        message.delete();
        if (this.isStarted && this.isPlayerTurn && this.awaitingInput && possibleNr && possibleNr >= 1 && possibleNr <=4) this.userAttack(possibleNr);
        switch(messageContent)
        {
          case "start":
            if (!this.isStarted && !this.hasEnded) this.start();
            break;
          case "update":
            await this.sessionMsg?.edit(await this.createSessionEmbed(this.lastStatusString,this.lastColorString,this.lastconditionString,this.lastRewardString,this.lastExtraInfoString));
            break;
          case "exit":
            if (this.hasEnded || !this.isStarted)
            {
              await this.destroySession(this,false);
            }
            break;
        }
      }
      catch(err) {console.log(err);}
    }

    replaceDialogueParams(dialogue: string, user:string, target:string, name: string) :string
    {
      dialogue = dialogue.replace("{user}", user);
      dialogue = dialogue.replace("{target}", target)
      dialogue = dialogue.replace("{name}",name);
      return dialogue;
    }
}
