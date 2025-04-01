/* jshint esversion: 8 */

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField
} = require("discord.js");
const {
    Client: SSHClient
} = require("ssh2");
require("dotenv").config();

const {
    TOKEN,
    SERVER_ADDR,
    SSH_PASSWORD,
    SSH_PORT,
    SSH_USER,
    SUDO_COMMAND_PASSWORD
} = process.env;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", () => console.log(`Logged in as ${client.user.tag}!`));

async function executeSSHCommand(command, message) {
    const conn = new SSHClient();
    try {
        await new Promise(function (resolve, reject) {
            conn.on("ready", resolve).on("error", reject).connect({
                host: SERVER_ADDR,
                password: SSH_PASSWORD,
                port: SSH_PORT,
                username: SSH_USER
            });
        });

        const stream = await new Promise(function (resolve, reject) {
            conn.exec(command, function (err, stream) {
                if (err) {
                    reject(err);
                } else {
                    resolve(stream);
                }
            });
        });

        let output = "";
        stream.on("data", function (data) {
            output += data;
        });

        stream.stderr.on("data", function (data) {
            message.reply("Error: " + data);
        });

        await new Promise((resolve) => stream.on("close", resolve));
        await message.channel.send(`\`\`\`\n${output}\n\`\`\``);
    } catch (error) {
        console.error("SSH execution error:", error);
        await message.reply("Error executing command.");
    } finally {
        conn.end();
    }
}

async function handleServerAction(message, action) {
    const hasPermission = message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
    );
    if (!hasPermission) {
        return await message.reply(
            "You don't have permission to perform this action."
        );
    }

    let command;
    if (action === "restart") {
        command = `echo "${SUDO_COMMAND_PASSWORD}" | sudo -S reboot`;
    } else if (action === "shutdown") {
        command = `echo "${SUDO_COMMAND_PASSWORD}" | sudo -S shutdown now`;
    } else {
        return await message.reply("Invalid action.");
    }

    await executeSSHCommand(command, message);
}

async function handleMemberAction(message, action) {
    if (!message.member.permissions.has(
        action === "kick"
        ? PermissionsBitField.Flags.KickMembers
        : PermissionsBitField.Flags.BanMembers
    )) {
        await message.reply(`You don't have permission to ${action} members.`);
        return;
    }

    const user = message.mentions.users.first();
    if (!user) {
        return message.reply(`You need to mention a user to ${action}!`);
    }

    const targetMember = message.guild.members.cache.get(user.id);
    if (!targetMember) {
        return message.reply("That user isn't in this guild!");
    }

    try {
        await targetMember[action](
            `${action.charAt(0).toUpperCase() + action.slice(1)} ` +
            `requested by ${message.author.tag}`
        );

        await message.channel.send(`${user.tag} has been ${action}ed.`);
    } catch (err) {
        console.error(err);
        await message.reply(`I was unable to ${action} the member`);
    }
}

const commands = {
    ban: async function (message, args) {
        return await handleMemberAction(message, "ban", args);
    },

    deleteChannel: async function (message) {
        const hasPermission = message.member.permissions.has(
            PermissionsBitField.Flags.ManageChannels
        );

        if (!hasPermission) {
            return message.reply(
                `You don't have permission to delete channels.`
            );
        }

        const channelToDelete = message.mentions.channels.first();
        if (!channelToDelete) {
            return message.reply("You need to mention a channel to delete!");
        }

        try {
            await channelToDelete.delete("Channel deletion requested");
            await message.channel.send(
                `${channelToDelete.name} has been deleted.`
            );
        } catch (err) {
            console.error(err);
            await message.reply("I was unable to delete the channel");
        }
    },

    help: async function (message) {
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
        await message.channel.send(helpMessage);
    },

    kick: async function (message, args) {
        return await handleMemberAction(message, "kick", args);
    },

    metrics: async function (message) {
        const command = `
            echo "External IP Address: " && curl -s ifconfig.me &&
            echo -e "\n\nCPU Usage: " && top -bn1 | grep "Cpu(s)" &&
            echo -e "\nMemory Usage: " && free -m &&
            echo -e "\nZFS Usage: " && zfs list
        `;
        await executeSSHCommand(command, message);
    },

    ping: async function (message) {
        await message.channel.send("Pong!");
    },

    restart: async function (message) {
        return await handleServerAction(message, "restart");
    },

    shutdown: async function (message) {
        return await handleServerAction(message, "shutdown");
    }
};

client.on("messageCreate", async function (message) {
    if (message.author.bot) {
        return; // Exit the function if the author is a bot
    }

    const args = message.content.split(" ");
    const command = args.shift().toLowerCase();

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

client.login(TOKEN);
