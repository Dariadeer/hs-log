const {DB_HOST, DB_USER, DB_PASSWORD, DB_PORT} = process.env;
const mysql = require('mysql2');
const util = require('util');
const path = require('path');
const fs = require('fs');

const stats = require('./reports').stats;

const utils = require('./utils');

const DB_SETUP_PATH = path.resolve(__dirname, '../resources/queries/db_setup.sql');

const pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    database: 'hs_log',
    keepAliveInitialDelay: 10000,
    enableKeepAlive: true,
    multipleStatements: true
});

// we do this to use async await with mysql (see: https://stackoverflow.com/questions/50093144/using-async-await-with-a-mysql-database)
pool.query = util.promisify(pool.query).bind(pool);

module.exports = pool;

async function setup() {
    // const queries = fs.readFileSync(DB_SETUP_PATH).toString().split(';');
    // for(let query of queries) {
    //     try {
    //         await pool.query(query);
    //     } catch(error) {
    //         if(error.code !== 'ER_EMPTY_QUERY') {
    //             throw error;
    //         }
    //     }
    // }
    const queries = fs.readFileSync(DB_SETUP_PATH).toString();
    const results = await pool.query(queries);
}

async function log(data, callback) {
    try {
        switch (data.EventType) {
            case 'RedStarStarted':
                // Insert the star
                await pool.query(
                    'INSERT INTO hs_log.stars (ssid, rs_level, drs, rs_start) VALUES (?, ?, ?, ?)',
                    [data.StarSystemID, data.StarLevel, data.DarkRedStar, formatDate(data.Timestamp)]
                );
                return callback({
                    status: 1
                });
            case 'RedStarEnded':
                await pool.query(
                    'UPDATE hs_log.stars SET rs_end = ?, rs_points = ?, players = ? WHERE ssid = ?',
                    [formatDate(data.Timestamp), data.RSEventPoints, data.PlayersWhoContributed.length, data.StarSystemID]
                );
                // Insert players
                await pool.query(
                    'INSERT IGNORE INTO hs_log.players (pid, name) VALUES ?',
                    [data.PlayersWhoContributed.map(player => [player.PlayerID, player.PlayerName])]
                );

                // Insert participation
                await pool.query(
                    'INSERT INTO hs_log.participation (pid, ssid) VALUES ?',
                    [data.PlayersWhoContributed.map(player => [player.PlayerID, data.StarSystemID])]
                );
                return callback({
                    status: 2
                });
            case 'WhiteStarStarted':
                // Insert corporations
                const corp = data.Corporation, opp = data.Opponent;
                await pool.query(
                    `INSERT IGNORE INTO hs_log.corporations (cid, name, symbol, border, color_1, color_2) VALUES ?`,
                    [[
                        [corp.CorporationID, corp.CorporationName, corp.SymbolIdx, corp.BorderIdx, corp.ColorIdx, corp.Color2Idx],
                        [opp.CorporationID, opp.CorporationName, opp.SymbolIdx, opp.BorderIdx, opp.ColorIdx, opp.Color2Idx]
                    ]]
                );
                // Insert the star
                await pool.query(
                    `INSERT INTO hs_log.white_stars (ssid, ws_start, our_id, opponent_id, slot, underdog) VALUES (?, ?, ?, ?, ?, ?)`,
                    [data.WhiteStarID, formatDate(data.Timestamp), corp.CorporationID, opp.CorporationID, data.Slot, data.IsUnderdog]
                );
                // Insert players
                await pool.query(
                    `INSERT IGNORE INTO hs_log.players (pid, name) VALUES ?`,
                    [[...data.OurParticipants, ...data.OpponentParticipants].map(player => [player.PlayerID, player.PlayerName])]
                );
                // Insert ally participation
                let count = 1 + data.Slot * 20;
                await pool.query(
                    `INSERT INTO hs_log.ws_participation (pid, ssid, opponent, \`index\`) VALUES ?`,
                    [data.OurParticipants.map(player => [player.PlayerID, data.WhiteStarID, false, count++])]
                );
                
                // Insert opponent participation
                await pool.query(
                    `INSERT INTO hs_log.ws_participation (pid, ssid, opponent, \`index\`) VALUES ?`,
                    [data.OpponentParticipants.map(player => [player.PlayerID, data.WhiteStarID, true, count++])]
                );
                return callback({
                    status: 3
                });
            case 'WhiteStarEnded':
                await pool.query(
                    'UPDATE hs_log.white_stars SET xp_gained = ?, our_score = ?, opponent_score = ? WHERE ssid = ?',
                    [data.XPGained, data.OurScore, data.OpponentScore, data.WhiteStarID]
                );
                return callback({
                    status: 4
                })
            default:
                console.log("Not recognized: ", data.EventType);
                return;

        }
    } catch (error) {
        return callback({
            status: 0,
            error
        });
    }

}

async function totalScore(season) {
    const [start, end] = utils.getEventTimeframe(season);
    const formattedStart = new Date(start).toISOString();
    const formattedEnd = new Date(end).toISOString();

    const results = await pool.query(`
        SELECT 
          SUM(s.rs_points) as sum
        FROM 
          stars s
        WHERE 
          s.rs_start > ? AND s.rs_end < ?
  `, [formattedStart, formattedEnd]);
    return results[0].sum;
}

async function report(season, stat) {
    const [start, end] = utils.getEventTimeframe(season);
    const formattedStart = new Date(start).toISOString();
    const formattedEnd = new Date(end).toISOString();

    const results = await pool.query(`
        SELECT 
          p.pid,
          p.name,
          ${stats[stat].query} AS \`${stats[stat].name}\`
        FROM 
          players p
        JOIN 
          participation part ON p.pid = part.pid
        JOIN 
          stars s ON part.ssid = s.ssid
        WHERE 
          s.rs_start > ? AND s.rs_end < ?
        GROUP BY 
          p.pid, p.name
        ORDER BY 
          \`${stats[stat].name}\` DESC
  `, [formattedStart, formattedEnd]);
    return results;
}

async function connect(callback) {
    pool.getConnection(async (err, connection) => {
        if (err) throw err;
        console.log("Connected to the DB successfully!");
        await setup();
        await checkArtPollId();
        console.log("DB setup completed!");
        callback();
        connection.release();
    });
}

async function checkArtPollId() {
    const message = await pool.query(`SELECT value FROM vars WHERE \`key\` = 'ArtPollMessageId'`);
    if(message.length === 0) {
        await pool.query(`
            INSERT INTO vars VALUES ('ArtPollMessageId', NULL)
        `);
    }
    const channel = await pool.query(`SELECT value FROM vars WHERE \`key\` = 'ArtPollChannelId'`);
    if(channel.length === 0) {
        await pool.query(`
            INSERT INTO vars VALUES ('ArtPollChannelId', NULL)
        `);
    }
}

async function setArtPollData(channelId, pollId) {
    await pool.query(`
        UPDATE vars SET \`value\` = '${pollId}' WHERE \`key\` = 'ArtPollMessageId'
    `);
    await pool.query(`
        UPDATE vars SET \`value\` = '${channelId}' WHERE \`key\` = 'ArtPollChannelId'
    `);
}

async function resetArtPollData() {
    await pool.query(`
        UPDATE vars SET \`value\` = NULL WHERE \`key\` = 'ArtPollMessageId'
    `);
    await pool.query(`
        UPDATE vars SET \`value\` = NULL WHERE \`key\` = 'ArtPollChannelId'
    `);
}

async function getArtPollData() {
    const result = await pool.query(`SELECT * FROM vars WHERE \`key\`='ArtPollMessageId' OR \`key\` = 'ArtPollChannelId'`);
    return [result.find(e => e.key === 'ArtPollChannelId').value, result.find(e => e.key === 'ArtPollMessageId').value];
}

async function getWSInfo() {
    const results = await pool.query(`

        WITH active_ws AS (
            SELECT *
            FROM white_stars
            WHERE TIME_TO_SEC(TIMEDIFF(NOW(), ws_start)) < 432000
        )

        SELECT *, ADDTIME(ws_start, '5 00:00:00') AS ends_at
        FROM active_ws;


        WITH active_ws AS (
            SELECT *
            FROM white_stars
            WHERE TIME_TO_SEC(TIMEDIFF(NOW(), ws_start)) < 432000
        )

        SELECT c.*
        FROM corporations c
        JOIN active_ws aws ON c.cid = aws.our_id OR c.cid = aws.opponent_id;
        

        WITH active_ws AS (
            SELECT *
            FROM white_stars
            WHERE TIME_TO_SEC(TIMEDIFF(NOW(), ws_start)) < 432000
        )

        SELECT wsp.index, wsp.opponent, p.name, aws.slot
        FROM ws_participation wsp
        JOIN active_ws aws ON aws.ssid = wsp.ssid
        JOIN players p ON p.pid = wsp.pid;

        WITH active_ws AS (
            SELECT *
            FROM white_stars
            WHERE TIME_TO_SEC(TIMEDIFF(NOW(), ws_start)) < 432000
        )
        
        SELECT wsr.ship_type, wsr.respawns_at, p.name AS pname, aws.slot, wsp.opponent
        FROM ws_respawns wsr
        JOIN ws_participation wsp ON wsr.pid = wsp.pid
        JOIN active_ws aws ON wsp.ssid = aws.ssid
        JOIN players p ON p.pid = wsp.pid
        WHERE wsr.respawns_at > NOW();

    `);

    const [ stars, corps, players, respawns ] = results;

    const formatted = {};

    for(let i = 0; i < 2; i++) {
        const star = stars.find(star => star.slot === i);
        if(star) {
            formatted[i] = {
                endsAt: star.ends_at / 1000,
                us: {
                    corp: corps.find(corp => corp.cid === star.our_id),
                    players: players.filter(p => p.slot === star.slot && !p.opponent).sort((a, b) => a.index - b.index),
                    down: respawns.filter(r => r.slot === star.slot && !r.opponent)
                },
                them: {
                    corp: corps.find(corp => corp.cid === star.opponent_id),
                    players: players.filter(p => p.slot === star.slot && p.opponent).sort((a, b) => a.index - b.index),
                    down: respawns.filter(r => r.slot === star.slot && r.opponent)
                }
            }
        }
    }

    return formatted;
}

async function getWSFromPlayerIndex(index) {
    return (await pool.query(`
        SELECT *
        FROM white_stars ws
        JOIN ws_participation wsp ON ws.ssid = wsp.ssid
        JOIN players p ON p.pid = wsp.pid
        WHERE wsp.index = ?;
    `, [index]))[0];
}

async function recordWSElimination(playerId, respawnsAt, shipType) {
    await pool.query(`INSERT INTO ws_respawns (pid, respawns_at, ship_type) VALUES (?, ?, ?)`,
        [playerId, formatDate(respawnsAt.toISOString()), shipType]
    );
}

async function clearWSElimination(index, shipType) {
    await pool.query(`DELETE wsr FROM ws_respawns wsr JOIN ws_participation wsp ON wsr.pid = wsp.pid WHERE wsp.\`index\` = ? AND wsr.ship_type = ?`,
        [index, shipType]
    );
}

/**
 *
 * @param dateString
 * @returns String
 */
function formatDate(dateString) {
    return dateString.slice(0, 19).replace('T', ' ');
}

module.exports = {
    log,
    report,
    query: pool.query,
    connect,
    getArtPollData,
    setArtPollData,
    resetArtPollData,
    totalScore,
    getWSInfo,
    getWSFromPlayerIndex,
    recordWSElimination,
    clearWSElimination
};
