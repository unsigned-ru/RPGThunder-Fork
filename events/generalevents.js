const main = require("../Main");
const Discord = require("discord.js");

var c;

function SetupEvents(c) {
    client = c;
    console.log("setting up events...");
    client.on("message", onMsgReceived);
    client.on('ready', onReady);
    client.on("guildMemberAdd", onUserJoin)

}

function onReady(arg)
{
    console.log(`Logged in as ${client.user.tag}!`);
}
function onMsgReceived(msg) {
    //Check if it starts with required refix
    if (!msg.content.startsWith(prefix) || msg.author.bot) return;

    //Split args and execute command if it exists.
    const args = msg.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();
        
    if (!client.commands.has(command)) return;
    try 
    {
        client.commands.get(command).execute(msg, args);
    }
    catch (error) 
    {
  	    console.error(error);
        msg.reply('there was an error trying to execute that command!');
    } 
}

function onUserJoin(user)
{
    console.log("user joined."+ user);
}

module.exports = {
    SetupEvents
}