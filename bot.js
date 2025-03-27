// Import required packages
const { Client, GatewayIntentBits } = require('discord.js');
const { Client: SSHClient } = require('ssh2');
require('dotenv').config(); // Load environment variables from .env file

// Get the Discord token and SSH credentials from the environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SSH_HOST = process.env.SERVER_ADDR; // Use SERVER_ADDR from .env
const SSH_PORT = process.env.SSH_PORT; // SSH port from .env
const SSH_USER = process.env.SSH_USER; // SSH username from .env
const SSH_PASSWORD = process.env.SSH_PASSWORD; // SSH password from .env
const SUDO_COMMAND_PASSWORD = process.env.SUDO_COMMAND_PASSWORD; // Sudo password from .env

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Event listener for when the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Function to execute SSH commands
function executeSSHCommand(command, message) {
    const conn = new SSHClient();
    conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
            if (err) {
                message.reply('Error executing command.');
                return;
            }
            let output = '';
            stream.on('close', (code, signal) => {
                conn.end();
                message.channel.send(`\`\`\`\n${output}\n\`\`\``);
            }).on('data', (data) => {
                output += data;
            }).stderr.on('data', (data) => {
                message.reply(`Error: ${data}`);
            });
        });
    }).connect({
        host: SSH_HOST,
        port: SSH_PORT,
        username: SSH_USER,
        password: SSH_PASSWORD,
    });
}

// Event listener for message creation
client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Ignore bot messages

    // Command to check bot's responsiveness
    if (message.content === '!ping') {
        message.channel.send('Pong!');
    }

    // Command to kick a user (requires admin rights)
    if (message.content.startsWith('!kick')) {
        if (!message.member.permissions.has('KICK_MEMBERS')) {
            return message.reply("You don't have permission to kick members.");
        }

        const userToKick = message.mentions.users.first();
        if (userToKick) {
            const member = message.guild.members.cache.get(userToKick.id);
            if (member) {
                await member.kick('Optional reason for kicking').catch(err => {
                    message.reply('I was unable to kick the member');
                    console.error(err);
                });
                message.channel.send(`${userToKick.tag} has been kicked.`);
            } else {
                message.reply("That user isn't in this guild!");
            }
        } else {
            message.reply("You need to mention a user to kick!");
        }
    }

    // Command to ban a user (requires admin rights)
    if (message.content.startsWith('!ban')) {
        if (!message.member.permissions.has('BAN_MEMBERS')) {
            return message.reply("You don't have permission to ban members.");
        }

        const userToBan = message.mentions.users.first();
        if (userToBan) {
            const member = message.guild.members.cache.get(userToBan.id);
            if (member) {
                await member.ban({ reason: 'Optional reason for banning' }).catch(err => {
                    message.reply('I was unable to ban the member');
                    console.error(err);
                });
                message.channel.send(`${userToBan.tag} has been banned.`);
            } else {
                message.reply("That user isn't in this guild!");
            }
        } else {
            message.reply("You need to mention a user to ban!");
        }
    }

    // Command to delete a channel (requires manage channels permission)
    if (message.content.startsWith('!deleteChannel')) {
        if (!message.member.permissions.has('MANAGE_CHANNELS')) {
            return message.reply("You don't have permission to delete channels.");
        }

        const channelToDelete = message.mentions.channels.first();
        if (channelToDelete) {
            await channelToDelete.delete('Optional reason for deletion').catch(err => {
                message.reply('I was unable to delete the channel');
                console.error(err);
            });
            message.channel.send(`${channelToDelete.name} has been deleted.`);
        } else {
            message.reply("You need to mention a channel to delete!");
        }
        
    // Command to delete the server (requires admin rights)
    if (message.content === '!deleteServer') {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply("You don't have permission to delete the server.");
        }

        message.guild.delete('Server deleted by bot command').then(() => {
            message.channel.send('The server has been deleted.');
        }).catch(err => {
            message.reply('I was unable to delete the server');
            console.error(err);
        });
    }

    // Command to get server metrics
    if (message.content === '!metrics') {
        const command = `
            echo "External IP Address:" && curl -s ifconfig.me && 
            echo "CPU Usage:" && top -bn1 | grep "Cpu(s)" && 
            echo "Memory Usage:" && free -m && 
            echo "ZFS Usage:" && zfs list
        `;
        executeSSHCommand(command, message);
    }

    // Command to restart the server
    if (message.content === '!restart') {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply("You don't have permission to restart the server.");
        }

        const command = `echo ${SUDO_COMMAND_PASSWORD} | sudo -S reboot`;
        executeSSHCommand(command, message);
    }

    // Command to shut down the server
    if (message.content === '!shutdown') {
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply("You don't have permission to shut down the server.");
        }

        const command = `echo ${SUDO_COMMAND_PASSWORD} | sudo -S shutdown now`;
        executeSSHCommand(command, message);
    }
});

// Log in to Discord with the bot token
client.login(DISCORD_TOKEN);
