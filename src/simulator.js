const { WebhookClient } = require('discord.js');

class RSEventEntry {
    /**
     *
     * @param ssid {string}
     * @param level {Number}
     * @param drs {Boolean}
     * @param timestamp {Date}
     */
    constructor(ssid, level, drs, timestamp) {
        this.ssid = ssid;
        this.level = level;
        this.drs = drs;
        this.timestamp = timestamp;
    }

    f() {
        // console.log(this)
        return {
            StarSystemID: this.ssid,
            StarLevel: this.level,
            DarkRedStar: this.drs,
            Timestamp: this.timestamp.toISOString()
        }
    }
}

class RSStartEntry extends RSEventEntry {
    /**
     *
     * @param ssid {string}
     * @param level {Number}
     * @param drs {Boolean}
     * @param timestamp {Date}
     * @param players {Player[]}
     */
    constructor(ssid, level, drs, timestamp, players) {
        super(ssid, level, drs, timestamp);
        this.players = players;
    }

    format() {
        return Object.assign(
            this.f(),
            {
                Players: this.players.map(player => player.format()),
                EventType: "RedStarStarted"
            });
    }
}

class RSEndEntry extends RSEventEntry {
    /**
     *
     * @param ssid {string}
     * @param level {Number}
     * @param drs {Boolean}
     * @param timestamp {Date}
     * @param contributors {Players[]}
     * @param points {Number}
     */
    constructor(ssid, level, drs, timestamp, contributors, points) {
        super(ssid, level, drs, timestamp);
        this.contributors = contributors;
        this.points = points;
    }

    format() {
        return Object.assign(
            this.f(),
            {
                PlayersWhoContributed: this.contributors.map(player => player.format()),
                EventType: "RedStarEnded",
                RSEventPoints: this.points
            });
    }
}

class Player {

    static abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    constructor() {
        this.id = Player.generateId();
        this.name = Player.generateName();
    }

    static generateId() {
        let result = '';
        for(let i = 0; i < 16; i++) {
            result += this.s4();
        }
        return result;
    }

    static generateName() {
        let result = '';
        let length = ((Math.random() * 4) << 0) + 4;
        for(let i = 0; i < length; i++) {
            result += i == 0
                ? this.abc[(Math.random() * this.abc.length) << 0]
                : this.abc[(Math.random() * this.abc.length) << 0].toLowerCase();
        }

        return result;
    }

    format() {
        return {
            PlayerID: this.id,
            PlayerName: this.name
        }
    }

    static s4() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }
}

const client = new WebhookClient({
    id: process.env.HOOK,
    token: process.env.HOOK_TOKEN
});

async function sendData(data) {
    const res = await client.send({
        files: [{
            attachment: Buffer.from(JSON.stringify(data, null, 0)),
            name: 'data.json'
        }]
    });
}

module.exports = (playerCount, runCount, delay, log) => {

    if(!log) log = sendData;

    const start = 1745625600000;

    const players = [];
    const events = [];

    for(let i = 0; i < playerCount; i++) {
        players.push(new Player());
    }
    let entry, level, players2, playerNum, p;
    for(let i = 0; i < runCount; i++) {
        level = ((Math.random() * 4) << 0) + 7;
        players2 = [];
        playerNum = ((Math.random() * 3) << 0) + 1;
        while(players2.length < playerNum) {
            p = players[(Math.random() * players.length) << 0];
            if(players2.includes(p)) {
                continue;
            } else {
                players2.push(p);
            }
        }
        entry = new RSStartEntry(
            Player.generateId(),
            level,
            true,
            new Date(start + ((Math.random() * 171600000) << 0)),
            players2
        );
        events.push(entry);
        entry = new RSEndEntry(
            entry.ssid,
            entry.level,
            true,
            new Date(entry.timestamp.getTime() + ((Math.random() * 600000) << 0) + 600000),
            players2,
            (level**3 * 25) << 0);
        events.push(entry);
    }

    events.sort((a, b) => a.timestamp - b.timestamp);


    const events2 = events.map(event => event.format());

    // console.log(events2);

    let count = 1;
    console.log(events2);
    for(let event of events2) {
        count++;
        setTimeout(async () => {
            await log(event, () => {});
        }, count * delay);
    }
    console.log('Simulation events scheduled.');
}