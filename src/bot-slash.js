const { REST, Routes } = require('discord.js');
const { BOT_ID, GUILD_ID, BOT_TOKEN } = process.env;
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
    },
    {
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
    },
    {
        aliases: ['artpoll'],
        description: 'Group of /artpoll commands',
        prefix: true,
        options: [
            {
                type: 1,
                name: 'create',
                description: 'Creates an artifact poll'
            },
            {
                type: 1,
                name: 'monitor',
                description: 'Starts monitoring an artifact poll to refresh it once it is over',
                options: [
                    {
                        name: 'channel_id',
                        description: 'Id of the poll channel',
                        required: true,
                        type: 3
                    },
                    {
                        name: 'poll_id',
                        description: 'Id of the poll message',
                        required: true,
                        type: 3
                    }
                    
                ]
            },
            {
                type: 1,
                name: 'forget',
                description: 'Stops monitoring the artifact poll'
            },
            {
                type: 1,
                name: 'status',
                description: 'Reveals the poll that\'s being monitored'
            }
        ]
    }
]

const commands = [];

for(let cmd of commandsRaw) {
    for(let alias of cmd.aliases) {
        commands.push(createAlias(alias, cmd));
    }
}

const rest = new REST().setToken(BOT_TOKEN);
console.log(`Token set: ${BOT_TOKEN}`)

function createAlias(name, command) {
    return Object.assign({ name }, command);
}

module.exports = {
    setup: async () => {
        try {
            console.log('Started refreshing application (/) commands.');

            await rest.put(
                Routes.applicationGuildCommands(BOT_ID, GUILD_ID),
                { body: commands }
            );

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    },
    commandsRaw
};