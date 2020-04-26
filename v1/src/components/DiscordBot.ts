
import Discord from "discord.js";
import { Bot, Message } from "../types";
import Commands from "./Commands";
import { Logger } from "pino";

class DiscordBot implements Bot {
    bot: Discord.Client;
    token: string;
    id: string;
    prefix: string;

    private constructor(token: string, commands: Commands) {
        this.prefix = "!";
        this.bot = new Discord.Client();
        this.token = token;
        this.id = "discord";

        this.bot.on("message", async (msg) => {
            const prefixedWithSlash = msg?.content?.startsWith(this.prefix);
            if (!prefixedWithSlash) {
                return;
            }

            const args = msg.content.slice(this.prefix.length).trim().split(/ +/g);
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
        const promise: Promise<void> = new Promise(resolve => this.bot.on("ready", resolve));
        this.bot.login(this.token);
        return promise;
    }

    static async create(token: string, commands: Commands, logger?: Logger): Promise<Bot> {
        const instance = new DiscordBot(token, commands);
        await instance.login();
        logger?.info("Discord bot online");
        return instance;
    }

    format(message: Message): string {
        return message.text
            .replace(/\*/g, "**") // Discord uses double asterisk for bold
            .replace("{!/}", this.prefix);
    }

    async send(id: string, message: Message): Promise<void> {
        const channel = await this.bot.channels.cache.get(id) as Discord.TextChannel;
        channel?.send(this.format(message));
    }
}


export default DiscordBot;