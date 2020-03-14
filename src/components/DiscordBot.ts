
import Discord from "discord.js";
import { Bot, Message } from "../types";
import Commands from "./Commands";

class DiscordBot implements Bot {
    #bot: Discord.Client;
    #token: string;
    id: string;

    private constructor(token: string, commands: Commands) {
        const prefix = "/";
        this.#bot = new Discord.Client();
        this.#token = token;
        this.id = "discord";

        this.#bot.on("message", async (msg) => {
            const prefixedWithSlash = msg?.content?.startsWith(prefix);
            if (!prefixedWithSlash) {
                return;
            }

            const args = msg.content.slice(prefix.length).trim().split(/ +/g);
            const command = args.shift().toLowerCase();
            // const chat = { service: this.id, id: id };
            const chat = this.id + "|" + msg.channel.id;
            const response = await commands.execute(command, args, chat);
            if (response?.text) {
                this.send(msg.channel.id, response);
            }
        });
    }

    async login(): Promise<void> {
        const promise: Promise<void> = new Promise(resolve => this.#bot.on("ready", resolve));
        this.#bot.login(this.#token);
        return promise;
    }

    static async create(token: string, commands: Commands): Promise<Bot> {
        const instance = new DiscordBot(token, commands);
        await instance.login();
        return instance;
    }

    async send(id: string, message: Message): Promise<void> {
        const channel = await this.#bot.channels.cache.get(id) as Discord.TextChannel;
        channel?.send(message.text.replace(/\*/g, "**"));
    }
}


export default DiscordBot;