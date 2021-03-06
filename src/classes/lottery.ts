import Discord from "discord.js";
import { DataManager } from "./dataManager";
import { constructCurrencyString } from "../utils";
import cf from "../config.json";
import { client } from "../RPGThunder";

export class Lottery
{
  id: number;
  drawDate: Date;
  msgID: string;
  ticketCost: number;
  tickets: Discord.Collection<string, {tickets: number}> = new Discord.Collection();

  constructor(dbObj1: any)
  {
    this.id = dbObj1.id;
    this.drawDate = dbObj1.drawDate;
    this.msgID = dbObj1.msgID;
    this.ticketCost = dbObj1.ticketCost;

    for (const obj of dbObj1.tickets) this.tickets.set(obj.userID, {tickets: obj.tickets});
  }
  public getTicketsForUser(userID: string)
  {
    return this.tickets.has(userID) ? this.tickets.get(userID)!.tickets : 0;
  }
  public addTicketsForUser(userID: string, amount: number)
  {
    if (this.tickets.has(userID)) this.tickets.get(userID)!.tickets += amount;
    else this.tickets.set(userID, { tickets: amount });
  }
  public async updateMessage()
  {
    const message = (await client.channels.fetch(cf.lottery_textChannel, true)) ? await (await client.channels.fetch(cf.lottery_textChannel, true) as Discord.TextChannel).messages.fetch(DataManager.activeLottery.msgID) : undefined;
    if (!message) return console.error(`Fatal Error: Failed to update lottery message due to not finding the message.`);

    //construct embed
    const embed = new Discord.MessageEmbed()
    .setTitle(`Lottery #${DataManager.activeLottery.id} | Prize: ${constructCurrencyString(1,DataManager.activeLottery.getPrize())}`)
    .setDescription(`**Top Entries:**\n${DataManager.activeLottery.tickets.keyArray().sort((a,b) => DataManager.activeLottery.tickets.get(b)!.tickets - DataManager.activeLottery.tickets.get(a)!.tickets).slice(0,15).map(x => `\`${client.users.cache.find((y) => y.id == x)?.username}\` - **${DataManager.activeLottery.tickets.get(x)?.tickets} tickets**`).join("\n")}`)
    .setTimestamp(DataManager.activeLottery.drawDate)
    .setFooter("Ends", 'http://159.89.133.235/DiscordBotImgs/logo.png')
    .setColor('#fcf403');

    message.edit(embed);
  }
  public getPrize(){ return this.tickets.array().reduce((pv, v) => pv + v.tickets ,0) * this.ticketCost; }
}
export class SerializedLottery
{
  id: number;
  drawDate: Date;
  msgID: string;
  ticketCost: number;
  tickets: {userID: string; tickets: number}[] = []

  constructor(l: Lottery)
  {
    this.id = l.id;
    this.drawDate = l.drawDate;
    this.msgID = l.msgID;
    this.ticketCost = l.ticketCost;
    for (const t of l.tickets) this.tickets.push({userID: t[0], tickets: t[1].tickets});
  }
}
