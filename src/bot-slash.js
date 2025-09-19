const { REST, Routes } = require('discord.js');
const { destroy } = require('./bot');
const { CLIENT, GUILD, TOKEN } = process.env;

const commandsRaw = [
    {
        aliases: ['help'],
        description: 'Shows a help message',
    },
    {
        aliases: ['leaderboard', 'lb'],
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
    }, {
        aliases: ['feed'],
        description: 'Manually inserts data from the given JSON string into the DB (authorized users only)',
        options: [
            {
                name: 'data',
                description: 'JSON string with the event data',
                required: true,
                type: 3
            }
        ]
    }, {
        aliases: ['artpoll'],
        description: 'Starts an artifact poll'
    }
]

const commands = [];

for(let cmd of commandsRaw) {
    for(let alias of cmd.aliases) {
        commands.push(createAlias(alias, cmd));
    }
}

const rest = new REST().setToken(TOKEN);

function createAlias(name, command) {
    return Object.assign({ name }, command);
}

module.exports = {
    setup: async () => {
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
    },
    commandsRaw
};