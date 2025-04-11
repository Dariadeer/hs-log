const { REST, Routes } = require('discord.js');
const { CLIENT, GUILD, TOKEN } = process.env;

console.log({ CLIENT, GUILD, TOKEN });

const commands = [
    {
        name: 'report',
        description: 'Composes a report for a private red star event.',
        options: [
            {
                name: 'season',
                description: 'Season of the event you want the report for',
                type: 4
            }
        ]
    }
];

const rest = new REST().setToken(TOKEN);

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

// const fs = require('fs');
// const path = require('node:path');
//
// const commands = [];
// // Grab all the command folders from the commands directory you created earlier
// const foldersPath = path.resolve(__dirname, '../resources/commands');
// const commandFolders = fs.readdirSync(foldersPath);
//
// for (const folder of commandFolders) {
//     // Grab all the command files from the commands directory you created earlier
//     const commandsPath = path.join(foldersPath, folder);
//     const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
//     // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
//     for (const file of commandFiles) {
//         const filePath = path.join(commandsPath, file);
//         const command = require(filePath);
//         if ('data' in command && 'execute' in command) {
//             commands.push(command.data.toJSON());
//         } else {
//             console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
//         }
//     }
// }
//
// // Construct and prepare an instance of the REST module
// const rest = new REST().setToken(TOKEN);
//
// // and deploy your commands!
// (async () => {
//     try {
//         console.log(`Started refreshing ${commands.length} application (/) commands.`);
//
//         // The put method is used to fully refresh all commands in the guild with the current set
//         const data = await rest.put(
//             Routes.applicationGuildCommands(CLIENT, GUILD),
//             { body: commands },
//         );
//
//         console.log(`Successfully reloaded ${data.length} application (/) commands.`);
//     } catch (error) {
//         // And of course, make sure you catch and log any errors!
//         console.error(error);
//     }
// })();