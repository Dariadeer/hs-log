const { Client, GatewayIntentBits, DiscordAPIError, EmbedBuilder, EmbedType, AttachmentBuilder, PollLayoutType, MessageFlags} = require('discord.js');
const db = require('./db.js');
const utils = require('./utils.js');
const images = require('./images.js');
const fs = require('fs');
const { WEBHOOK_ID, BOT_ID, GUILD_ID, LB_CHANNEL_ID, MODERATORS, WS_ROLE_IDS, SHIP_EMOJI_IDS, EMOJI_IDS, ART_ROLE_ID, ART_POLL_DURATION, ART_POLL_CHECK_INTERVAL } = process.env;
const ART_POLL_CHECK_INTERVAL_NUM = parseInt(ART_POLL_CHECK_INTERVAL);
const ART_POLL_DURATION_NUM = parseInt(ART_POLL_DURATION);

const moderatorIds = MODERATORS.split(',').map(id => id.trim());
const wsRoleIds = WS_ROLE_IDS.split(',').map(id => id.trim());
const emojiIds = EMOJI_IDS.split(',').map(id => id.trim());

const shipEmojiIds = SHIP_EMOJI_IDS.split(',').map(id => id.trim());


const TIME_REGEX = /(?<day>\d+)\/(?<hour>\d+)\:(?<minute>\d+)\:(?<second>\d+)/g;
const WS_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

const SHIPS = {
    battleship: {
        respawn: 18 * 60 * 60 * 1000,
        icon: 'https://raw.githubusercontent.com/userXinos/HadesSpace/refs/heads/master/src/img/game/Ships/Battleship.png',
        shorthand: 'BS',
        emoji: shipEmojiIds[0]
    },
    transport: {
        respawn: 24 * 60 * 60 * 1000,
        ison: 'https://raw.githubusercontent.com/userXinos/HadesSpace/refs/heads/master/src/img/game/Ships/Transport_lv1.png',
        shorthand: 'TS',
        emoji: shipEmojiIds[1]
    },
    miner: {
        respawn: 24 * 60 * 60 * 1000,
        icon: 'https://cdn.discordapp.com/emojis/1466452412075086047.webp',
        shorthand: 'MS',
        emoji: shipEmojiIds[2]
    }
}

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
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(channelId);
    channel.send(artPollMessage);
}

client.getMessageInfo = async (channelId, messageId) => {
    (await client.guilds.fetch('')).messages
    return (await client.channels.fetch(channelId)).messages.fetch(messageId);
}

client.updateScoreboard = async () => {
    const files = await generateReport(utils.getLastEventNumber(Date.now()), 0, true);
    if(!files) return;
    await sendReport(files);
}


async function checkArtPoll () {
    try {
        const [channelId, pollId] = await db.getArtPollData();

        if(!channelId || !pollId) return;
    
        const guild = await client.guilds.fetch(GUILD_ID);
        const channel = await guild.channels.fetch(channelId);
        const poll = await channel.messages.fetch(pollId);
    
        if(poll.poll.resultsFinalized) {
            const sent = await channel.send(artPollMessage);
            await poll.delete();
            await db.setArtPollData(channelId, sent.id);
            console.log(new Date().toLocaleString() + ' Check - Positive: Updating...')
        } else {
            console.log(new Date().toLocaleString() + ' Check - Negative: Pass')
        }
    } catch (e) {
        console.log(new Date().toLocaleString() + ' Error: (' + e + ')')
    }
    
}

client.monitor = async () => {
    // Immediate check after start with every next one repeating every 5 minutes
    console.log('Beginning monitoring...')
    checkArtPoll();
    setInterval(() => checkArtPoll(), ART_POLL_CHECK_INTERVAL_NUM);
}

async function processWebhookMessage(message) {
    if(message.author.id !== WEBHOOK_ID) return;
    try {
        for(let file of message.attachments.entries()) {
            if(!client.log) throw new Error('The data logging function isn\'t set');
            const data = await (await fetch(file[1].attachment)).json();
            await client.log(data, async res => {
                if(res && !res.status) {
                    message.react('❗');
                    console.log(res.error);
                    return;
                }
                message.react('✅');
                if(utils.isRSEvent(Date.now()) && res.status === 2) {
                    const files = await generateReport(utils.getLastEventNumber(Date.now()), 0, true);
                    if(!files) return;
                    await sendReport(files);
                }
            });
        }
    } catch (err) {
        // If wrong lb channel, most likely
        console.error(err);
    }
}

client.on('interactionCreate', async interaction => {
    try {
        if(!interaction.channel.name.includes('bot')) {
            return await interaction.reply({
                content: 'Please use a bot channel to communicate with the bot.',
                flags: [MessageFlags.Ephemeral]
            });
        }
        const userRoleIds = [...interaction.member.roles.cache.keys()];
        switch (interaction.commandName) {
            case 'lb':
            case 'leaderboard':
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const season = interaction.options.get('season') ? interaction.options.get('season').value : utils.getLastEventNumber(Date.now());
                const stat = interaction.options.get('stat') ? interaction.options.get('stat').value : 0;
                const files = await generateReport(season, stat, false);
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
                        if(!validateUser(interaction.user)) return await interaction.editReply('You do not have permissions to do this');
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
                            const guild = await client.guilds.fetch(GUILD_ID);
                            const channel = await guild.channels.fetch(channelId);
                            if(channel.isThread()) {
                                await channel.join();
                            }
                            const poll = await channel.messages.fetch(pollId);
                            if(poll.poll && poll.author.id === BOT_ID) {
                                await db.setArtPollData(channel.id, poll.id);
                                await interaction.editReply('Success! Now monitoring poll ' + pollId);
                            } else {
                                await interaction.editReply('Failed to start monitoring poll ' + pollId);
                            }
                        } catch (err) {
                            console.error(err);
                            await interaction.editReply('Failed to start monitoring the poll (' + err.rawError.message + ')');
                        }
                        break;
                    case 'status':
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                        const [channelId, pollId] = await db.getArtPollData();
                        if(channelId && pollId) {
                            await interaction.editReply(`Monitoring https://discord.com/channels/${GUILD_ID}/${channelId}/${pollId}`);
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
            case 'ws':
                let index;
                let shipType;
                const group = interaction.options.getSubcommandGroup();
                const sub = interaction.options.getSubcommand();
                if(group === 'elimination' &&  !validateRoles(userRoleIds, wsRoleIds) && !validateUser(interaction.user)) return await interaction.reply('You can\'t use this command unless you are a part of one of our WS teams');
                switch ((group ? (group + ' ') : '') + sub) {
                    case 'info':
                        await interaction.deferReply();
                        const stars = await db.getWSInfo();

                        const embeds = [];
                        if(stars[0]) embeds.push(generateWSInfoEmbed(stars[0], 0));
                        if(stars[1]) embeds.push(generateWSInfoEmbed(stars[1], 1));

                        if(embeds.length === 0) {
                            await interaction.editReply({
                                content: 'There are no ongoing white stars at the moment...'
                            });
                        } else {
                            await interaction.editReply({
                                embeds: embeds
                            });
                        }
                        break;
                    case 'elimination record':
                        await interaction.deferReply();
                        index = parseInt(interaction.options.get('index').value);
                        shipType = interaction.options.get('ship').value;
                        const timeStr = interaction.options.get('time').value;
                        const time = TIME_REGEX.exec(timeStr);
                        if(time == null) return await declareInvalidInputs(interaction, 'time');

                        const day = parseInt(time.groups.day);
                        const hour = parseInt(time.groups.hour);
                        const minute = parseInt(time.groups.minute);
                        const second = parseInt(time.groups.second);

                        const ms = 1000 * (60 * (minute + 60 * (hour + 24 * day)) + second);
                        if(ms > WS_DURATION_MS) return await declareInvalidInputs(interaction, 'time');

                        const ws = await db.getWSFromPlayerIndex(index);
                        if(!ws) return await declareInvalidInputs(interaction, 'index');

                        // const diedAt = new Date(new Date(ws.ws_start).getTime() + WS_DURATION_MS - ms);
                        const respawnsAt = new Date(new Date(ws.ws_start).getTime() + WS_DURATION_MS - ms + SHIPS[shipType].respawn);
                        // To allow setting respawn timers in the future, if death is apparent
                        // if(diedAt.getTime() > Date.now()) return await declareInvalidInputs(interaction, 'time');
                        await db.recordWSElimination(ws.pid, respawnsAt, shipType);
                        await interaction.editReply({
                            embeds: [{
                                color: 0xffffff,
                                title: 'Elimination entry',
                                thumbnail: {
                                    url: SHIPS[shipType].icon
                                },
                                fields: [
                                    {
                                        name: 'Player name',
                                        value: ws.name,
                                        inline: false
                                    },
                                    {
                                        name: 'Ship type',
                                        value: utils.capitalizeFirstLetter(shipType),
                                        inline: false
                                    },
                                    {
                                        name: 'Returns',
                                        value: `<t:${respawnsAt.getTime() / 1000}:R>`,
                                        inline: false
                                    }
                                ]
                            }]
                        });
                        break;
                    case 'elimination clear':
                        await interaction.deferReply();
                        index = parseInt(interaction.options.get('index').value);
                        shipType = interaction.options.get('ship').value;

                        await db.clearWSElimination(index, shipType);
                        await interaction.editReply('Cleared the elimination record successfully');
                        break;
                    case 'elimination view':
                        await interaction.deferReply();

                }
                break;
            default:
                await interaction.deferReply();
                await interaction.editReply('Unknown command');
                break;
        }
    } catch (err) {
        console.error(err);
        if(!interaction.deferred) interaction.deferReply();
        interaction.editReply('Internal error');
    }
});

async function generateReport(season, stat, header) {
    stat = stat || 0;
    const players = await db.report(season, stat);
    const corporationScore = await db.totalScore(season);
    if(players.length === 0) return null;
    const files = [];
    if(header) {
        files.push({
            name: 'header.png',
            attachment:  images.generateScoreHeaderImage(corporationScore, season)
        });
    }
    for(let i = 0; i < players.length; i+= 10) {
        files.push({
            name: 'report' + i + '.png',
            attachment: images.generateScoreboardImage(players, season, i, 10, players[0][stats[stat].name], stat)
        });
    }
    return files;
}

async function sendReport(files) {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(LB_CHANNEL_ID);
    const messages = await channel.messages.fetch({ limit: 20 });
    for(let [id, m] of messages.entries()) {
        if (m.author.id === process.env.BOT_ID) {
            await m.delete();
        }
    }
    const attachments = files.map(file => {
        return new AttachmentBuilder(file.attachment, {
        name: file.name,
        });
    });
    
    // const embeds = files.map(file => ({
    //     color: 0x420000,
    //     image: {
    //     url: 'attachment://' + file.name
    //     }
    // }));
    
    // await channel.send({
    //     content: '',
    //     embeds,
    //     files: attachments
    // });
    
    for(let file of files) {
        await channel.send({
            content: '',
            files: [file]
        })
    }
}

function generateWSInfoEmbed(star, slot) {

    const playerToString = (player) => `${player.index}${player.index < 10 ? ' ' : ''} - ${player.name}`;
    const respawnToString = (respawn) => `<:${utils.capitalizeFirstLetter(respawn.ship_type)}:${SHIPS[respawn.ship_type].emoji}> ${respawn.pname} <t:${new Date(respawn.respawns_at).getTime() / 1000}:R>`

    return {
        color: 0xffffff,
        title: `(WS ${slot + 1}) ${star.us.corp.name} vs ${star.them.corp.name}`,
        description: `Ends <t:${star.endsAt}:R>`,
        thumbnail: {
            url: 'https://raw.githubusercontent.com/userXinos/HadesSpace/refs/heads/master/src/img/game/Stars/star_white.png'
        },
        fields: [
            {
                name: 'Allies',
                value: '```\n' + star.us.players.map(playerToString).join('\n') + '```',
                inline: true
            },
            {
                name: 'Opponents',
                value: '```\n' + star.them.players.map(playerToString).join('\n') + '```',
                inline: true
            },
            {
                name: 'Respawn timers',
                value: '',
                inline: false
            },
            {
                name: '',
                value: star.us.down.map(respawnToString).join('\n'),
                inline: true
            },
            {
                name: '',
                value: star.them.down.map(respawnToString).join('\n'),
                inline: true
            },
        ]
    }
}

async function declareInvalidInputs(interaction, argName) {
    return await interaction.editReply({
        content: `Invalid value for option '${argName}'`
    });
}

function validateUser(user) {
    return moderatorIds.includes(user.id);
}

function validateRoles(userRoles, requiredRoles) {
    for(let role of userRoles) {
        if(requiredRoles.includes(role)) return true;
    }

    return false;
}

module.exports = client;