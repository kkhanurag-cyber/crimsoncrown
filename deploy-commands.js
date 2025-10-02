/*
=================================================
Crimson Crown - Discord Slash Command Deployer
=================================================
This is a utility script, not part of the live website.
Its only purpose is to be run once from your local machine to tell Discord
about the slash commands your bot has available.

To run this:
1. Make sure your .env file is complete and in your project root.
2. Run `npm install` to get the necessary libraries.
3. Run `node deploy-commands.js` in your terminal.
*/

// This line loads the environment variables from your .env file
// so the script can access your secret bot tokens and IDs.
require('dotenv').config(); 
const { REST, Routes } = require('discord.js');

// These are the definitions for all the slash commands your bot will have.
const commands = [
    {
        name: 'start_round',
        description: 'Starts a new round for a tournament and announces it.',
        options: [
            { 
                name: 'tournament_id', 
                description: 'The ID of the tournament (e.g., SCRIM_12345)', 
                type: 3, // Type 3 corresponds to a String input
                required: true 
            },
            { 
                name: 'round_number', 
                description: 'Which round is this? (e.g., 1, 2, 3)', 
                type: 4, // Type 4 corresponds to an Integer input
                required: true 
            },
        ],
    },
    // You can add more slash command definitions here in the future.
    // For example: { name: 'end_tournament', description: 'Cleans up a tournament's roles and channels.' }
];

// This creates an instance of the REST client to communicate with Discord's API.
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

// This is an immediately-invoked async function that runs the script.
(async () => {
    try {
        console.log('Started refreshing application (/) slash commands.');

        // This is the main API call. It sends the list of commands to Discord.
        // It tells Discord to update the commands for your specific server (guild).
        await rest.put(
            Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) slash commands.');
    } catch (error) {
        // If an error occurs (e.g., invalid tokens), it will be logged to the console.
        console.error(error);
    }
})();