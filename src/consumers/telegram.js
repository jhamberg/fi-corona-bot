const TelegramBot = require("node-telegram-bot-api");
const _ = require("lodash"); 
const logger = require("../logger");
const state = require("../state");
const i18n = require("../i18n");

async function start(token) {
    const bot = new TelegramBot(token, { polling: true });
    const prefix = "/";
    const { username } = await bot.getMe();
    const botName = username.toLowerCase();
    const getResponse = i18n.create({
        bold: (message) => `*${message}*`,
        prefix
    });

    bot.on("message", async (message) => {
        // Ignore normal messages
        if (!message.text.startsWith(prefix)) {
            return;
        }

        let args = message.text.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase().replace(`@${botName}`, "");

        // Ignore commands directed at other bots
        if (command.includes("@")) {
            return;
        }

        const chatId = message.chat.id;
        let lang = _.get(state, `consumers.telegram.chat.${chatId}.lang`, "en");
        if (i18n.shouldUpdateLanguage(command, args)) {
            lang = i18n.getLanguage(args[0]);
            args = [lang];
            _.setWith(state, `consumers.telegram.chat.${chatId}.lang`, lang, Object);
            await state.save();
        }

        const response = getResponse(command, args, lang);
        bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
    });

    logger.info("Telegram bot ready!");
}

module.exports = { start };