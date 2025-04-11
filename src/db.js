const {DB_HOST, DB_USER, DB_PASSWORD, DB_PORT} = process.env;
const mysql = require('mysql2');
const util = require('util');
const path = require('path');
const fs = require('fs');

const utils = require('./utils');

const DB_SETUP_PATH = path.resolve(__dirname, '../resources/db_setup.sql');

const connection = mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT
});

// we do this to use async await with mysql (see: https://stackoverflow.com/questions/50093144/using-async-await-with-a-mysql-database)
connection.query = util.promisify(connection.query).bind(connection);

module.exports = connection;

async function setup() {
    const queries = fs.readFileSync(DB_SETUP_PATH).toString().split(';');
    for(let query of queries) {
        try {
            await connection.query(query);
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
                await connection.query(
                    'INSERT INTO stars (ssid, rs_level, drs, rs_start) VALUES (?, ?, ?, ?)',
                    [data.StarSystemID, data.StarLevel, data.DarkRedStar, formatDate(data.Timestamp)]
                );
                return callback({
                    status: 1
                });
            case 'RedStarEnded':
                await connection.query(
                    'UPDATE stars SET rs_end = ?, rs_points = ?, players = ? WHERE ssid = ?',
                    [formatDate(data.Timestamp), data.RSEventPoints, data.PlayersWhoContributed.length, data.StarSystemID]
                );
                // Insert players
                await connection.query(
                    'INSERT IGNORE INTO players (pid, name) VALUES ?',
                    [data.PlayersWhoContributed.map(player => [player.PlayerID, player.PlayerName])]
                );

                // Insert participation
                await connection.query(
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

async function report(season) {

    await connection.query('use hs_log');
    const [start, end] = utils.getEventTimeframe(season);
    const formattedStart = new Date(start).toISOString();
    const formattedEnd = new Date(end).toISOString();

    const results = await connection.query(`
        SELECT 
          p.pid,
          p.name,
          CAST(SUM(s.rs_points / NULLIF(s.players, 0)) AS UNSIGNED) AS total_adjusted_score,
          COUNT(DISTINCT s.ssid) AS runs_participated,
          CAST(SUM(s.rs_points) AS UNSIGNED) AS raw_total_score,
          SUM(CAST(TIME_TO_SEC(TIMEDIFF(s.rs_end, s.rs_start)) AS UNSIGNED)) AS total_time_spent
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
          total_adjusted_score DESC
  `, [formattedStart, formattedEnd]);
    return results;
}

function connect(callback) {
    connection.connect(async err => {
        if (err) throw err;
        console.log("Connected to the DB successfully!");
        await setup();
        console.log("DB setup completed!");
        callback();
    });
}

module.exports = {
    log,
    report,
    query: connection.query,
    connect
};
