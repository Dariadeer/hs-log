require('dotenv').config({
    path: '.env'
});
console.log(process.env.DB_HOST);

const db = require('./db');



db.connect(createVerdict);

async function createVerdict() {
    const data = await db.query(`select 
        sum(cast(time_to_sec(timediff(rs_end, rs_start)) as unsigned) * players) as total_time,
        sum(rs_points) as total_points
        from stars
        where rs_start > '2025-04-26 00:00:00' and rs_end < '2025-04-28 00:00:00'`);
    console.log(((parseInt(data[0].total_time) / 360) | 0) / 10);
}