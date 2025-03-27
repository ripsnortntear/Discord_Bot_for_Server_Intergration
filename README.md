# Discord SSH Bot

This is a Discord bot that allows users to execute SSH commands on a remote server directly from a Discord channel. The bot can perform various administrative tasks such as kicking and banning users, deleting channels, and managing server metrics. This is used mainly for a specific use case where the server bot is online but the server itself is not responding to ssh login. At that point we should be able to issue a `!restart` command!

## Features

- Responds to basic commands like `!ping`.
- Kick and ban users with appropriate permissions.
- Delete channels with manage channels permission.
- Retrieve server metrics via SSH.
- Restart and shut down the server with administrator permissions.

## Prerequisites

- Node.js (version 14 or higher)
- A Discord bot token
- SSH access to a remote server
- Environment variables for configuration

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/ripsnortntear/discord-ssh-bot.git
   cd discord-ssh-bot

2. **Install dependencies**

   ```bash
   npm init -y
   npm install discord.js ssh2 dotenv
   
3. **Create a .env file in the root directory**
   Replace the placeholders with your actual credentials.
   
   ```bash
   DISCORD_TOKEN=your_discord_bot_token
   SERVER_ADDR=your_server_address
   SSH_PORT=your_ssh_port
   SSH_USER=your_ssh_username
   SSH_PASSWORD=your_ssh_password
   SUDO_COMMAND_PASSWORD=your_sudo_password

4. **Run the bot**

   ```bash
   node bot.js

## Service File Example

  - [serverdiscordbot.service](serverdiscordbot.service.example)

## Commands

 - !ping: Responds with "Pong!" to check if the bot is responsive.
 - !kick @user: Kicks the mentioned user from the server (requires KICK_MEMBERS permission).
 - !ban @user: Bans the mentioned user from the server (requires BAN_MEMBERS permission).
 - !deleteChannel @channel: Deletes the mentioned channel (requires MANAGE_CHANNELS permission).
 - !metrics: Retrieves and displays server metrics (CPU, memory, etc.) via SSH.
 - !restart: Restarts the server (requires ADMINISTRATOR permission).
 - !shutdown: Shuts down the server (requires ADMINISTRATOR permission).

## Contributing

   Contributions are welcome! Please feel free to submit a pull request or open an issue for any bugs or feature requests.

## License

  This project is licensed under the MIT License. See the [MIT License](MIT.license) file for details.

## Acknowledgments

  - [Discord.js](https://github.com/username/repository/blob/main/MIT.license](https://github.com/discordjs/discord.js)) for the Discord API wrapper.
  - [ssh2](https://github.com/username/repository/blob/main/MIT.license](https://github.com/mscdex/ssh2)) for SSH connectivity.

## Support

   If you encounter any issues or have questions, please open an [Issue](https://github.com/ripsnortntear/serverbot/issues).
