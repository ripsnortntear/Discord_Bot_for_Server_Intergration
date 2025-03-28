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

function executeSSHCommand(command, message) {
    const conn = new SSHClient();
    conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
            if (err) return message.reply('Error executing command.');
            let output = '';
            stream.on('close', () => {
                conn.end();
                message.channel.send(`\`\`\`\n${output}\n\`\`\``);
            }).on('data', data => output += data)
              .stderr.on('data', data => message.reply(`Error: ${data}`));
        });
    }).connect({ host: SERVER_ADDR, port: SSH_PORT, username: SSH_USER, password: SSH_PASSWORD });
}

client.on('messageCreate', async message => {
    if (message.author.bot || message.author.id !== message.guild.ownerId) return;

    const { content, member, mentions, guild, channel } = message;

    if (content === '!ping') return channel.send('Pong!');

    if (content === '!help') {
        const helpMessage = `
        **Available Commands:**
        **!ping**: Responds with "Pong!"
        **!kick @user**: Kicks the mentioned user from the server.
        **!ban @user**: Bans the mentioned user from the server.
        **!deleteChannel @channel**: Deletes the mentioned channel.
        **!metrics**: Displays server metrics (CPU, memory, etc.).
        **!restart**: Restarts the server (Admin only).
        **!shutdown**: Shuts down the server (Admin only).
        `;
        return channel.send(helpMessage);
    }

    if (content.startsWith('!kick') || content.startsWith('!ban')) {
        const action = content.startsWith('!kick') ? 'kick' : 'ban';
        if (!member.permissions.has(action === 'kick' ? PermissionsBitField.Flags.KickMembers : PermissionsBitField.Flags.BanMembers))
            return message.reply(`You don't have permission to ${action} members.`);

        const user = mentions.users.first();
        if (!user) return message.reply(`You need to mention a user to ${action}!`);

        const targetMember = guild.members.cache.get(user.id);
        if (!targetMember) return message.reply("That user isn't in this guild!");

        try {
            await targetMember[action](`Optional reason for ${action}ing`);
            channel.send(`${user.tag} has been ${action}ed.`);
        } catch (err) {
            message.reply(`I was unable to ${action} the member`);
            console.error(err);
        }
    }

    if (content.startsWith('!deleteChannel')) {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels))
            return message.reply("You don't have permission to delete channels.");

        const channelToDelete = mentions.channels.first();
        if (!channelToDelete) return message.reply("You need to mention a channel to delete!");

        try {
            await channelToDelete.delete('Optional reason for deletion');
            channel.send(`${channelToDelete.name} has been deleted.`);
        } catch (err) {
            message.reply('I was unable to delete the channel');
            console.error(err);
        }
    }

    if (content === '!metrics') {
        const command = `
            echo "External IP Address: " && curl -s ifconfig.me &&
            echo "" &&  # This adds a blank line
            echo "" &&  # This adds a blank line
            echo "CPU Usage: " && top -bn1 | grep "Cpu(s)" &&
            echo "" &&  # This adds a blank line
            echo "Memory Usage: " && free -m &&
            echo "" &&  # This adds a blank line
            echo "ZFS Usage: " && zfs list
        `;
        executeSSHCommand(command, message);
    }

    if (content === '!restart' || content === '!shutdown') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
            return message.reply(`You don't have permission to ${content.slice(1)} the server.`);

        const command = `echo "${SUDO_COMMAND_PASSWORD}" | sudo -S ${content === '!restart' ? 'reboot' : 'shutdown now'}`;
        executeSSHCommand(command, message);
    }
});

client.login(DISCORD_TOKEN);
