
import TBot from "node-telegram-bot-api";
import { Bot, Message } from "../types";
import Commands from "./Commands";
import { Logger } from "pino";

class TelegramBot implements Bot {
    bot: TBot;
    id: string;
    name: string;
    prefix: string;
    commands: Commands;

    constructor(token: string, commands: Commands ) {
        this.bot = new TBot(token, { polling: true });
        this.id = "telegram";
        this.prefix = "/";
        this.commands = commands;
    }

    async setup(): Promise<void> {
        const user = await this.bot.getMe();
        const username = user.username.toLowerCase();

        this.bot.on("message", async (msg) => {
            const prefixedWithSlash = msg?.text?.startsWith(this.prefix);
            if (!prefixedWithSlash) {
                return;
            }

            const args = msg.text.slice(this.prefix.length).trim().split(/ +/g);
            const command: string = args.shift().toLowerCase().replace(`@${username}`, "");

            // Exit early if some other bot was mentioned
            if (command.includes("@")) {
                return;
            }

            const chat = this.id + "|" + msg.chat.id;
            const response = await this.commands.execute(command, args, chat);
            if (response?.text) {
                this.send(msg.chat.id, response);
            }
        });
    }

    static async create(token: string, commands: Commands, logger?: Logger): Promise<Bot> {
        const bot = new TelegramBot(token, commands);
        await bot.setup();
        logger?.info("Telegram bot online");
        return bot;
    }

    format(message: Message): string {
        return message.text.replace("{!/}", this.prefix);
    }

    send(id: number, message: Message): void {
        /* eslint-disable @typescript-eslint/camelcase */
        this.bot.sendMessage(id, this.format(message), {
            parse_mode: "Markdown",
            disable_web_page_preview: false
        });
    }
}


export default TelegramBot;