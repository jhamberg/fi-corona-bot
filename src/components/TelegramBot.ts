
import TBot from "node-telegram-bot-api";
import { Bot, Message } from "../types";
import Commands from "./Commands";

class TelegramBot implements Bot {
    #bot: TBot;
    id: string;

    constructor(token: string, commands: Commands ) {
        const prefix = "/";
        this.#bot = new TBot(token, { polling: true });
        this.id = "telegram";

        this.#bot.on("message", async (msg) => {
            const prefixedWithSlash = msg?.text?.startsWith(prefix);
            if (!prefixedWithSlash) {
                return;
            }

            const args = msg.text.slice(prefix.length).trim().split(/ +/g);
            const command = args.shift().toLowerCase();
            // const chat = { service: this.id, id: id };
            const chat = this.id + "|" + msg.chat.id;
            const response = await commands.execute(command, args, chat);
            if (response?.text) {
                this.send(msg.chat.id, response);
            }
        });
    }

    static async create(token: string, commands: Commands): Promise<TelegramBot> {
        return new TelegramBot(token, commands);
    }

    send(id: number, message: Message): void {
        /* eslint-disable @typescript-eslint/camelcase */
        this.#bot.sendMessage(id, message.text, {
            parse_mode: "Markdown",
            disable_web_page_preview: true
        });
    }
}


export default TelegramBot;