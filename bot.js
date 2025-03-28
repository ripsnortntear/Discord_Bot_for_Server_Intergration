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
                return message.reply('Error executing command.');
            }
            let output = '';
            stream.on('close', () => {
                conn.end();
                console.log(`Command output: ${output}`);
                message.channel.send(`\`\`\`\n${output}\n\`\`\``);
            }).on('data', data => output += data)
              .stderr.on('data', data => {
                  console.error(`Error: ${data}`);
                  message.reply(`Error: ${data}`);
              });
        });
    }).connect({ host: SERVER_ADDR, port: SSH_PORT, username: SSH_USER, password: SSH_PASSWORD });
}

client.on('messageCreate', async message => {
    if (message.author.bot || message.author.id !== message.guild.ownerId) return;

    const { content, member, mentions, guild, channel } = message;

    if (content === '!ping') {
        console.log('Ping command received');
        return channel.send('Pong!');
    }

    if (content.startsWith('!kick') || content.startsWith('!ban')) {
        const action = content.startsWith('!kick') ? 'kick' : 'ban';
        if (!member.permissions.has(action === 'kick' ? PermissionsBitField.Flags.KickMembers : PermissionsBitField.Flags.BanMembers)) {
            console.log(`User  ${member.user.tag} attempted to ${action} without permission.`);
            return message.reply(`You don't have permission to ${action} members.`);
        }

        const user = mentions.users.first();
        if (!user) {
            console.log(`User  ${member.user.tag} did not mention a user to ${action}.`);
            return message.reply(`You need to mention a user to ${action}!`);
        }

        const targetMember = guild.members.cache.get(user.id);
        if (!targetMember) {
            console.log(`User  ${user.tag} is not in the guild.`);
            return message.reply("That user isn't in this guild!");
        }

        try {
            await targetMember[action](`Optional reason for ${action}ing`);
            console.log(`${user.tag} has been ${action}ed by ${member.user.tag}.`);
            channel.send(`${user.tag} has been ${action}ed.`);
        } catch (err) {
            console.error(`Failed to ${action} ${user.tag}:`, err);
            message.reply(`I was unable to ${action} the member`);
        }
    }

    if (content.startsWith('!deleteChannel')) {
        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            console.log(`User  ${member.user.tag} attempted to delete a channel without permission.`);
            return message.reply("You don't have permission to delete channels.");
        }

        const channelToDelete = mentions.channels.first();
        if (!channelToDelete) {
            console.log(`User  ${member.user.tag} did not mention a channel to delete.`);
            return message.reply("You need to mention a channel to delete!");
        }

        try {
            await channelToDelete.delete('Optional reason for deletion');
            console.log(`${channelToDelete.name} has been deleted by ${member.user.tag}.`);
            channel.send(`${channelToDelete.name} has been deleted.`);
        } catch (err) {
            console.error(`Failed to delete channel ${channelToDelete.name}:`, err);
            message.reply('I was unable to delete the channel');
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
    }

    if (content === '!restart' || content === '!shutdown') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            console.log(`User  ${member.user.tag} attempted to ${content.slice(1)} the server without permission.`);
            return message.reply(`You don't have permission to ${content.slice(1)} the server.`);
        }

        const command = `echo ${SUDO_COMMAND_PASSWORD} | sudo -S ${content === '!restart' ? 'reboot' : 'shutdown now'}`;
        console.log(`Executing server ${content.slice(1)} command`);
        executeSSHCommand(command, message);
    }
});

client.login(DISCORD_TOKEN).catch(err => {
    console.error('Failed to login:', err);
});
