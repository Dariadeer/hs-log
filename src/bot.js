const { Client, GatewayIntentBits, DiscordAPIError, EmbedBuilder, EmbedType, AttachmentBuilder, PollLayoutType, MessageFlags} = require('discord.js');
const db = require('./db.js');
const utils = require('./utils.js');
const images = require('./images.js');
const fs = require('fs');
const { GUILD, LB_CHANNEL, FEEDERS, EMOJI_IDS } = process.env;

const feederIds = FEEDERS.split(',').map(id => id.trim());
const emojiIds = EMOJI_IDS.split(',').map(id => id.trim());

const artPoll = {
      question: { text: 'What type of art are you researching this week?' },
      answers: [
        { text: 'Transport', emoji: `<:ArtTransport:${emojiIds[0]}>` },
        { text: 'Miner', emoji: `<:ArtMiner:${emojiIds[1]}>` },
        { text: 'Weapon', emoji: `<:ArtWeapon:${emojiIds[2]}>` },
        { text: 'Shield', emoji: `<:ArtShield:${emojiIds[3]}>` },
        { text: 'Combat', emoji: `<:ArtCombat:${emojiIds[4]}>` },
        { text: 'Drone', emoji: `<:ArtDrone:${emojiIds[5]}>` },
        { text: 'Anything to fill research', emoji: `<:ResearchStation:${emojiIds[6]}>` },
      ],
      allowMultiselect: true,
      duration: 24*7,
      layoutType: PollLayoutType.Default,
    };

const stats = require('./reports').stats;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessagePolls] });

client.on('messageCreate', async message => {
    processWebhookMessage(message);
});

client.createPoll = async (channelId) => {
    const guild = await client.guilds.fetch(GUILD);
    const channel = await guild.channels.fetch(channelId);
    channel.send({ poll: artPoll });
}

client.getMessageInfo = async (channelId, messageId) => {
    return (await client.channels.fetch(channelId)).messages.fetch(messageId);
}

client.updateScoreboard = async () => {
    const files = await generateReport(utils.getLastEventNumber(Date.now()));
    if(!files) return;
    await sendReport(files);
}

async function processWebhookMessage(message) {
    if(message.author.id !== process.env.HOOK) return;
    try {
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
                await sendReport(files);
            });
        }
    } catch (err) {
        // If wrong lb channel, most likely
        console.error(err);
    }
}

client.on('interactionCreate', async interaction => {
    try {
        switch (interaction.commandName) {
            case 'lb':
            case 'leaderboard':
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const season = interaction.options.get('season') ? interaction.options.get('season').value : utils.getLastEventNumber(Date.now());
                const stat = interaction.options.get('stat') ? interaction.options.get('stat').value : 0;
                const files = await generateReport(season, stat);
                if(!files) return await interaction.editReply({
                    content: 'The data for this season was not recorded',
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
                    files: attachments
                  });
                break;
            case 'feed':
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
                        });
                    });
                } catch (err) {
                    await interaction.editReply({
                        content: 'Error: ' + err.message,
                    });
                }
                break;
            case 'test':
                await interaction.editReply('Test command executed');
                break;
            case 'help':
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                await interaction.editReply({
                    files: [
                        {
                            name: 'help.png',
                            attachment: fs.readFileSync('./resources/images/help.png')
                        }
                    ]
                });
                break;
            case 'artpoll':
                await interaction.deferReply();
                await interaction.editReply({
                    poll: artPoll
                });
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

async function sendReport(files) {
    const guild = await client.guilds.fetch(GUILD);
    const channel = await guild.channels.fetch(LB_CHANNEL);
    const messages = await channel.messages.fetch({ limit: 20 });
    for(let [id, m] of messages.entries()) {
        if (m.author.id === process.env.CLIENT) {
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
    
    await channel.send({
        content: '',
        embeds,
        files: attachments
    });
}

module.exports = client;