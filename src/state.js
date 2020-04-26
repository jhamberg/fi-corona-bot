const fs = require("fs");
const logger = require("./logger");
const helpers = require("./helpers");

const file = "./state.json";
let state = {};

async function exists(file) {
    try {
        await fs.promises.stat(file);
        return true;
    } catch (error) {
        return false;
    }
}

state.initialize = async () => {
    state.updateInterval = helpers.parseInt(process.env.UPDATE_INTERVAL_MILLIS, 5 * 60 * 1000);

    logger.info("Loading old state from disk");
    if (await exists(file)) {
        const text = await fs.promises.readFile(file);
        const data = JSON.parse(text);
        Object.assign(state, data);
    } else {
        await fs.promises.writeFile(file, "{}");
    }
};

state.save = async () => {
    const data = {
        consumers: state.consumers
    };
    try {
        // This should protect against unexpected termination while writing
        await fs.promises.rename(file, `${file}.backup`);
        await fs.promises.writeFile(file, JSON.stringify(data, null, 2));
        await fs.promises.unlink(`${file}.backup`);
    } catch (error) {
        logger.error("Failed persisting state!");
        logger.error(error);
    }
};

module.exports = state;