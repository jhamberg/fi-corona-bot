// https://github.com/yagop/node-telegram-bot-api/issues/319#issuecomment-324963294
process.env["NTBA_FIX_319"] = "1";

import dotenv from "dotenv";
import pino from "pino";
import { Bot } from "./types";
import TelegramBot from "./components/TelegramBot";
import Commands from "./components/Commands";
import Updater from "./components/Updater";

async function init(): Promise<void> {
    dotenv.config();

    const logger = pino({ prettyPrint: true });
    const bots: Map<string, Bot> = new Map();
    const commands = new Commands(logger);

    const telegramToken = process.env.TELEGRAM_API_TOKEN;
    if (telegramToken) {
        const telegramBot = new TelegramBot(telegramToken, commands);
        bots.set(telegramBot.id, telegramBot);
    }

    const updater = await Updater.create(logger, 5 * 60 * 1000, bots);
    updater.start();
}

init();