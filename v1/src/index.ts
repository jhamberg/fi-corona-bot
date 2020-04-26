// https://github.com/yagop/node-telegram-bot-api/issues/319#issuecomment-324963294
process.env["NTBA_FIX_319"] = "1";

import dotenv from "dotenv";
import pino from "pino";
import TelegramBot from "./components/TelegramBot";
import Commands from "./components/Commands";
import Updater from "./components/Updater";
import DiscordBot from "./components/DiscordBot";

async function init(): Promise<void> {
    dotenv.config();

    const logger = pino({ prettyPrint: true });
    const commands = new Commands(logger);

    const telegramToken = process.env.TELEGRAM_API_TOKEN;
    const discordToken = process.env.DISCORD_API_TOKEN;

    const bots = await Promise.all([
        telegramToken ? TelegramBot.create(telegramToken, commands, logger) : null,
        discordToken  ? DiscordBot.create(discordToken, commands, logger) : null
    ]);

    const botMap = bots
        .filter(x => x)
        .reduce((map, bot) => map.set(bot.id, bot), new Map());

    const updater = await Updater.create(logger, 5 * 60 * 1000, botMap);
    updater.start();
}

init();