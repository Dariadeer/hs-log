require('dotenv').config();

const bot = require('../src/bot');
const db = require('../src/db');

bot.log = db.log;

db.connect(async () => {
    await bot.login(process.env.TOKEN);
});

bot.once('ready', async () => {
    console.log('Discord Bot Ready!');
    await bot.updateScoreboard();
});