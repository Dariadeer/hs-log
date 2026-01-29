// Constants
const EVENT_37_START = 1745625600000; // Timestamp for the start of event #37
const INTERVAL_MS = 4 * 7 * 24 * 60 * 60 * 1000; // 4 weeks in milliseconds
const EVENT_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

/**
 * Returns the number of the most recent event that has already started (or is ongoing).
 * @param {number} currentTime - Current timestamp in milliseconds.
 * @returns {number} The last event number.
 */
function getLastEventNumber(currentTime) {
    const timeSinceEvent37 = currentTime - EVENT_37_START;
    const intervalsSinceEvent37 = Math.floor(timeSinceEvent37 / INTERVAL_MS);
    const lastEventNumber = 37 + intervalsSinceEvent37;
    return lastEventNumber;
}

/**
 * Returns the start and end timestamps (in milliseconds) of the specified event.
 * @param {number} eventNumber - The event number to calculate the timeframe for.
 * @returns {[number, number]} An array where [0] = start time, [1] = end time.
 */
function getEventTimeframe(eventNumber) {
    const startTime = EVENT_37_START + (eventNumber - 37) * INTERVAL_MS;
    const endTime = startTime + EVENT_DURATION_MS;
    return [startTime, endTime];
}

function isRSEvent(time) {
    const timeframe = getEventTimeframe(getLastEventNumber(time));
    return timeframe[1] >= time;
    // return true;
}

function capitalizeFirstLetter(str) {
    return str.slice(0, 1).toUpperCase() + str.slice(1);
}

module.exports = {
    getEventTimeframe,
    getLastEventNumber,
    isRSEvent,
    capitalizeFirstLetter
}

console.log(getEventTimeframe(41));