require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { exec } = require('child_process');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Command handler structure
const commands = new Map();

// Whitelist of allowed SSH commands
const allowedSSHCommands = new Set(['metrics', 'restart', 'shutdown']);

// Utility function to check permissions
function checkPermissionsAndRespond(member, requiredPermission, action, message) {
    // Check if the member has the required permission to perform the action
    if (!member.permissions.has(requiredPermission)) {
        const response = `You don't have permission to ${action}.`;
        console.log(`User ${member.user.tag} attempted to ${action} without permission.`);
        message.reply(response);
        return false; // Indicate permission check failure
    }
    return true; // Indicate permission check success
}

// Command handler for pinging the bot
const pingCommand = {
    name: 'ping',
    description: 'Check if the bot is online and responsive.',
    handler: async (message) => {
        await message.reply('Pong!'); // Respond with "Pong!" to indicate the bot is online
    }
};

// Command handler for kicking a user
const kickCommand = {
    name: 'kick',
    description: 'Kick a user from the server.',
    permissions: PermissionsBitField.Flags.KickMembers,
    handler: async (message, args) => {
        const username = message.mentions.users.first(); // Extract the user mentioned for kicking
        const reason = args.slice(1).join(' ') || 'No reason provided.'; // Get reason for kicking

        if (username) {
            try {
                await message.guild.members.kick(username.id, { reason }); // Kick the user
                await message.reply(`User ${username.tag} has been kicked. Reason: ${reason}`);
            } catch (err) {
                await message.reply('Failed to kick the user.'); // Catch and handle errors
            }
        } else {
            await message.reply("You need to mention a user to kick.");
        }
    }
};

// Command handler for banning a user
const banCommand = {
    name: 'ban',
    description: 'Ban a user from the server.',
    permissions: PermissionsBitField.Flags.BanMembers,
    handler: async (message, args) => {
        const username = message.mentions.users.first(); // Extract the user mentioned for banning
        const reason = args.slice(1).join(' ') || 'No reason provided.'; // Get reason for banning

        if (username) {
            try {
                await message.guild.members.ban(username.id, { reason }); // Ban the user
                await message.reply(`User ${username.tag} has been banned. Reason: ${reason}`);
            } catch (err) {
                await message.reply('Failed to ban the user.'); // Catch and handle errors
            }
        } else {
            await message.reply("You need to mention a user to ban.");
        }
    }
};

// Command handler for deleting a channel
const deleteChannelCommand = {
    name: 'deleteChannel',
    description: 'Delete a mentioned channel.',
    permissions: PermissionsBitField.Flags.ManageChannels,
    handler: async (message) => {
        const channel = message.mentions.channels.first(); // Extract the channel mentioned

        if (channel) {
            try {
                await channel.delete(); // Attempt to delete the channel
                await message.reply('Channel has been deleted.'); // Confirm deletion
            } catch (err) {
                await message.reply('Unable to delete the channel.'); // Handle errors
            }
        } else {
            await message.reply("You need to mention a channel to delete.");
        }
    }
};

// Command handler for retrieving server metrics via SSH
const metricsCommand = {
    name: 'metrics',
    description: 'Retrieve and display server metrics (CPU, memory, etc.) via SSH.',
    handler: async (message) => {
        // Notify the user about command execution
        await message.reply('Executing command: `metrics`, please wait...');
        const cmd = `ssh user@server 'top -b -n 1'`; // Example SSH command to get metrics

        exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${stderr}`);
                message.reply('Failed to retrieve metrics.');
                return;
            }
            // Send the results of the command execution
            message.reply(`Server Metrics:\n\`\`\`${stdout}\`\`\``); // Use code block for formatting
        });
    }
};

// Command handler for restarting the server
const restartCommand = {
    name: 'restart',
    description: 'Restart the server (requires ADMINISTRATOR permission).',
    permissions: PermissionsBitField.Flags.Administrator,
    handler: async (message) => {
        await message.reply('Executing restart command, please wait...');
        const cmd = `sudo reboot`; // SSH command to restart the server

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${stderr}`);
                message.reply('Failed to execute restart command.');
                return;
            }
            message.reply('Server is restarting.'); // Notify user about restart command execution
        });
    }
};

// Command handler for shutting down the server
const shutdownCommand = {
    name: 'shutdown',
    description: 'Shut down the server (requires ADMINISTRATOR permission).',
    permissions: PermissionsBitField.Flags.Administrator,
    handler: async (message) => {
        await message.reply('Executing shutdown command, please wait...');
        const cmd = `sudo shutdown now`; // SSH command to shut down the server

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${stderr}`);
                message.reply('Failed to execute shutdown command.');
                return;
            }
            message.reply('Server is shutting down.'); // Notify user about shutdown command execution
        });
    }
};

// General command handler for server management commands
const serverCommandHandler = async (commandName, message) => {
    // Check if the command is allowed; if not, notify the user
    if (!allowedSSHCommands.has(commandName)) {
        await message.reply("This command is not allowed.");
        return false;
    }

    // Send immediate feedback to the user about command execution
    await message.reply(`Executing command: \`${commandName}\`, please wait...`);

    const cmd = `echo "${process.env.SUDO_COMMAND_PASSWORD}" | sudo -S ${commandName}`; // Construct SSH command
    await executeSSHCommand(cmd, message); // Execute the command
};

// Event listener for messages
client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Ignore bot messages to prevent recursion
    const member = message.member; // Get the member object for the message
    const [commandName, ...args] = message.content.toLowerCase().trim().split(/\s+/); // Parse command and arguments
    
    // Check if the command starts with '!'
    if (commandName.startsWith('!')) {
        const command = commands.get(commandName.slice(1)); // Remove '!' and get command details
        if (command) {
            const hasPermission = checkPermissionsAndRespond(member, command.permissions, `execute the command ${command.name}`, message);
            if (hasPermission) {
                await command.handler(message, args); // Handle command if permissions are granted
            }
        } else if (allowedSSHCommands.has(commandName.slice(1))) {
            // Handle case for allowed SSH commands
            const hasPermission = checkPermissionsAndRespond(member, PermissionsBitField.Flags.Administrator, `execute the command ${commandName}`, message);
            if (hasPermission) {
                await serverCommandHandler(commandName.slice(1), message); // Execute the allowed command
            }
        } else {
            await message.reply('Unknown command.'); // Inform user if command is not recognized
        }
    }
});

// Function to execute SSH command
async function executeSSHCommand(command, message) {
    console.log(`Executing command: ${command}`);  // Log command execution attempt
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing command: ${stderr}`); // Log error if command execution fails
            message.reply('Failed to execute command.'); // Inform user of failure
            return;
        }
        // Send the results of the command execution
        message.reply(`Command executed successfully: \`\`\`${stdout}\`\`\``); // Use code block for formatting
    });
}

// Register commands in the commands map for easy access
commands.set(pingCommand.name, pingCommand); // Registering the ping command
commands.set(kickCommand.name, kickCommand);
commands.set(banCommand.name, banCommand);
commands.set(deleteChannelCommand.name, deleteChannelCommand);
commands.set(metricsCommand.name, metricsCommand); // Registering the server metrics command
commands.set(restartCommand.name, restartCommand); // Registering the restart command
commands.set(shutdownCommand.name, shutdownCommand); // Registering the shutdown command

// Bot login using the token from the environment variables
client.login(process.env.TOKEN);
