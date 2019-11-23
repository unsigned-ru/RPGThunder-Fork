const Discord = require('discord.js');
const mysql = require('mysql');
const pingcmd = require('./commands/ping');
const {prefix, token, mysql_host, mysql_user, mysql_pass, mysql_dbname} = require('./config.json');
const client = new Discord.Client();

client.commands = new Discord.Collection();
client.commands.set(pingcmd.name, pingcmd);


//database test

var con = mysql.createConnection({
  host: mysql_host,
  user: mysql_user,
  password: mysql_pass,
  database: mysql_dbname
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
});

client.on('message', msg => {
  if (!msg.content.startsWith(prefix) || msg.author.bot) return;

  const args = msg.content.slice(prefix.length).split(/ +/);
	const command = args.shift().toLowerCase();
  msg.channel.send("executing command: "+ command);

  if(command == "dbtest")
  {
    con.connect(function(err){
      if(err != null){
        msg.reply('Error connecting to mysql:' + err+'\n');
        return;
      }
      else
      {
        msg.reply('Sucessfully connected to the database.. Listing available classes:');

        con.query("SELECT name FROM classes", function (err, result, fields) {
          if (err) throw err;
          msg.reply("Result: " + String(result[0].name));
        });
      }
    });
  }


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
});

client.login(token);