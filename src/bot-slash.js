const { REST, Routes } = require('discord.js');
const { CLIENT, GUILD, TOKEN } = process.env;

console.log({ CLIENT, GUILD, TOKEN });

const leaderboardCommand = {
    description: 'Composes a report for a private red star event',
    options: [
        {
            name: 'season',
            description: 'Season of the event you want the report for',
            type: 4
        },
        {
            name: 'stat',
            description: 'Choose a stat to create a report with',
            type: 4,
            choices: [
                {
                    name: 'score',
                    value: 0
                },
                {
                    name: 'time',
                    value: 1
                },
                {
                    name: 'runs',
                    value: 2
                },
                {
                    name: 'score/time',
                    value: 3
                },
                {
                    name: 'score/run',
                    value: 4
                },
                {
                    name: 'time/run',
                    value: 5
                }
            ]
        }
    ]
};

const feedCommand = {
    description: 'Manually inserts data from the given JSON string into the DB (authorized users only)',
    options: [
        {
            name: 'data',
            description: 'JSON string with the event data',
            required: true,
            type: 3
        }
    ]
}

const commands = [
    createAlias('lb', leaderboardCommand),
    createAlias('leaderboard', leaderboardCommand),
    createAlias('feed', feedCommand),
];

const rest = new REST().setToken(TOKEN);

function createAlias(name, command) {
    return Object.assign({ name }, command);
}

module.exports = async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(CLIENT, GUILD),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
};