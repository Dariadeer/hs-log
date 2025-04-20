const { Client, GatewayIntentBits, DiscordAPIError, EmbedBuilder, EmbedType, AttachmentBuilder} = require('discord.js');
const db = require('./db.js');
const utils = require('./utils.js');
const images = require('./images.js');
const e = require('cors');
const { GUILD, LB_CHANNEL, CMD_CHANNEL, FEEDERS } = process.env;

const feederIds = FEEDERS.split(',').map(id => id.trim());

const stats = require('./reports').stats;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('messageCreate', async message => {
    processWebhookMessage(message);
});

async function processWebhookMessage(message) {
    if(message.author.id !== process.env.HOOK) return;
    for(let file of message.attachments.entries()) {
        if(!client.log) throw new Error('The data logging function isn\'t set');
        const data = await (await fetch(file[1].attachment)).json();
        await client.log(data, async res => {
            if(res && res.status === 0) {
                message.react('❗');
                console.log(res.error);
                return;
            }
            message.react('✅');
            if(!utils.isRSEvent(Date.now()) || !res || res.status !== 2) return;
            const files = await generateReport(utils.getLastEventNumber(Date.now()));
            if(!files) return;
            const guild = await client.guilds.fetch(GUILD);
            const channel = await guild.channels.fetch(LB_CHANNEL);
            const messages = await channel.messages.fetch({ limit: 20 });
            for(let [id, m] of messages.entries()) {
                if (m.author.id === process.env.CLIENT) {
                    console.log('Found last message!');
                    await m.delete();
                }
            }
            const attachments = files.map(file => {
                return new AttachmentBuilder(file.attachment, {
                  name: file.name,
                });
              });
              
              const embeds = files.map(file => ({
                color: 0x420000,
                image: {
                  url: 'attachment://' + file.name
                }
              }));
              
              await interaction.editReply({
                content: '',
                embeds,
                files: attachments,
                ephemeral: true
              });
        });
    }
}

client.on('interactionCreate', async interaction => {
    try {
        await interaction.deferReply({ephemeral: true});
        switch (interaction.commandName) {
            case 'lb':
            case 'leaderboard':
                const season = interaction.options.get('season') ? interaction.options.get('season').value : utils.getLastEventNumber(Date.now());
                const stat = interaction.options.get('stat') ? interaction.options.get('stat').value : 0;
                const files = await generateReport(season, stat);
                if(!files) return await interaction.editReply({
                    content: 'The data for this season was not recorded',
                    ephemeral: true
                });
                
                const attachments = files.map(file => {
                    return new AttachmentBuilder(file.attachment, {
                      name: file.name,
                    });
                  });
                  
                  const embeds = files.map(file => ({
                    color: 0x420000,
                    image: {
                      url: 'attachment://' + file.name
                    }
                  }));
                  
                  await interaction.editReply({
                    content: '',
                    embeds,
                    files: attachments,
                    ephemeral: true
                  });
                break;
            case 'feed':
                if(!feederIds.includes(interaction.user.id)) {
                    await interaction.editReply({
                        content: 'You do not have permission to use this command',
                        ephemeral: true
                    });
                    return;
                }
                try {
                    const data = interaction.options.get('data').value;
                    const json = JSON.parse(data);
                    await client.log(json, async res => {
                        if(res && res.status === 0) {
                            await interaction.editReply('Error: ' + res.error);
                            return;
                        }
                        await interaction.editReply({
                            content: 'Data fed successfully',
                            ephemeral: true
                        });
                    });
                } catch (err) {
                    await interaction.editReply({
                        content: 'Error: ' + err.message,
                        ephemeral: true
                    });
                }
                break;
            case 'test':
                await interaction.editReply('Test command executed');
                break;
            case 'help':
                await interaction.editReply('Help command executed');
                break;
            default:
                await interaction.editReply('Unknown command');
                break;
        }
    } catch (err) {
        console.error(err);
    }
});

async function generateReport(season, stat) {
    stat = stat || 0;
    const players = await db.report(season, stat);
    if(players.length === 0) return null;
    const files = [];
    for(let i = 0; i < players.length; i+= 10) {
        files.push({
            name: 'report' + i + '.png',
            attachment: await images.generateScoreboardImage(players, season, i, 10, players[0][stats[stat].name], stat)
        })
    }
    return files;
}

// async function processInteraction(interaction) {
//     switch (interaction.commandName) {
//         case 'lb':
//         case 'leaderboard':
//             await interaction.deferReply({ephemeral: true});
//             const season = interaction.options.get('season') ? interaction.options.get('season').value : utils.getLastEventNumber(Date.now());
//             const stat = interaction.options.get('stat') ? interaction.options.get('stat').value : 0;
//             const files = await generateReport(season, stat);
//             if(!files) return await interaction.editReply({
//                 content: 'The data for this season was not recorded',
//                 ephemeral: true
//             });
            
//             for (const file of files) {
//                 const embed = new EmbedBuilder()
//                 .setColor(0x0099FF)
//                 .setTitle('Leaderboard')
//                 .setDescription('Season ' + season)
//                 .setImage('attachment://' + file.name)
//                 .setTimestamp()
//                 .setFooter({ text: 'StarSystem' });
            
//                 const attachment = new AttachmentBuilder(file.attachment, { name: file.name });
            
//                 await interaction.followUp({
//                 embeds: [embed],
//                 files: [attachment],
//                 ephemeral: true
//                 });
//                 break;
//             }
//             break;
//         case 'feed':
//             await interaction.deferReply({ephemeral:true});
//             try {
//                 const data = interaction.options.get('data').value;
//                 const json = JSON.parse(data);
//                 await client.log(json, async res => {
//                     if(res && res.status === 0) {
//                         await interaction.editReply('Error: ' + res.error);
//                         return;
//                     }
//                     await interaction.editReply({
//                         content: 'Data fed successfully',
//                         ephemeral: true
//                     });
//                 });
//             } catch (err) {
//                 await interaction.editReply({
//                     content: 'Error: ' + err.message,
//                     ephemeral: true
//                 });
//             }
//             break;
//         case 'test':
//             await interaction.reply('Test command executed');
//             break;
//         case 'help':
//             await interaction.reply('Help command executed');
//             break;
//     }
// }

module.exports = client;