const { WebhookClient } = require('discord.js');
const { getEventTimeframe, getLastEventNumber } = require('./utils');

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

    format() {
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
            super.format(),
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
     * @param contributors {Player[]}
     * @param points {Number}
     */
    constructor(ssid, level, drs, timestamp, contributors, points) {
        super(ssid, level, drs, timestamp);
        this.contributors = contributors;
        this.points = points;
    }

    format() {
        return Object.assign(
            super.format(),
            {
                PlayersWhoContributed: this.contributors.map(player => player.format()),
                EventType: "RedStarEnded",
                RSEventPoints: this.points
            });
    }
}

const client = new WebhookClient({
    id: process.env.WEBHOOK_ID,
    token: process.env.WEBHOOK_TOKEN
});

async function sendData(data) {
    const res = await client.send({
        files: [{
            attachment: Buffer.from(JSON.stringify(data, null, 0)),
            name: 'data.json'
        }]
    });
}

class Corporation extends Player {
    constructor() {
        super();
        this.symbol = (Math.random() * 50) >> 0;
        this.border = (Math.random() * 50) >> 0;
        this.color1 = (Math.random() * 50) >> 0;
        this.color2 = (Math.random() * 50) >> 0;
    }

    format() {
        return {
            CorporationID: this.id,
            CorporationName: this.name,
            SymbolIdx: this.symbol,
            BorderIdx: this.border,
            ColorIdx: this.color1,
            Color2Idx: this.color2
        };
    }
}

class WSEntry {
    /**
     * 
     * @param {Number} ssid 
     * @param {Corporation} corporation
     * @param {Corporation} opponent 
     * @param {Date} timestamp 
     */
    constructor(ssid, corporation, opponent, timestamp) {
        this.ssid = ssid;
        this.corporation = corporation;
        this.opponent = opponent;
        this.timestamp = timestamp;
    }

    format() {
        return {
            WhiteStarID: this.ssid,
            Corporation: this.corporation.format(),
            Opponent: this.opponent.format(),
            Timestamp: this.timestamp.toISOString()
        };
    }
}

class WSStartEntry extends WSEntry {
    /**
     * 
     * @param {Number} ssid 
     * @param {Corporation} corporation
     * @param {Corporation} opponent 
     * @param {Date} timestamp 
     * @param {Player[]} opponentPlayers 
     * @param {Player[]} allyPlayers 
     * @param {Boolean} isUnderdog 
     * @param {Number} slot 
     */
    constructor(ssid, corporation, opponent, timestamp, opponentPlayers, allyPlayers, isUnderdog, slot) {
        super(ssid, corporation, opponent, timestamp);
        this.opponentPlayers = opponentPlayers;
        this.allyPlayers = allyPlayers;
        this.isUnderdog = isUnderdog;
        this.slot = slot;
    }

    format() {
        return Object.assign(
            super.format(),
            {
                EventType: "WhiteStarStarted",
                IsUnderdog: this.isUnderdog,
                OurParticipants: this.allyPlayers.map(e => e.format()),
                OpponentParticipants: this.opponentPlayers.map(e => e.format()),
                Slot: this.slot
            }
        )
    }
}

class WSEndEntry extends WSEntry{
    /**
     * 
     * @param {Number} ssid 
     * @param {Corporation} corporation
     * @param {Corporation} opponent 
     * @param {Date} timestamp 
     * @param {Number} ourScore 
     * @param {Number} opponentScore 
     * @param {Number} xpGained 
     */
    constructor(ssid, corporation, opponent, timestamp, ourScore, opponentScore, xpGained) {
        super(ssid, corporation, opponent, timestamp);
        this.ourScore = ourScore;
        this.opponentScore = opponentScore;
        this.xpGained = xpGained;
    }

    format() {
        return Object.assign(
            super.format(),
            {
                EventType: "WhiteStarEnded",
                OurScore: this.ourScore,
                OpponentScore: this.opponentScore,
                XPGained: this.xpGained
            }
        )
    }
}

async function simulateRSEvent(playerCount, runCount, log) {

    if(!log) log = sendData;

    const start = getEventTimeframe(getLastEventNumber(Date.now()))[0];

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
        await log(event, () => {});
    }
    console.log('Simulation events scheduled (RSE)');
}

async function simulateWS(log, slot, dateNum) {
    if(!log) log = sendData;

    const WS_DURATION = 5 * 24 * 60 * 60 * 1000;
    
    // Quilliance corp
    const corporation = new Corporation();
    corporation.name = "Quilliance";
    corporation.id = "6a4f8febc4066842f85c0373a0d33b6501860f2cc4f61b64761d31ff472c28fe",
    corporation.symbol = 46;
    corporation.border = 51;
    corporation.color1 = 5;
    corporation.color2 = 11;

    // Random opponent corp
    const opponent = new Corporation();
    
    // Participants
    const opponentPlayers = [];
    const allyPlayers = [];

    const matchId = Player.generateId();
    const dateStart = dateNum || Date.now();

    const scores = [(Math.random() * 30) << 0, (Math.random() * 30) << 0];

    for(let i = 0; i < 10; i++) {
        opponentPlayers.push(new Player());
        allyPlayers.push(new Player());
    }

    const events = [];
    events.push(
        new WSStartEntry(
            matchId,
            corporation,
            opponent,
            new Date(dateStart),
            opponentPlayers,
            allyPlayers,
            false,
            slot
        ),
        new WSEndEntry(
            matchId,
            corporation,
            opponent,
            new Date(dateStart + WS_DURATION),
            scores[0],
            scores[1],
            scores[0] > scores[1] ? 100 : 40
        )
    );
    
    const events2 = events.map(event => event.format());

    let count = 1;
    for(let event of events2) {
        count++;
        await log(event, () => {});
    }
    console.log('Simulation events scheduled (WS)');
}

module.exports = {
    simulateRSEvent,
    simulateWS
}
