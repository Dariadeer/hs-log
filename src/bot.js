const { Client, GatewayIntentBits, DiscordAPIError } = require('discord.js');
const db = require('./db.js');
const utils = require('./utils.js');
const images = require('./images.js');
const { GUILD, LB_CHANNEL } = process.env;

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
            if(res.status === 0) {
                message.react('❗');
                console.log(res.err);
                return;
            }
            message.react('✅');
            if(!utils.isRSEvent(Date.now()) || res.status !== 2) return;
            const files = await generateReport(utils.getLastEventNumber(Date.now()));
            if(!files) return;
            const guild = await client.guilds.fetch(GUILD)
            const channel = await guild.channels.fetch(LB_CHANNEL)
            const messages = await channel.messages.fetch({ limit: 10 });
            for(let [id, m] of messages.entries()) {
                if (m.author.id === process.env.CLIENT) {
                    console.log('Found last message!');
                    await m.delete();
                }
            }
            for(let file of files) {
                await channel.send({
                    // files: generateReport(utils.getLastEventNumber(Date.now()))
                    files: [file]
                })
            }
        });
    }
}

client.on('interactionCreate', async interaction => {
    if(interaction.commandName === 'report') {
        const season = interaction.options.get('season') ? interaction.options.get('season').value : utils.getLastEventNumber(Date.now());
        const files = await generateReport(season);
        if(!files) return await interaction.reply('The data for this season was not recorded');
        await interaction.reply(
        {
            files:files
        });
    }
});

async function generateReport(season) {
    const players = await db.report(season);
    if(players.length === 0) return null;
    const files = [];
    for(let i = 0; i < players.length; i+= 10) {
        files.push({
            name: 'report (' + i + ').png',
            attachment: await images.generateScoreboardImage(players, season, i, 10, players[0].total_adjusted_score)
        })
    }
    return files;
}

module.exports = client;