const Discord = require('discord.js');
const client = new Discord.Client();
const prefix = '$'

client.on('ready', () => {ss
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content === 'checking if setting it up works') {
    msg.reply('woah you beast this stuff is working fine!');
  }
});

client.login('NjQ3NTA0Mjc1OTU3NzQzNjE3.XdgpjA.a_iN5qVl6ElAv5A8LnhfOr90hy0');