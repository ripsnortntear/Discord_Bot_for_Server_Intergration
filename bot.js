/* jshint esversion: 8 */

// Import necessary modules from discord.js and ssh2
const {
    Client,
    GatewayIntentBits,
    PermissionsBitField
} = require("discord.js");
const {
    Client: SSHClient
} = require("ssh2");
require("dotenv").config(); // Load environment variables from .env file

// Destructure environment variables for easy access
// These variables are used for Discord bot authentication and SSH connection
const {
    DISCORD_TOKEN, // Token for Discord bot authentication
    SERVER_ADDR, // Address of the server to connect via SSH
    SSH_PASSWORD, // Password for SSH authentication
    SSH_PORT, // Port for SSH connection
    SSH_USER, // Username for SSH authentication
    SUDO_COMMAND_PASSWORD // Password for executing sudo commands
} = process.env;

// Create a new Discord client with specified intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // Intent to manage guilds
        GatewayIntentBits.GuildMessages, // Intent to manage guild messages
        GatewayIntentBits.MessageContent // Intent to read message content
    ]
});

// Log a message when the bot is ready
client.once("ready", () => console.log(`Logged in as ${client.user.tag}!`));

// Function to execute a command on the remote server via SSH
async function executeSSHCommand(command, message) {
    const conn = new SSHClient(); // Create a new SSH client
    try {
        // Connect to the server using SSH
        await new Promise(function (resolve, reject) {
            conn.on("ready", resolve).on("error", reject).connect({
                host: SERVER_ADDR,
                password: SSH_PASSWORD,
                port: SSH_PORT,
                username: SSH_USER
            });
        });

        // Execute the command on the server
        const stream = await new Promise(function (resolve, reject) {
            conn.exec(command, function (err, stream) {
                if (err) {
                    reject(err); // Reject if there's an error
                } else {
                    resolve(stream); // Resolve with the stream if successful
                }
            });
        });

        let output = ""; // Variable to store command output
        // Collect data from the command output stream
        stream.on("data", function (data) {
            output += data; // Append data to output
        });

        // Handle any errors from the command execution
        stream.stderr.on("data", function (data) {
            message.reply("Error: " + data); // Reply with error message
        });

        // Wait for the stream to close before proceeding
        await new Promise((resolve) => stream.on("close", resolve));
        // Send the command output back to the Discord channel
        await message.channel.send(`\`\`\`\n${output}\n\`\`\``);
    } catch (error) {
        console.error("SSH execution error:", error); // Log any errors
        await message.reply("Error executing command."); // Notify user of error
    } finally {
        conn.end(); // Ensure the connection is closed
    }
}

// Function to handle server actions (restart/shutdown)
async function handleServerAction(message, action) {
    // Check if the user has administrator permissions
    const hasPermission = message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
    );
    if (!hasPermission) {
        return await message.reply(
            "You don't have permission to perform this action."
        );
    }

    let command; // Variable to hold the command to execute
    // Determine the command based on the action
    if (action === "restart") {
        // Command to restart the server
        command = `echo "${SUDO_COMMAND_PASSWORD}" | sudo -S reboot`;
    } else if (action === "shutdown") {
         // Command to shut down the server
        command = `echo "${SUDO_COMMAND_PASSWORD}" | sudo -S shutdown now`;
    } else {
        return await message.reply("Invalid action."); // Handle invalid action
    }

    await executeSSHCommand(command, message); // Execute the command
}

// Function to handle member actions (kick/ban)
async function handleMemberAction(message, action) {
    // Check if the user has permission to kick or ban members
    if (!message.member.permissions.has(
        action === "kick"
        ? PermissionsBitField.Flags.KickMembers
        : PermissionsBitField.Flags.BanMembers
    )) {
        await message.reply(`You don't have permission to ${action} members.`);
        return;
    }

    // Get the mentioned user from the message
    const user = message.mentions.users.first();
    if (!user) {
         // Handle no user mentioned
        return message.reply(`You need to mention a user to ${action}!`);
    }

    // Get the target member
    const targetMember = message.guild.members.cache.get(user.id);
    if (!targetMember) {
         // Handle user not found
        return message.reply("That user isn't in this guild!");
    }

    try {
        // Perform the kick or ban action
        await targetMember[action](
            `${action.charAt(0).toUpperCase() + action.slice(1)} ` +
            `requested by ${message.author.tag}`
        );

         // Notify success
        await message.channel.send(`${user.tag} has been ${action}ed.`);
    } catch (err) {
        console.error(err); // Log any errors
         // Notify user of failure
        await message.reply(`I was unable to ${action} the member`);
    }
}

// Define available commands and their corresponding functions
const commands = {
    ban: async function (message, args) {
         // Handle ban command
        return await handleMemberAction(message, "ban", args);
    },

    deleteChannel: async function (message) {
        // Check if the user has permission to manage channels
        const hasPermission = message.member.permissions.has(
            PermissionsBitField.Flags.ManageChannels
        );

        if (!hasPermission) {
            return message.reply(
                 // Notify lack of permission
                `You don't have permission to delete channels.`
            );
        }

        // Get the mentioned channel to delete
        const channelToDelete = message.mentions.channels.first();
        if (!channelToDelete) {
             // Handle no channel mentioned
            return message.reply("You need to mention a channel to delete!");
        }

        try {
             // Delete the channel
            await channelToDelete.delete("Channel deletion requested");
            await message.channel.send(
                `${channelToDelete.name} has been deleted.` // Notify success
            );
        } catch (err) {
            console.error(err); // Log any errors
             // Notify user of failure
            await message.reply("I was unable to delete the channel");
        }
    },

    help: async function (message) {
        // Define the help message with available commands
        const helpMessage = `
        **Available Commands:**
        **!ping**: Responds with "Pong!"
        **!kick @user**: Kicks the mentioned user from the server.
        **!ban @user**: Bans the mentioned user from the server.
        **!metrics**: Displays server metrics (CPU, memory, etc.).
        **!restart**: Restarts the server (Admin only).
        **!shutdown**: Shuts down the server (Admin only).
        **!deleteChannel <#channelID>**: Deletes a specified channel.
        `;
        await message.channel.send(helpMessage); // Send help message
    },

    kick: async function (message, args) {
         // Handle kick command
        return await handleMemberAction(message, "kick", args);
    },

    metrics: async function (message) {
        // Command to gather server metrics
        const command = `
            echo "External IP Address: " && curl -s ifconfig.me &&
            echo -e "\n\nCPU Usage: " && top -bn1 | grep "Cpu(s)" &&
            echo -e "\nMemory Usage: " && free -m &&
            echo -e "\nZFS Usage: " && zfs list
        `;
        await executeSSHCommand(command, message); // Execute the command
    },

    ping: async function (message) {
        await message.channel.send("Pong!"); // Respond to ping command
    },

    restart: async function (message) {
         // Handle restart action
        return await handleServerAction(message, "restart");
    },

    shutdown: async function (message) {
         // Handle shutdown action
        return await handleServerAction(message, "shutdown");
    }
};

// Listen for messages in the Discord channel
client.on("messageCreate", async function (message) {
    if (message.author.bot) {
        return; // Exit the function if the author is a bot
    }

     // Split the message into command and arguments
    const args = message.content.split(" ");
     // Get the command and convert to lowercase
    const command = args.shift().toLowerCase();

    // Execute the corresponding command function based on the command
    if (command === "!help") {
        await commands.help(message);
    } else if (command === "!ping") {
        await commands.ping(message);
    } else if (command === "!kick") {
        await commands.kick(message, args);
    } else if (command === "!ban") {
        await commands.ban(message, args);
    } else if (command === "!deleteChannel") {
        await commands.deleteChannel(message);
    } else if (command === "!metrics") {
        await commands.metrics(message);
    } else if (command === "!restart") {
        await commands.restart(message);
    } else if (command === "!shutdown") {
        await commands.shutdown(message);
    }
});

// Log in to Discord with the provided token
client.login(DISCORD_TOKEN);
