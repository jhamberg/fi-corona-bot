import { Message } from "../types";
import { Logger } from "pino";
import { Map } from "immutable";
import { pluralize } from "../helpers";
import state, { Filter } from "../state";

interface Commands {
    execute(command: string, args: Array<string>, chat: string): Promise<Message>;
}

type Command = {
    description: string;
    run: (chat?, ...args) => Promise<Message>;
};

class Commands implements Commands {
    logger: Logger;
    commands: Map<string, Command>;

    constructor(logger) {
        this.logger = logger;
        this.commands = Map<string, Command>()
            .set("today", { description: "show cases today", run: this.today.bind(this) })
            .set("status", { description: "show a summary", run: this.status.bind(this) })
            .set("notify", { description: "setup notifications", run: this.report.bind(this) })
            .set("about", { description: "show about", run: this.about.bind(this) })
            .set("help", { description: "show this text", run: this.help.bind(this) });
    }

    private async about(): Promise<Message> {
        return {
            text: "📖 *About:*\n" +
                "The bot uses data from the [public coronavirus dataset]" +
                "(https://github.com/HS-Datadesk/koronavirus-avoindata) by HS.fi.\n\n" +
                "The data provided is for indicative purposes only. The service is " +
                "provided \"as-is\", \"with all faults\" and \"as available\". There are " +
                "no guarantees for the accuracy or timeliness of information available " +
                "from the service."
        };
    }

    private async status(chat: string): Promise<Message> {
        this.logger.info(`[${chat}] checking overall status`);
        return {
            text: `🦠 *${state.total}* reported cases in total\n` +
                `💉 *${state.totalRecovered}* reported recoveries\n\n` +
                `*Healthcare Districts*:\n` +
                `${state.districtsTotal}`
        };
    }

    private async today(chat: string): Promise<Message> {
        this.logger.info(`[${chat}] checking today's status`);
        if (state.today === 0) {
            return { text: "🦠 No cases today!" };
        }

        return {
            text: `🦠 *${state.today}* reported ${pluralize("case", state.today)} today\n` +
                `💉 *${state.recoveries}* reported ` +
                `recov${state.recoveries === 1 ? "ery" : "eries"}\n\n` +
                `*Healthcare Districts*:\n` +
                `${state.districtsToday}\n\n` +
                `Yesterday there were *${state.yesterday}* ${pluralize("case", state.today)}.\n` +
                `The growth factor was *${(state.yesterday / state.dayBefore).toFixed(2)}*.`
        };
    }

    private async report(chat: string, args): Promise<Message> {
        const usage =
            "🔔 *How often?*\n" +
            "all - all new cases\n" +
            "N - every N cases\n" +
            "stop - stop notifications\n\n" +
            "Usage: /report <option>";

        const option = args?.[0];
        const isNumber = !isNaN(option);
        if (!option) {
            return { text: usage };
        }

        if (option === "all" || isNumber) {
            const every = isNumber ? Number(option) : 1;
            if (every <= 0) {
                return { text: "❌ Number must be larger than zero!" };
            }

            const filter: Filter = { every, last: state.last };
            state.subscriptions = state.subscriptions.set(chat, filter);
            const howOften = every === 1
                ? "all"
                : `every ${every}`;

            this.logger.info(`[${chat}] subscribed ${howOften} new cases`);
            state.persist();
            return { text: `✅ Reporting *${howOften}* new cases.` };
        }

        if (option === "stop") {
            state.subscriptions = state.subscriptions.remove(chat);
            this.logger.info(`[${chat}] stopped all notifications`);
            state.persist();
            return { text: `🚫 Stopped all notifications.` };
        }

        return { text: usage };
    }

    private async help(): Promise<Message> {
        const list = this.commands
            .map((command, name) => `/${name} - ${command.description}`)
            .join("\n");
        return { text: `🦠 *Usage:*\n${list}` };
    }

    async execute(command: string, args: Array<string>, chat: string): Promise<Message> {
        if (!this.commands.has(command)) {
            return this.help();
        }

        return this.commands.get(command).run(chat, args);
    }
}

export default Commands;