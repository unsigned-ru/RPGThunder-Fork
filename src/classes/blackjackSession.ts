/* eslint-disable no-async-promise-executor */
import { Session } from "./session";
import { User } from "./user";
import Discord from "discord.js";
import cf from "../config.json";
import { constructCurrencyString, colors, sleep } from "../utils";

export class BlackjackSesssion extends Session
{
    bet: number;
    cards: 
    {
        player: {value: string; suit: string}[];
        dealer: {value: string; suit: string}[];
        deck: {value: string; suit: string}[];
    } = {dealer: [] , player: [], deck: []}

    status = { staying: false, started: false, ended: false }

    constructor(discordUser: Discord.User, user: User, broadcastChannel: Discord.TextChannel, bet: number)
    {
        super(discordUser,user,broadcastChannel);

        this.bet = bet;
    }

    async initialize()
    {
        this.setTimer(240);
        //create channel
        await super.createChannel("Blackjack");

        //Check if announced channel is in the official guild the just mention the channel.
        //If it's outside of the official guild then create an invite to the channel.
        if (this.broadcastChannel.guild.id == cf.official_server) await this.broadcastChannel.send(`\`${this.discordUser.username}\`, your blackjack session of ${constructCurrencyString(1,this.bet)} has been set up and is ready for use in ${this.sessionChannel?.toString()}`);
        else 
        {
            await this.createInvite();
            await this.broadcastChannel.send(`\`${this.discordUser.username}\`, your blackjack session of ${constructCurrencyString(1,this.bet)} has been setup in our official server.\nTo play: **click join on the invite**. It will take you to the correct channel.\n${this.invite?.toString()}`);
        }

        //construct and send start message
        const embed = new Discord.MessageEmbed()
        .setColor('#fcf403') //Yelow
        .setTitle(`Welcome to your blackjack session, ${this.discordUser.username}`)
        .setDescription("I will your dealer today. If you do not know how the game works here's the required information!")
        .addField("**Session Commands**",
        `Once you start the game you do not need to use a command prefix when playing. Instead you can type the command plainly as text.\n`+
        `**Here are the available commands during play:**\n\n`+
        `\`hit\` - Ask the dealer to add another card to your hand.\n`+
        `\`stay\` - Stay with your current hand.\n`+
        `\`update\` - Update the board embed, use this if you are noticing discord API lag.\n`+
        `\`exit\` - You may exit the session before officially starting the game.\n`)

        .addField("**Timing**",
        `You have a **2 minute timer** running for every move you have to make. If you do not make a move in time the **dealer wins and the sessions ends**.`)

        .addField("**Starting**",
        `To start the game, type \`start\`.\nAfter starting, a message will appear which will update live as the game progesses.`)

        .setTimestamp()
        .setThumbnail('http://159.89.133.235/DiscordBotImgs/logo.png')
        .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
    
        await this.promptStart(embed);
    }

    async startGame(): Promise<boolean>
    {
        return new Promise(async (resolve) => 
        {
            this.setTimer(120);
            this.status.started = true;

            this.createDeck();
            this.shuffleDeck();
            this.updateLiveMessage(this.createBoardEmbed("creating deck...", colors.purple));
            await sleep(1.5);
            await this.updateLiveMessage(this.createBoardEmbed("shuffling deck...", colors.purple));
            await sleep(1.5);
            await this.updateLiveMessage(this.createBoardEmbed("drawing cards...", colors.yellow));
            this.cards.player.push(this.cards.deck.shift()!);
            await sleep(1);
            await this.updateLiveMessage(this.createBoardEmbed("drawing cards...", colors.yellow));
            this.cards.dealer.push(this.cards.deck.shift()!);
            await sleep(1);
            await this.updateLiveMessage(this.createBoardEmbed("drawing cards...", colors.yellow));
            this.cards.player.push(this.cards.deck.shift()!);
            await sleep(1);
            await this.updateLiveMessage(this.createBoardEmbed("drawing cards...", colors.yellow));
            this.cards.dealer.push(this.cards.deck.shift()!);
            await sleep(1);
            await this.updateLiveMessage(this.createBoardEmbed("your turn.", colors.green));
            return resolve(true);
        });
    }

    async hit(): Promise<boolean>
    {
        return new Promise(async (resolve) => 
        {
            this.cards.player.push(this.cards.deck.shift()!);
            this.setTimer(120);
        
            if (this.getUserValueAndString(this.cards.player).value > 21) {this.status.ended = true; return resolve(await this.lose()); }
            await this.updateLiveMessage(this.createBoardEmbed("your turn.", colors.green));

            return resolve(true);
        });
    }
  
    async stay(): Promise<boolean>
    {

        return new Promise(async (resolve) => 
        {
            this.setTimer(120);
            this.status.staying = true;
            const playerCardData = this.getUserValueAndString(this.cards.player);
            let dealerCardData = this.getUserValueAndString(this.cards.dealer,true);
            // eslint-disable-next-line no-constant-condition
            while(true)
            {
                if (dealerCardData.value < playerCardData.value) 
                {
                    //Draw card for dealer from deck.
                    this.cards.dealer.push(this.cards.deck.shift()!);
                    this.updateLiveMessage(this.createBoardEmbed("dealer drawing cards...", colors.yellow));
                    await sleep(1);
                    dealerCardData = this.getUserValueAndString(this.cards.dealer,true);
                    continue;
                }
                else break;
            }

            //check result of game.
            this.status.ended = true;
            this.setTimer(60);
            if (playerCardData.value == dealerCardData.value) return resolve(await this.tie());
            else if (dealerCardData.value > 21) return resolve(await this.win());
            else if (dealerCardData.value > playerCardData.value) return resolve(await this.lose());
            else if (dealerCardData.value < playerCardData.value)  return resolve(await this.win());
            });
    }

    async win(): Promise<boolean>
    {
        return new Promise(async (resolve) => 
        {
            const playerCardData = this.getUserValueAndString(this.cards.player);
            await this.updateLiveMessage(this.createBoardEmbed("you won.", colors.green));

            if (playerCardData.value == 21)
            {
                this.user.getCurrency(1).value += Math.round(this.bet*1.5);
                await this.sessionChannel?.send(`You have won with a blackjack hand! You earned ${constructCurrencyString(1,Math.round(this.bet*1.5))}.\nYour new balance is: ${constructCurrencyString(1,this.user.getCurrency(1).value)}\n**Please type \`exit\` when you are finished looking at the results.**`);
                await this.broadcastChannel.send(`\`${this.discordUser.username}\` has won their blackjack session with a blackjack hand and earned ${constructCurrencyString(1,Math.round(this.bet*1.5))}.\nTheir new balance is: ${constructCurrencyString(1,this.user.getCurrency(1).value)}.`);
                return resolve(true);
            }

            this.user.getCurrency(1).value += this.bet;
            await this.sessionChannel?.send(`You have won and earned ${constructCurrencyString(1,this.bet)}.\nYour new balance is: ${constructCurrencyString(1,this.user.getCurrency(1).value)}.\n**Please type \`exit\` when you are finished looking at the results.**`);
            await this.broadcastChannel.send(`\`${this.discordUser.username}\` has won their blackjack session and earned ${constructCurrencyString(1,this.bet)}.\nTheir new balance is: ${constructCurrencyString(1,this.user.getCurrency(1).value)}.`);
            
            return resolve(true);
        });
    }
    async tie(): Promise<boolean>
    {
        return new Promise(async (resolve) => 
        {
            await this.updateLiveMessage(this.createBoardEmbed("push.", colors.yellow));

            await this.sessionChannel?.send(`The game ended in a push (tie/draw).\n**Please type \`exit\` when you are finished looking at the results.**`);
            await this.broadcastChannel.send(`\`${this.discordUser.username}\` their blackjack session ended in a push (tie/draw).\nThey did not win/lose any coins.`);
            return resolve(true);
        });
    }
    async lose(): Promise<boolean>
    {
        return new Promise(async (resolve) => 
        {
            await this.updateLiveMessage(this.createBoardEmbed("you lost.", colors.red));
            this.user.getCurrency(1).value -= this.bet;
            await this.sessionChannel?.send(`You have lost your game of ${constructCurrencyString(1,this.bet)}.\nYour new balance is: ${constructCurrencyString(1,this.user.getCurrency(1).value)}.\n**Please type \`exit\` when you are finished looking at the results.**`);
            await this.broadcastChannel.send(`\`${this.discordUser.username}\` has lost their blackjack session of ${constructCurrencyString(1,this.bet)}.\nTheir new balance is: ${constructCurrencyString(1,this.user.getCurrency(1).value)}.`);
            return resolve(true);
        });
    }

    async onTimeout()
    {
        if (!this.status.started) this.broadcastChannel.send(`\`${this.discordUser.username}\` their Blackjack session has expired without being started.`);
        if (!this.status.ended && this.status.started)
        {
            this.user.getCurrency(1).value -= this.bet;
            this.broadcastChannel.send(`\`${this.discordUser.username}\` their Blackjack session has expired while being started.\nThey have lost: ${constructCurrencyString(1,this.bet)}.\nTheir new balance is: ${constructCurrencyString(1,this.user.getCurrency(1).value)}`);
        }
        await super.onTimeout();
    }

    async onInput(input: string)
    {
        switch(input)
        {
            case "start":
                if (!this.status.started) {this.awaitingInput = false; this.awaitingInput = await this.startGame();}
            break;
            case "hit":
                if (this.status.started && !this.status.ended && !this.status.staying) {this.awaitingInput = false; this.awaitingInput = await this.hit();}
            break;
            case "stay":
                if (this.status.started && !this.status.ended && !this.status.staying) {this.awaitingInput = false; this.awaitingInput = await this.stay();}
            break;
            case "exit":
                if (this.status.ended || !this.status.started) await super.destroySession();
            break;
            default:
                await super.onInput(input);
            break;
        }
    }

    //utility
    createDeck()
    {
      const suits = ["♤", "♢", "♧", "♡"];
      const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  
        for(const suit of suits)
        {
            for(const value of values)
            {
                this.cards.deck.push({value: value, suit: suit});
            }
        }
    }
  
    shuffleDeck(): void
    {
      // for 1000 turns
      // switch the values of two random cards
      for (let i = 0; i < 500; i++)
      {
        const location1 = Math.floor((Math.random() * this.cards.deck.length));
        const location2 = Math.floor((Math.random() * this.cards.deck.length));
        const tmp = this.cards.deck[location1];
  
        this.cards.deck[location1] = this.cards.deck[location2];
        this.cards.deck[location2] = tmp;
      }
    }

    createBoardEmbed(status: string,color: string)
    {
        const dealerCardData = this.getUserValueAndString(this.cards.dealer,true);
        const playerCardData = this.getUserValueAndString(this.cards.player,false);

        return new Discord.MessageEmbed()
        .setColor(color)
        .setTitle(`Blackjack board - Bet amount: ${constructCurrencyString(1,this.bet)}`)
        .setDescription(`**Status:** __${status}__`)
        .addField(`**Dealers hand: __${dealerCardData.value}__**`,
        `${dealerCardData.string}`)

        .addField(`**Your hand: __${playerCardData.value}__**`,
        `${playerCardData.string}`)

        .setTimestamp()
        .setFooter("RPG Thunder", 'http://159.89.133.235/DiscordBotImgs/logo.png');
    }

    getUserValueAndString(cards: {value: string; suit: string}[], isDealer = false): {value: number; string: string}
    {
      const userValues = [];
      const userHandStrings = [];
  
      if (cards.length == 0) userHandStrings.push("None");
  
      for (const card of cards)
      {
        if (card.value == "A") userValues.reduce((pv,v) => pv + v,0) + 11 > 21 ? userValues.push(1) : userValues.push(11);
        else if (card.value == "J" || card.value == "Q" || card.value == "K") userValues.push(10);
        else userValues.push(parseInt(card.value));
        userHandStrings.push(`${card.value}${card.suit}`);
      }

      //Replace any 11 ace value to 1 if the user goes over the 21 cap.
      if (userValues.reduce((pv,v) => pv + v,0) > 21)
      {
        const aceValueIndex = userValues.indexOf(21);
        if (aceValueIndex != -1) userValues[aceValueIndex] = 1;
      }
      
      let totalValue = userValues.reduce((pv,v) => pv + v,0);
      if (isDealer && userHandStrings.length >= 2 && this.status.staying == false)
      {
        userHandStrings[1] = "�";
        totalValue -= userValues[1];
      }
  
      return {value: totalValue, string: userHandStrings.join(" | ")};
    }
}

