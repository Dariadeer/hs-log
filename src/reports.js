const stats = {
    0: {
        name: 'score',
        color: '#ff6060',
        query: 'CAST(SUM(s.rs_points / NULLIF(s.players, 0)) AS UNSIGNED)',
        type: 0
    },
    1: {
        name: 'time',
        color: '#60ff60',
        query: 'SUM(CAST(TIME_TO_SEC(TIMEDIFF(s.rs_end, s.rs_start)) AS UNSIGNED))',
        type: 1
    },
    2: {
        name: 'runs',
        color: '#6060ff',
        query: 'COUNT(s.ssid)',
        type: 2
    },
    3: {
        name: 'score/time',
        color: '#ffff60',
        query: 'CAST(SUM(s.rs_points / NULLIF(s.players, 0)) AS UNSIGNED)/SUM(CAST(TIME_TO_SEC(TIMEDIFF(s.rs_end, s.rs_start)) AS UNSIGNED))*60',
        type: 0
    },
    4: {
        name: 'score/run',
        color: '#ff60ff',
        query: 'CAST(SUM(s.rs_points / NULLIF(s.players, 0)) AS UNSIGNED)/COUNT(s.ssid)',
        type: 0
    },
    5: {
        name: 'time/run',
        color: '#60ffff',
        query: 'SUM(CAST(TIME_TO_SEC(TIMEDIFF(s.rs_end, s.rs_start)) AS UNSIGNED))/COUNT(s.ssid)',
        type: 1
    },
}

module.exports = {
    stats
}