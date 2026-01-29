require('dotenv').config();

const bot = require('../bot');
const db = require('../db');

bot.log = db.log;

db.connect(async () => {
    await bot.login(process.env.BOT_TOKEN);
});

bot.once('ready', async () => {
    console.log('Discord Bot Ready!');
    await bot.updateScoreboard();
    console.log('Scoreboard updated!');
});