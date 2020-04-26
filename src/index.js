// https://github.com/yagop/node-telegram-bot-api/issues/319#issuecomment-324963294
process.env["NTBA_FIX_319"] = 1;

const dotenv = require("dotenv");
const logger = require("./logger");
const helpers = require("./helpers");
const jsonStat = require("./jsonStat");
const crawler = require("./crawler");
const telegram  = require("./consumers/telegram");
const discord = require("./consumers/discord");
const state = require("./state");
const { createMethods } = require("./methods");

dotenv.config();

function createUpdater(methods) {
    return async function update() {
        logger.info("Updating data...");
        const results = await Promise.all([
            methods.getStats(),
            methods.getDemographics(),
            methods.getMunicipalities(),
            methods.getDailyStats(),
            methods.getHealthcareDistricts(),
            methods.getPatientStats()
        ]);
        return results.every(Boolean);
    };
}

async function main() {
    await state.initialize();

    const api = jsonStat.createAPI("https://sampo.thl.fi/pivot/prod/en/epirapo/covid19case/fact_epirapo_covid19case.json");
    const methods = createMethods(api, crawler);
    const update = createUpdater(methods);

    while (true) {
        logger.info("Initializing...");
        const success = await update();
        if (success) {
            break;
        }
        logger.error("Initialization failed");
        logger.info("Trying again in 30 seconds...");
        await helpers.sleep(30 * 1000);
    }

    logger.info("State initialized");
    setInterval(update, state.updateInterval);

    if (process.env.TELEGRAM_API_TOKEN) {
        await telegram.start(process.env.TELEGRAM_API_TOKEN);
    }

    if (process.env.DISCORD_API_TOKEN) {
        await discord.start(process.env.DISCORD_API_TOKEN);
    }
}

main();