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
            .set("today", { description: "Show cases today", run: this.today.bind(this) })
            .set("status", { description: "Show a summary", run: this.status.bind(this) })
            .set("notify", { description: "Setup notifications", run: this.report.bind(this) })
            .set("about", { description: "Show about", run: this.about.bind(this) })
            .set("help", { description: "Show this text", run: this.help.bind(this) });
    }

    private async about(): Promise<Message> {
        return {
            text: "*About:*\n" +
            "The chatbot uses data from the public coronavirus dataset by HS.fi. " +
            "You can view the source code on Github:\n" +
            "https://github.com/jhamberg/fi-corona-bot\n\n" +
            "The data provided is for indicative purposes only. The service is " +
            "provided \"as-is\", \"with all faults\" and \"as available\". There are " +
            "no guarantees for the accuracy or timeliness of information available " +
            "from the service."
        };
    }

    private async status(chat: string): Promise<Message> {
        this.logger.info(`[${chat}] checking overall status`);
        return {
            text: `*Summary*:\n` +
                `🦠 *${state.total}* active cases\n` +
                `🏥 *${state.totalRecovered}* recoveries\n` +
                `☠️ *${state.totalDeaths}* ${pluralize("death", state.totalDeaths)}\n\n` +
                `*Healthcare Districts*:\n` +
                `${state.districtsTotal}`
        };
    }

    private async today(chat: string): Promise<Message> {
        this.logger.info(`[${chat}] checking today's status`);

        // TODO: What if there are recoveries or deaths?
        if (state.today === 0) {
            return { text: "🦠 No cases reported yet!" };
        }

        return {
            text: `*Today*:\n` +
                `🦠 *${state.today}* new ${pluralize("case", state.today)}\n` +
                `🏥 *${state.recoveries}* recov${state.recoveries === 1 ? "ery" : "eries"}\n` +
                `☠️ *${state.deaths}* ${pluralize("death", state.deaths)}\n\n` +
                `*Healthcare Districts*:\n` +
                `${state.districtsToday}\n\n` +
                `{!/}status - Show all`
        };
    }

    private async report(chat: string, args): Promise<Message> {
        const usage =
            "*Select an option:*\n" +
            "all - Report all cases\n" +
            "n - Report every n cases\n" +
            "stop - Stop notifications\n\n" +
            "Usage: {!/}notify <option>";

        const option = args?.[0];
        const isNumber = !isNaN(option);
        if (!option) {
            return { text: usage };
        }

        if (option === "all" || isNumber) {
            const every = isNumber ? Number(option) : 1;
            if (every <= 0) {
                return { text: "Number must be larger than zero." };
            }

            const filter: Filter = { every, last: state.last };
            state.subscriptions = state.subscriptions.set(chat, filter);
            const howOften = every === 1
                ? "all"
                : `every ${every}`;

            this.logger.info(`[${chat}] subscribed ${howOften} new cases`);
            state.persist();
            return { text: `Reporting *${howOften}* new cases.` };
        }

        if (option === "stop") {
            state.subscriptions = state.subscriptions.remove(chat);
            this.logger.info(`[${chat}] stopped all notifications`);
            state.persist();
            return { text: `Stopped all notifications.` };
        }

        return { text: usage };
    }

    private async help(chat: string): Promise<Message> {
        const [service] = chat.split("|");
        const prefix = service === "telegram" ? "/" : "!";

        const list = this.commands
            .map((command, name) => `${prefix}${name} - ${command.description}`)
            .join("\n");
        return { text: `*Usage:*\n${list}` };
    }

    async execute(command: string, args: Array<string>, chat: string): Promise<Message> {
        if (!this.commands.has(command)) {
            return this.help(chat);
        }

        return this.commands.get(command).run(chat, args);
    }
}

export default Commands;