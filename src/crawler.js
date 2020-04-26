const { performance } = require("perf_hooks");
const axios = require("axios");
const { JSDOM } = require("jsdom");
const flows = require("./flows");
const helpers = require("./helpers");
const logger = require("./logger");

const url = "https://thl.fi/fi/web/infektiotaudit-ja-rokotukset/ajankohtaista/ajankohtaista-" +
    "koronaviruksesta-covid-19/tilannekatsaus-koronaviruksesta";

const translations = {
    yhteensa: "all",
    sairaalahoidossa: "hospitalized",
    osasto: "ward",
    teho: "icu",
    kuolleet: "deaths"
};

async function crawlPatients() {
    const begin = performance.now();
    const { data: html } = await axios(url);
    const dom = new JSDOM(html);
    const { document } = dom.window;
    const [table] = document.body.getElementsByTagName("table");
    const [bodies] = table.tBodies;
    const [body] = bodies.rows;

    const letters = /([a-z]+)/i;
    const names = [...body.cells].map(({ textContent }) => {
        const [, name] = textContent.toLowerCase().match(letters);
        return name;
    });

    const result = {};
    for (let x = 1; x < table.rows.length; x++) {
        const { cells } = table.rows[x];
        const [area] = cells;
        const values = {};

        for (let y = 1; y < cells.length; y++) {
            const value = cells[y];
            const column = translations[names[y]];
            values[column] = parseInt(value.textContent);
        }
        const [, row] = helpers.removeDiacritics(area.textContent)
            .toLowerCase()
            .match(letters);
        const key = translations[row] || row; 
        result[key] = values;
    }

    const elapsed = (performance.now() - begin).toFixed(2);
    logger.debug(`Crawling patient stats took ${elapsed} ms`);
    
    try {
        result.date = flows.findDate(document.body.getElementsByTagName("i"));
    } catch (error) {
        logger.warn("Failed crawling date for patient stats");
        logger.warn(error);
        result.date = new Date().toISOString();
    }

    return result;
}

module.exports = { crawlPatients };