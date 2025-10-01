const { REST, Routes } = require('discord.js');
require('dotenv').config(); // Make sure to have a .env file for local testing

const commands = [
    {
        name: 'start_round',
        description: 'Starts a new round and announces it.',
        options: [
            { name: 'tournament_id', description: 'The ID of the tournament (e.g., SCRIM_123)', type: 3, required: true },
            { name: 'round_number', description: 'Which round is this? (e.g., 1, 2, 3)', type: 4, required: true },
        ],
    },
    // Future commands (e.g., 'end_tournament', 'post_scores') will be added here
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();