require('dotenv').config();

const bot = require('./src/bot');
const db = require('./src/db');

db.connect(async () => {
    await bot.login(process.env.BOT_TOKEN);
});

bot.once('ready', async () => {
    console.log('Discord Bot Ready!');
    bot.monitor();
});

bot.log = db.log;