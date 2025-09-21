const { Client, GatewayIntentBits, DiscordAPIError, EmbedBuilder, EmbedType, AttachmentBuilder, PollLayoutType, MessageFlags} = require('discord.js');
const db = require('./db.js');
const utils = require('./utils.js');
const images = require('./images.js');
const fs = require('fs');
const { CLIENT, GUILD, LB_CHANNEL, MODERATORS, MODERATOR_ROLES, EMOJI_IDS, ART_ROLE_ID, ART_POLL_DURATION } = process.env;
const ART_POLL_CHECK_INTERVAL = 300000;
const ART_POLL_DURATION_NUM = parseInt(ART_POLL_DURATION);

const moderatorIds = MODERATORS.split(',').map(id => id.trim());
const emojiIds = EMOJI_IDS.split(',').map(id => id.trim());

const artPollMessage = {
    poll: {
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
        duration: ART_POLL_DURATION_NUM,
        layoutType: PollLayoutType.Default,
    },
    content: '<@&' + ART_ROLE_ID + '>'
};

const stats = require('./reports').stats;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessagePolls] });

client.on('messageCreate', async message => {
    processWebhookMessage(message);
});

client.createPoll = async (channelId) => {
    const guild = await client.guilds.fetch(GUILD);
    const channel = await guild.channels.fetch(channelId);
    channel.send(artPollMessage);
}

client.getMessageInfo = async (channelId, messageId) => {
    (await client.guilds.fetch('')).messages
    return (await client.channels.fetch(channelId)).messages.fetch(messageId);
}

client.updateScoreboard = async () => {
    const files = await generateReport(utils.getLastEventNumber(Date.now()));
    if(!files) return;
    await sendReport(files);
}

client.checkArtPoll = async () => {
    const [channelId, pollId] = await db.getArtPollData();

    if(!channelId || !pollId) return;

    const guild = await client.guilds.fetch(GUILD);
    const channel = await guild.channels.fetch(channelId);
    const poll = await channel.messages.fetch(pollId);

    if(poll.poll.resultsFinalized) {
        const sent = await channel.send(artPollMessage);
        db.setArtPollData(channelId, sent.id);
    }
}

setInterval(() => client.checkArtPoll(), ART_POLL_CHECK_INTERVAL);

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
                      name: file.name
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
                if(!validateUser(interaction.user)) {
                    await interaction.editReply({
                        content: 'You do not have permission to use this command'
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
                        content: 'Error: ' + err.message
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
                switch(interaction.options.getSubcommand()) {
                    case 'create':
                        await interaction.deferReply();
                        await interaction.editReply(artPollMessage);
                        break;
                    case 'monitor':
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                        if(!validateUser(interaction.user)) {
                            await interaction.editReply({
                                content: 'You do not have permission to use this command'
                            });
                            return;
                        }
                        try {
                            const channelId = interaction.options.get('channel_id').value;
                            const pollId = interaction.options.get('poll_id').value;
                            console.log(channelId, pollId);
                            const guild = await client.guilds.fetch(GUILD);
                            console.log(GUILD);
                            const channel = await guild.channels.fetch(channelId);
                            console.log(channel);
                            await channel.join();
                            const poll = await channel.messages.fetch(pollId);
                            console.log(poll);
                            console.log(poll.poll, poll.interaction, poll.author);
                            if(poll.poll && poll.author.id === CLIENT) {
                                await db.setArtPollData(channel.id, poll.id);
                                await interaction.editReply('Success! Now monitoring poll ' + pollId);
                            } else {
                                await interaction.editReply('Failed to start monitoring poll ' + pollId);
                            }
                        } catch (err) {
                            console.error(err);
                            await interaction.editReply('Failed to start monitoring the poll');
                        }
                        break;
                    case 'status':
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                        const [channelId, pollId] = await db.getArtPollData();
                        if(channelId && pollId) {
                            await interaction.editReply(`Monitoring https://discord.com/channels/${GUILD}/${channelId}/${pollId}`);
                        } else {
                            await interaction.editReply(`No artifact poll is being monitored`);
                        }
                        break;
                    case 'forget':
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                        if(!validateUser(interaction.user)) {
                            await interaction.editReply({
                                content: 'You do not have permission to use this command'
                            });
                            return;
                        }
                        try {
                            await db.resetArtPollData();
                            await interaction.editReply('From now on, no artifact poll is being monitored')
                        } catch (err) {
                            console.error(err);
                            await interaction.editReply('Failed to stop the monitoring')
                        }
                        break;
                }
                break;
            default:
                await interaction.editReply('Unknown command');
                break;
        }
    } catch (err) {
        console.error(err);
    }
});

function validateUser(user) {
    return moderatorIds.includes(user.id);
}

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