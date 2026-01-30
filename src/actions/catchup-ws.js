require('dotenv').config();

const bot = require('../bot');
const db = require('../db');

bot.log = db.log;

db.connect(async () => {
    await bot.login(process.env.BOT_TOKEN);
});

bot.once('ready', async () => {
    console.log('Discord Bot Ready!');

    const limit = 100;
    const channel = await bot.channels.fetch(process.env.WEBHOOK_CHANNEL_ID);
    let counter = 0;
    let before = undefined;
    let present = true;
    let events = []
    while(present) {
        console.log('Processing batch ' + counter);
        counter++;
        present = false;
        let messages = await channel.messages.fetch({ limit, before });
        let iterator = messages.values();
        for(let message = iterator.next().value; message != undefined; message = iterator.next().value) {
            present = true;
            before = message.id;

            const isReactionAbsent = await message.reactions.cache.values().next().value === undefined;
            
            if(isReactionAbsent) {
                for(let [_, { attachment }] of message.attachments) {
                    if(!attachment.includes('data.json')) continue;
                    const data = await (await fetch(attachment)).json();
    
                    if(data.EventType && data.EventType.startsWith('WhiteStar')) {
                        events.splice(0, 0, data);
                    }
                }
            }
        }
    }
    
    for(let event of events) {
        console.log(event.EventType);
        try {
            await db.log(event, () => {});
        } catch (error) {
            console.error(error);
        }
    }
});