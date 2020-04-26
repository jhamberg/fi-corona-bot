const Discord = require("discord.js");
const _ = require("lodash");
const i18n = require("../i18n");
const state = require("../state");
const logger = require("../logger");

async function start(token) {
    const bot = new Discord.Client();
    const prefix = "!";
    await bot.login(token);
    const getResponse = i18n.create({
        prefix,
        lineBreak: "\n"
    });

    bot.on("message", async (message) => {
        // Ignore normal messages
        if (!message.content.startsWith(prefix)) {
            return;
        }

        let args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();

        const chatId = message.channel.id;
        let lang = _.get(state, `consumers.discord.chat.${chatId}.lang`, "en");
        if (i18n.shouldUpdateLanguage(command, args)) {
            lang = i18n.getLanguage(args[0]);
            args = [lang];
            _.setWith(state, `consumers.discord.chat.${chatId}.lang`, lang, Object);
            await state.save();
        }

        const response = getResponse(command, args, lang);
        const channel = await bot.channels.cache.get(chatId);
        channel.send(response);
    });

    logger.info("Discord bot ready!");
}

module.exports = { start }; 