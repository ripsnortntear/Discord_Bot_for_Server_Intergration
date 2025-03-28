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

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

function executeSSHCommand(command, message) {
    const conn = new SSHClient();
    conn.on('ready', () => {
        console.log(`Executing command: ${command}`);
        conn.exec(command, (err, stream) => {
            if (err) {
                console.error('Error executing command:', err);
                message.reply('Error executing command.');
                logCommandResponse(message.content, 'Error executing command.');
                return;
            }
            let output = '';
            stream.on('close', () => {
                conn.end();
                console.log(`Command output: ${output}`);
                message.channel.send(`\`\`\`\n${output}\n\`\`\``);
                logCommandResponse(message.content, output);
            }).on('data', data => output += data)
              .stderr.on('data', data => {
                  console.error(`Error: ${data}`);
                  message.reply(`Error: ${data}`);
                  logCommandResponse(message.content, `Error: ${data}`);
              });
        });
    }).connect({ host: SERVER_ADDR, port: SSH_PORT, username: SSH_USER, password: SSH_PASSWORD });
}

function logCommandResponse(command, response) {
    console.log(`Command: ${command}\nResponse: ${response}`);
}

client.on('messageCreate', async message => {
    if (message.author.bot || message.author.id !== message.guild.ownerId) return;

    const { content, member, mentions, guild, channel } = message;

    if (content === '!ping') {
        console.log('Ping command received');
        const response = 'Pong!';
        channel.send(response);
        logCommandResponse(content, response);
        return;
    }

    if (content.startsWith('!kick') || content.startsWith('!ban')) {
        const action = content.startsWith('!kick') ? 'kick' : 'ban';
        if (!member.permissions.has(action === 'kick' ? PermissionsBitField.Flags.KickMembers : PermissionsBitField.Flags.BanMembers)) {
            const response = `You don't have permission to ${action} members.`;
            console.log(`User   ${member.user.tag} attempted to ${action} without permission.`);
            message.reply(response);
            logCommandResponse(content, response);
            return;
        }

        const user = mentions.users.first();
        if (!user) {
            const response = `You need to mention a user to ${action}!`;
            console.log(`User   ${member.user.tag} did not mention a user to ${action}.`);
            message.reply(response);
            logCommandResponse(content, response);
            return;
        }

        const targetMember = guild.members.cache.get(user.id);
        if (!targetMember) {
            const response = "That user isn't in this guild!";
            console.log(`User   ${user.tag} is not in the guild.`);
            message.reply(response);
            logCommandResponse(content, response);
            return;
        }

        try {
            await targetMember[action](`Optional reason for ${action}ing`);
            const response = `${user.tag} has been ${action}ed.`;
            console.log(response);
            channel.send(response);
            logCommandResponse(content, response);
        } catch (err) {
            console.error(`Failed to ${action} ${user.tag}:`, err);
            const response = `I was unable to ${action} the member`;
            message.reply(response);
            logCommandResponse(content, response);
        }
    }

    if (content.startsWith('!deleteChannel')) {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            const response = "You don't have permission to delete channels.";
            console.log(`User   ${member.user.tag} attempted to delete a channel without permission.`);
            message.reply(response);
            logCommandResponse(content, response);
            return;
        }

        const channelToDelete = mentions.channels.first();
        if (!channelToDelete) {
            const response = "You need to mention a channel to delete!";
            console.log(`User   ${member.user.tag} did not mention a channel to delete.`);
            message.reply(response);
            logCommandResponse(content, response);
            return;
        }

        try {
            await channelToDelete.delete('Optional reason for deletion');
            const response = `${channelToDelete.name} has been deleted.`;
            console.log(response);
            channel.send(response);
            logCommandResponse(content, response);
        } catch (err) {
            console.error(`Failed to delete channel ${channelToDelete.name}:`, err);
            const response = 'I was unable to delete the channel';
            message.reply(response);
            logCommandResponse(content, response);
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
        console.log('Metrics command received');
        executeSSHCommand(command, message);
        return;
    }

    if (content === '!restart' || content === '!shutdown') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const response = `You don't have permission to ${content.slice(1)} the server.`;
            console.log(`User ${member.user.tag} attempted to ${content.slice(1)} the server without permission.`);
            message.reply(response);
            logCommandResponse(content, response);
            return;
        }

        // Wrapping the command in a shell command to handle echo and sudo properly
        const command = `echo "${SUDO_COMMAND_PASSWORD}" | sudo -S ${content === '!restart' ? 'reboot' : 'shutdown now'}`;
        console.log(`Executing server ${content.slice(1)} command`);
        executeSSHCommand(command, message);
        return;
    }
});

client.login(DISCORD_TOKEN).catch(err => {
    console.error('Failed to login:', err);
});
