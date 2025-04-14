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
    keepAliveInitialDelay: 10000,
    enableKeepAlive: true,
});

// we do this to use async await with mysql (see: https://stackoverflow.com/questions/50093144/using-async-await-with-a-mysql-database)
pool.query = util.promisify(pool.query).bind(pool);

module.exports = pool;

async function setup() {
    const queries = fs.readFileSync(DB_SETUP_PATH).toString().split(';');
    for(let query of queries) {
        try {
            await pool.query(query);
        } catch(error) {
            if(error.code !== 'ER_EMPTY_QUERY') {
                throw error;
            }
        }
    }
}

async function log(data, callback) {
    try {
        switch (data.EventType) {
            case 'RedStarStarted':
                // Insert the star
                await pool.query(
                    'INSERT INTO stars (ssid, rs_level, drs, rs_start) VALUES (?, ?, ?, ?)',
                    [data.StarSystemID, data.StarLevel, data.DarkRedStar, formatDate(data.Timestamp)]
                );
                return callback({
                    status: 1
                });
            case 'RedStarEnded':
                await pool.query(
                    'UPDATE stars SET rs_end = ?, rs_points = ?, players = ? WHERE ssid = ?',
                    [formatDate(data.Timestamp), data.RSEventPoints, data.PlayersWhoContributed.length, data.StarSystemID]
                );
                // Insert players
                await pool.query(
                    'INSERT IGNORE INTO players (pid, name) VALUES ?',
                    [data.PlayersWhoContributed.map(player => [player.PlayerID, player.PlayerName])]
                );

                // Insert participation
                await pool.query(
                    'INSERT INTO participation (pid, ssid) VALUES ?',
                    [data.PlayersWhoContributed.map(player => [player.PlayerID, data.StarSystemID])]
                );
                return callback({
                    status: 2
                });
        }
    } catch (error) {
        return callback({
            status: 0,
            error
        });
    }

}

/**
 *
 * @param dateString
 * @returns String
 */
function formatDate(dateString) {
    return dateString.slice(0, 19).replace('T', ' ');
}

async function report(season, stat) {

    await pool.query('use hs_log');
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

function connect(callback) {
    pool.getConnection(async (err, connection) => {
        if (err) throw err;
        console.log("Connected to the DB successfully!");
        await setup();
        console.log("DB setup completed!");
        callback();
        connection.release();
    });
}

module.exports = {
    log,
    report,
    query: pool.query,
    connect
};
