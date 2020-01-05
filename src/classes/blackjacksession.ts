import Discord from "discord.js";
import { _deck_card } from "../interfaces";
import { client, blackjackSessions } from "../main";
import {official_server_id,session_category_id} from "../config.json";
import { sleep, randomIntFromInterval, editCollectionNumberValue, getCurrencyIcon, getCurrencyDisplayName } from "../utils";
import { currencyModule, UserData, userDataModules } from "./userdata";

export class BlackJackSession
{
  executedChannel: Discord.TextChannel;
  user: Discord.User;
  amount: number;
  bjGuild: Discord.Guild | undefined;
  cmdChannel: Discord.TextChannel | undefined = undefined;
  destoryTimerID: number = 0;
  boardMsg: Discord.Message | undefined;
  deck: _deck_card[] = [];
  playerCards: _deck_card[] = [];
  dealerCards: _deck_card[] = [];
  isStarted = false;
  hasEnded = false;
  isStanding = false;
  invite: Discord.Invite | undefined;
  
  constructor(executedChannel:Discord.TextChannel, user:Discord.User, amount:number)
  {
    this.executedChannel = executedChannel;
    this.user = user;
    this.amount = amount;
  }

  async initAsync()
  {
    try
    {
      //Get the official server
      this.bjGuild = client.c.guilds.get(official_server_id)!;

      //create session channel with category as parent.
      var parentCategory = this.bjGuild.channels.get(session_category_id)!;
      
      //if the channel exists delete it first. then create a channel for play and add permissions for user.
      if (this.bjGuild!.channels.find(x => x.name.includes(this.user.id.slice(0,4)) && x.name.includes("blackjack"))) await this.bjGuild.channels.find(x => x.name.includes(this.user.id.slice(0,4))).delete();

      const newchannel = (await this.bjGuild!.createChannel(`blackjack-#${this.user.id.slice(0,4)}`, {type: "text", parent: parentCategory}));
      await newchannel.lockPermissions();
      if (client.c.guilds.get(official_server_id)!.members.has(this.user.id)) newchannel.overwritePermissions(this.user,{ VIEW_CHANNEL: true, READ_MESSAGES: true, READ_MESSAGE_HISTORY: true, SEND_MESSAGES: true});
      
      this.cmdChannel = newchannel as Discord.TextChannel;
    
      this.invite = await this.cmdChannel.createInvite({unique: true, maxAge: 0});
      
      this.destoryTimerID = setTimeout(this.destroySession,180000,this,false) //3min timeout
      await this.promptStart();
    }
    catch(err)
    {
      console.log(err);
    }
    
  }

  async promptStart(this:BlackJackSession)
  {
    const embed = new Discord.RichEmbed()
				.setColor('#fcf403') //Yelow
        .setTitle(`Blackjack -- Start`)
        .setDescription("Hello, I will your dealer today. Please make sure you know how to play blackjack before starting the session. Here's some information before we begin.")
        .addField("**Session Commands**",
        `Once you start the game you do not need to use a command prefix when playing.
        Instead you can type the command plainly as text.
        Here are the available commands during play:
        
        \`hit\` - Ask the dealer to add another card to your hand.
        \`stay\` - Stay with your current hand.`)

        .addField("**The Table**",
        `After starting, an embed will appear which will update live as the game progesses.`)

        .addField("**Timing**",
        `You have a 2 minute timer running for every move you have to make. If you do not make a move in time the dealer wins and the sessions closes.`)

        .addField("**Starting**",
        `To start the game please type \`start\``)

        .setTimestamp()
        .setThumbnail('http://159.89.133.235/DiscordBotImgs/logo.png')
        .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')
        
        await this.cmdChannel!.send(embed) as Discord.Message
  }

  async destroySession(session:BlackJackSession,loss:boolean)
  {
    try
    {
      clearTimeout(session.destoryTimerID);
      if (session.invite) await session.invite.delete();
      if (session.cmdChannel!) await session.bjGuild!.channels.find(x => x.id == session.cmdChannel!.id).delete();
      if (session.hasEnded) session.endGame("timeoutEnded")
      else if (loss) session.endGame("timeoutLoss")
      else session.endGame("timeout")
  
      blackjackSessions.splice(blackjackSessions.indexOf(session),1);
    }
    catch(err)
    {
      console.log(err);
    }
  }

  createDeck(this:BlackJackSession)
  {
    var suits = ["♤", "♢", "♧", "♡"];
    var values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

    for(var suit of suits)
	  {
      for(var value of values)
      {
        var card :_deck_card = {value: value, suit: suit};
        this.deck.push(card);
      }
  	}
  }

  shuffleDeck()
  {
    // for 1000 turns
    // switch the values of two random cards
    for (var i = 0; i < 1000; i++)
    {
      var location1 = Math.floor((Math.random() * this.deck.length));
      var location2 = Math.floor((Math.random() * this.deck.length));
      var tmp = this.deck[location1];

      this.deck[location1] = this.deck[location2];
      this.deck[location2] = tmp;
    }
  }

  createBoardEmbed(status:string,color: string, result: string | undefined = undefined)
  {
    const dealerData = this.getUserValueAndString(this.dealerCards,true);
    const playerData = this.getUserValueAndString(this.playerCards);

    const embed = new Discord.RichEmbed()
    .setColor(color) //Yelow
    .setTitle(`Blackjack board - Bet amount: ${getCurrencyIcon("coins")} ${this.amount} ${getCurrencyDisplayName("coins")}`)
    .setDescription(`**Status:** __${status}__`)
    .addField(`**Dealers hand: __${dealerData.value}__**`,
    `${dealerData.string}`)

    .addField(`**Your hand: __${playerData.value}__**`,
    `${playerData.string}`)

    .setTimestamp()
    .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png')

    switch (result)
    {
      case "push":
        embed.addField("**Game Ended**",
        `Push! (Draw)`
        );
        break;
      case "win":
        embed.addField("**Game Ended**",
        `You have won: ${getCurrencyIcon("coins")} ${this.amount} ${getCurrencyDisplayName("coins")}`
        );
        break;
      case "loss":
        embed.addField("**Game Ended**",
        `You have lost: ${getCurrencyIcon("coins")} ${this.amount} ${getCurrencyDisplayName("coins")}`
        );
        break;
    }

    return embed;
  }

  getUserValueAndString(cards:_deck_card[], isDealer:boolean = false)
  {
    var userValue = 0;
    var userHandString = "";

    if (cards.length == 0) userHandString = "None";

    for (var card of cards)
    {
      if (card.value == "A") userValue + 11 > 21 ? userValue += 1 : userValue += 11;
      else if (card.value == "J" || card.value == "Q" || card.value == "K") userValue+= 10;
      else userValue += parseInt(card.value);
      userHandString += `${card.value}${card.suit}\n`;
    }
    
    if (isDealer && cards.length == 1)
    {
      userHandString += "�\n";
    }

    return {value: userValue, string: userHandString};
  }

  async start(this:BlackJackSession)
  {
    clearTimeout(this.destoryTimerID)
    this.destoryTimerID = setTimeout(this.destroySession,120000,this,true) //2min timeout
    this.isStarted = true;
    this.createDeck();
    this.shuffleDeck();
    this.boardMsg = await this.cmdChannel!.send(this.createBoardEmbed("Starting...","#00fff2")) as Discord.Message
    await sleep(1000);
    this.boardMsg.edit(this.createBoardEmbed("Drawing Cards...","#ffe100"))
    //Draw card for player from deck.
    this.playerCards.push(this.deck.shift()!)
    this.boardMsg.edit(this.createBoardEmbed("Drawing Cards...","#ffe100"))
    await sleep(1000);

    //Draw card for dealer from deck.
    this.dealerCards.push(this.deck.shift()!)
    this.boardMsg.edit(this.createBoardEmbed("Drawing Cards...","#ffe100"))
    await sleep(1000);

    //Draw card for player from deck.
    this.playerCards.push(this.deck.shift()!)
    this.boardMsg.edit(this.createBoardEmbed("Your turn!","#48ff00"))
    
    //End of dealers turn, user needs to input.
  }

  hit(this:BlackJackSession)
  {
    this.playerCards.push(this.deck.shift()!);
    const playerData = this.getUserValueAndString(this.playerCards);

    if (playerData.value > 21) this.endGame("loss");
    else this.boardMsg!.edit(this.createBoardEmbed("You hit, your turn!","#48ff00"));
    //TODO: add end of round.
  }

  async stand(this:BlackJackSession)
  {
    this.isStanding = true;

    var dealerData; 
    var playerData; 

    while(true)
    {
      dealerData = this.getUserValueAndString(this.dealerCards,true);
      playerData = this.getUserValueAndString(this.playerCards);
      if (dealerData.value < playerData.value) 
      {
        //Draw card for dealer from deck.
        this.dealerCards.push(this.deck.shift()!)
        await this.boardMsg!.edit(this.createBoardEmbed("Drawing Cards...","#ffe100"))
        await sleep(1000);
        continue;
      }
      const chanceToDraw = (21 - dealerData.value) * 6;
      const rng = randomIntFromInterval(0,100);
      if (dealerData.value == playerData.value && chanceToDraw > rng)
      {
        //Draw card for dealer from deck.
        this.dealerCards.push(this.deck.shift()!)
        await this.boardMsg!.edit(this.createBoardEmbed("Drawing Cards...","#ffe100"))
        await sleep(1000);
        break;
      }
      else
      {
        break;
      }
    }

    //check result of game.
    if (dealerData.value == playerData.value) this.endGame("push");
    else if (playerData.value == 21) this.endGame("win",true);
    else if (dealerData.value > 21) this.endGame("win");
    else if (dealerData.value > playerData.value) this.endGame("loss");
    else if (dealerData.value < playerData.value) this.endGame("win");
  }

  async endGame(result:string, isBlackjack: boolean = false)
  {
    //Get users balance.
    const [currencyMod] = <[currencyModule]> await new UserData(this.user.id,[userDataModules.currencies]).init();
    this.hasEnded = true;
    switch(result)
    {
      case "timeoutEnded":
        break;
      case "timeoutLoss":
        this.executedChannel.send(`\`${this.user.username}\` their blackjack session expired and lost: ${getCurrencyIcon("coins")} ${this.amount.toFixed(0)} ${getCurrencyDisplayName("coins")} \nTheir new balance is: ${getCurrencyIcon("coins")} ${currencyMod.currencies.get("coins")?.toFixed(0)} ${getCurrencyDisplayName("coins")}`)
        editCollectionNumberValue(currencyMod.currencies,"coins", -this.amount);
        break;
        case "timeout":
        this.executedChannel.send(`\`${this.user.username}\` their blackjack session expired.`)
        break;
      case "win":
        this.boardMsg!.edit(this.createBoardEmbed("You win!","#00ff37",result))
        var amountwon = 0;
        if (isBlackjack) amountwon = (this.amount)*1.5;
        else amountwon = this.amount;
        editCollectionNumberValue(currencyMod.currencies,"coins", amountwon);
        this.executedChannel.send(`\`${this.user.username}\` has won their blackjack session and earned: ${getCurrencyIcon("coins")} ${amountwon.toFixed(0)} ${getCurrencyDisplayName("coins")} \nTheir new balance is: ${getCurrencyIcon("coins")} ${currencyMod.currencies.get("coins")!.toFixed(0)} ${getCurrencyDisplayName("coins")}`)
        break;
      case "push":
        this.boardMsg!.edit(this.createBoardEmbed("Push!","#ffee00",result))
        this.executedChannel.send(`\`${this.user.username}\` their blackjack session ended in a push!`);
        break;
      case "loss":
        this.boardMsg!.edit(this.createBoardEmbed("You lose!","#ff0000",result))
        editCollectionNumberValue(currencyMod.currencies,"coins", -this.amount);
        this.executedChannel.send(`\`${this.user.username}\` has lost their blackjack session and lost: ${getCurrencyIcon("coins")} ${this.amount.toFixed(0)} ${getCurrencyDisplayName("coins")} \nTheir new balance is: ${getCurrencyIcon("coins")} ${currencyMod.currencies.get("coins")?.toFixed(0)} ${getCurrencyDisplayName("coins")}`)
        break;
    }
    currencyMod.update(this.user.id);
    this.cmdChannel!.send("The game has ended, when you are finished looking at the board please type `exit`")
    clearTimeout(this.destoryTimerID);
    this.destoryTimerID = setTimeout(this.destroySession, 10000,this,false)
  }
  
  
  async handleSessionCommand(this:BlackJackSession, message: Discord.Message)
  {
    var messageContent = message.content.toLowerCase();
    try
    {
      message.delete();
      switch(messageContent)
      {
        case "start":
          if (!this.hasEnded && !this.isStarted) this.start();
          break;
        case "hit":
          if (!this.hasEnded && this.isStarted && !this.isStanding) this.hit();
          break;
        case "stay":
          if (!this.hasEnded && this.isStarted && !this.isStanding) this.stand();
          break;
        case "exit":
          if (this.hasEnded) {clearTimeout(this.destoryTimerID); this.destroySession(this,false);}
          break;
      }
      
    }
    catch(err) {console.log(err);}
  }
}