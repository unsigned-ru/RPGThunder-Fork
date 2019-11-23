const Discord = require("discord.js");
const main = require("../Main");
const client = main.client;
const commands = [
	{
		name: 'ping',
		description: 'Ping!',
		execute(message, args) {
			
		},
	},
	{
		name: 'test',
		description: 'TestCommand!',
		execute(message, args) {
			message.channel.send('Test command registered.');
		},
	},
	{
		name: 'userJoinTest',
		description: 'TestCommand!',
		execute(message, args) {
			client.emit('',message.user);
		},
	}
]

function SetUpCommands()
{

}

module.exports.commands = commands;

