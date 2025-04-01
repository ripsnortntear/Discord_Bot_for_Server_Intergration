/* jshint esversion: 8 */

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { Client: SSHClient } = require('ssh2');
require('dotenv').config();

const { DISCORD_TOKEN, SERVER_ADDR, SSH_PORT, SSH_USER, SSH_PASSWORD, SUDO_COMMAND_PASSWORD } = process.env;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => console.log(`Logged in as ${client.user.tag}!`));

async function executeSSHCommand(command, message) {
    const conn = new SSHClient();
    try {
        await new Promise((resolve, reject) => {
            conn.on('ready', resolve).on('error', reject).connect({
                host: SERVER_ADDR,
                port: SSH_PORT,
                username: SSH_USER,
                password: SSH_PASSWORD
            });
        });

        const stream = await new Promise((resolve, reject) => {
            conn.exec(command, (err, stream) => {
                if (err) reject(err);
                else resolve(stream);
            });
        });

        let output = '';
        stream.on('data', data => output += data)
              .stderr.on('data', data => message.reply(`Error: ${data}`));

        await new Promise(resolve => stream.on('close', resolve));
        await message.channel.send(`\`\`\`\n${output}\n\`\`\``);
    } catch (error) {
        console.error('SSH execution error:', error);
        await message.reply('Error executing command.');
    } finally {
        conn.end();
    }
}

const commands = {
    ping: async (message) => message.channel.send('Pong!'),

    help: async (message) => {
        const helpMessage = `
        **Available Commands:**
        **!ping**: Responds with "Pong!"
        **!kick @user**: Kicks the mentioned user from the server.
        **!ban @user**: Bans the mentioned user from the server.
        **!metrics**: Displays server metrics (CPU, memory, etc.).
        **!restart**: Restarts the server (Admin only).
        **!shutdown**: Shuts down the server (Admin only).
        **!deleteChannel <#channelID>**: Deletes the specified channel from the server.
        `;
        await message.channel.send(helpMessage);
    },

    kick: async (message, args) => await handleMemberAction(message, 'kick', args),

    ban: async (message, args) => await handleMemberAction(message, 'ban', args),

    deleteChannel: async (message) => {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
            return message.reply("You don't have permission to delete channels.");

        const channelToDelete = message.mentions.channels.first();
        if (!channelToDelete) return message.reply("You need to mention a channel to delete!");

        try {
            await channelToDelete.delete('Channel deletion requested');
            await message.channel.send(`${channelToDelete.name} has been deleted.`);
        } catch (err) {
            console.error(err);
            await message.reply('I was unable to delete the channel');
        }
    },

    metrics: async (message) => {
        const command = `
            echo "External IP Address: " && curl -s ifconfig.me &&
            echo -e "\n\nCPU Usage: " && top -bn1 | grep "Cpu(s)" &&
            echo -e "\nMemory Usage: " && free -m &&
            echo -e "\nZFS Usage: " && zfs list
        `;
        await executeSSHCommand(command, message);
    },

    restart: async (message) => await handleServerAction(message, 'restart'),

    shutdown: async (message) => await handleServerAction(message, 'shutdown')
};

async function handleMemberAction(message, action, args) {
    if (!message.member.permissions.has(action === 'kick' ? PermissionsBitField.Flags.KickMembers : PermissionsBitField.Flags.BanMembers))
        return message.reply(`You don't have permission to ${action} members.`);

    const user = message.mentions.users.first();
    if (!user) return message.reply(`You need to mention a user to ${action}!`);

    const targetMember = message.guild.members.cache.get(user.id);
    if (!targetMember) return message.reply("That user isn't in this guild!");

    try {
        await targetMember[action](`${action.charAt(0).toUpperCase() + action.slice(1)} requested by ${message.author.tag}`);
        await message.channel.send(`${user.tag} has been ${action}ed.`);
    } catch (err) {
        console.error(err);
        await message.reply(`I was unable to ${action} the member`);
    }
}

async function handleServerAction(message, action) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
        return message.reply(`You don't have permission to ${action} the server.`);

    const command = `echo "${SUDO_COMMAND_PASSWORD}" | sudo -S ${action === 'restart' ? 'reboot' : 'shutdown now'}`;
    await executeSSHCommand(command, message);
}

client.on('messageCreate', async message => {
    if (message.author.bot || message.author.id !== message.guild.ownerId) return;

    const args = message.content.slice(1).split(/ +/);
    const command = args.shift().toLowerCase();

    if (commands[command]) {
        await commands[command](message, args);
    }
});

client.login(DISCORD_TOKEN);
