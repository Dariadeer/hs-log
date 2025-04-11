require('dotenv').config();

const bot = require('./src/bot');
const db = require('./src/db');

db.connect(async () => {
    await bot.login(process.env.TOKEN);
});

bot.once('ready', async () => {
    console.log('Discord Bot Ready!');
    // await require('./src/simulator')(30, 200, 10, db.log);
    // await require('./src/simulator')(3, 1, 5000);
});

bot.log = db.log;

