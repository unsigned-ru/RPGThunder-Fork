const Discord = require('discord.js');
const mysql = require('mysql');
const generalcmds = require('./commands/generalcmds');
const generalevents = require("./events/generalevents");
const {prefix, token, mysql_host, mysql_user, mysql_pass, mysql_dbname} = require('./config.json');
const client = new Discord.Client();
module.exports.client = client;
//Setup commands
client.commands = new Discord.Collection();
generalcmds.forEach(cmd => {
  client.commands.set(cmd.name, cmd);
});

//Setup events
generalevents.SetupEvents(client);

var con = mysql.createConnection({
  host: mysql_host,
  user: mysql_user,
  password: mysql_pass,
  database: mysql_dbname
});


client.login(token);