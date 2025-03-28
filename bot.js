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
const allowedSSHCommands = new Set(['reboot', 'shutdown now', 'metrics']);

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
    handler: async (message, args, member) => {
        // Extract the user mentioned for kicking
        const username = message.mentions.users.first();
        // Get the reason for kicking, defaulting if not provided
        const reason = args.slice(1).join(' ') || 'No reason provided.';

        // Check if a user was mentioned and proceed
        if (username) {
            // Uncomment for actual kick implementation
            // await message.guild.members.kick(username.id, { reason });
            await message.reply(`User ${username.tag} has been kicked. Reason: ${reason}`);
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
    handler: async (message, args, member) => {
        // Extract the user mentioned for banning
        const username = message.mentions.users.first();
        // Get the reason for banning, defaulting if not provided
        const reason = args.slice(1).join(' ') || 'No reason provided.';

        // Check if a user was mentioned and proceed
        if (username) {
            // Uncomment for actual ban implementation
            // await message.guild.members.ban(username.id, { reason });
            await message.reply(`User ${username.tag} has been banned. Reason: ${reason}`);
        } else {
            await message.reply("You need to mention a user to ban.");
        }
    }
};

// Command handler for deleting the current channel
const deleteChannelCommand = {
    name: 'deletechannel',
    description: 'Delete the current channel.',
    permissions: PermissionsBitField.Flags.ManageChannels,
    handler: async (message, args, member) => {
        const channel = message.channel; // Reference to the channel to delete
        try {
            await channel.delete(); // Attempt to delete the channel
            await message.reply('Channel has been deleted.'); // Confirm deletion
        } catch (err) {
            await message.reply('Unable to delete the channel.'); // Handle error during deletion
        }
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
                await command.handler(message, args, member); // Handle command if permissions are granted
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

// Bot login using the token from the environment variables
client.login(process.env.TOKEN);
