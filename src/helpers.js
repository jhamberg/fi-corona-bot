function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseInt(str, defaultValue) {
    const num = Number(str);
    return Number.isInteger(num)
        ? num
        : defaultValue;
}

function roundToNearest(date, interval) {
    const millis = date.getTime();
    const rounded = Math.floor(millis / interval) * interval;
    return new Date(rounded);
}

module.exports = { sleep, removeDiacritics, parseInt, roundToNearest };