// https://github.com/yagop/node-telegram-bot-api/issues/319#issuecomment-324963294
process.env["NTBA_FIX_319"] = "1";

import TelegramBot from "node-telegram-bot-api";
import { List, Map } from "immutable";
import axios, { AxiosResponse } from "axios";
import state, { Filter, Chat } from "./state";
import pino from "pino";
import dotenv from "dotenv";

const logger = pino({ prettyPrint: true });
const subscriptions = state?.subscriptions?.count() ?? 0;
logger.info(`Started up with ${subscriptions} subscriptions`);

// Load env variables
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_API_TOKEN, { polling: true });
const interval = Number(process.env.UPDATE_INTERVAL || 5000); //5 * 60 * 1000 /* 5 minutes */);
const api = "https://w3qa5ydb4l.execute-api.eu-west-1.amazonaws.com/prod/finnishCoronaData";
const prefix = "/";

const commands = Map()
    .set("today", "show cases today")
    .set("status", "show overall status")
    .set("report", "setup automatic reports")
    .set("help", "display this text")
    .set("about", "show about");

const commandList = commands
    .map((description, command) => `/${command} - ${description}`)
    .join("\n");

interface Case {
    infectionSource: "unknown" | number;
    infectionSourceCountry: string;
}

interface RecoveryCase extends Case {
    id: number;
    date: string;
    healthCareDistrict: string;
}

interface RawInfectionCase extends Case {
    id: string;
    date: string;
    healthCareDistrict: string;
}

interface InfectionCase extends Case {
    id: number;
    date: number;
    healthCareDistrict: string;
}

interface ApiResponse {
    confirmed: Array<RawInfectionCase>;
    recovered: Array<RecoveryCase>;
    deaths: Array<Case>;
}

function pluralize(singular, count): string {
    return singular + (count > 1 ? "s" : "");
}

function send(chat, message): void {
    bot.sendMessage(chat, message, {
        // eslint-disable-next-line @typescript-eslint/camelcase
        parse_mode: "Markdown",
        // eslint-disable-next-line @typescript-eslint/camelcase
        disable_web_page_preview: true
    });
}

updateState();
setInterval(updateState, interval);

function announce(filter: Filter, chat: Chat): void {
    const diff = state.last - filter.last;
    if (diff >= filter.every) {
        send(chat, `🦠 *${diff}* new ${pluralize("case", diff)}!`);
        filter.last = state.last;
        state.subscriptions.set(chat, filter);
    }
}

async function updateState(): Promise<void> {
    const response: AxiosResponse<ApiResponse> = await axios.get(api);
    const confirmed = response?.data?.confirmed;
    const recovered = response?.data?.recovered;
    if (!confirmed || !recovered) {
        logger.error("API is offline or returning incomplete data!");
        return;
    }

    // Convert cases to a more convenient format
    const infections: List<InfectionCase> = List(confirmed).map(event => ({
        ...event,
        id: Number(event.id),
        date: Date.parse(event.date)
    }));

    const previousId = state.last ?? 0;
    const latest = infections.maxBy(inf => inf.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    const dayBefore = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    dayBefore.setDate(today.getDate() - 2);

    const casesToday = infections
        .filter(inf => inf.date >= today.getTime());
    const casesYesterday = infections
        .filter(inf => inf.date > yesterday.getTime() && inf.date < today.getTime());
    const casesDayBefore = infections
        .filter(inf => inf.date > dayBefore.getTime() && inf.date < yesterday.getTime());

    const districtsToday = casesToday
        .groupBy(inf => inf.healthCareDistrict)
        .map(cases => cases.count())
        .map((count, district) => `${district}: ${count}`)
        .join("\n");

    const districtsRecovered = List(recovered)
        .groupBy(inf => inf.healthCareDistrict)
        .map(cases => cases.count());

    const districtsTotal = infections
        .groupBy(inf => inf.healthCareDistrict)
        .toMap()
        .map(cases => cases.count())
        .mergeWith((sick, recovered) => sick - recovered, districtsRecovered)
        .filter(cases => cases > 0)
        .sort()
        .reverse()
        .map((count, district) => `${district}: ${count}`)
        .join("\n");

    // Announce new cases
    if (latest.id - previousId > 0) {
        state.last = latest.id;
        state.subscriptions.forEach(announce);
    }

    state.today = casesToday.count();
    state.yesterday = casesYesterday.count();
    state.dayBefore = casesDayBefore.count();
    state.recovered = recovered.length;
    state.total = confirmed.length - recovered.length;
    state.districtsToday = districtsToday;
    state.districtsTotal = districtsTotal;
    await state.persist();
}

bot.on("message", (msg) => {
    const prefixedWithSlash = msg?.text?.startsWith(prefix);
    if (!prefixedWithSlash) {
        return;
    }

    const chat = msg.chat.id;
    const args = msg.text.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    switch (command) {
        case "today":
            return today(chat);
        case "status":
            return overall(chat);
        case "report":
            return report(chat, args);
        case "about":
            return send(chat,
                "*About:*\n" +
                "The bot uses data from the [public coronavirus dataset]" +
                "(https://github.com/HS-Datadesk/koronavirus-avoindata) by HS.fi.\n\n" +
                "The data provided is for indicative purposes only. The service is provided " +
                "\"as-is\", \"with all faults\" and \"as available\". There are no guarantees " +
                "for the accuracy or timeliness of information available from the service."
            );
        default:
            return send(chat, `*Usage:*\n${commandList}`);
    }
});

function overall(chat): void {
    logger.info(`[${chat}] checking overall status`);
    send(chat,
        `*Status:*\n` +
        `🦠 *${state.total}* active cases\n` +
        `💉 *${state.recovered}* recoveries\n\n` +
        `*Healthcare Districts*:\n` +
        `${state.districtsTotal}`
    );
}

function today(chat): void {
    logger.info(`[${chat}] checking today's status`);
    if (state.today === 0) {
        return send(chat,  "🦠 No cases today!");
    }

    send(chat,
        `*Status:*\n` +
        `🦠 *${state.today}* new ${pluralize("case", state.today)} today!\n\n` +
        `*Healthcare Districts*:\n` +
        `${state.districtsToday}\n\n` +
        `Yesterday there were ${state.yesterday} ${pluralize("case", state.today)}.\n` +
        `The growth factor was ${(state.yesterday / state.dayBefore).toFixed(2)}.`
    );
}

function report(chat, args): void {
    const usage =
        "*Selection:*\n" +
        "all - report all new cases\n" +
        "N - report every N new cases\n" +
        "stop - stop notifications\n\n" +
        "Usage: /report <filter>";

    const option = args?.[0];
    const isNumber = !isNaN(option);
    if (!option) {
        return send(chat, usage);
    }

    if (option === "all" || isNumber) {
        const every = isNumber ? Number(option) : 1;
        if (every <= 0) {
            send(chat, "❌ Number must be larger than zero!");
            return;
        }

        const filter: Filter = { every, last: state.last };
        state.subscriptions = state.subscriptions.set(chat, filter);
        const howOften = every === 1
            ? "all"
            : `every ${every}`;

        logger.info(`[${chat}] subscribed ${howOften} new cases`);
        return send(chat, `✔️ Ok! I will report *${howOften}* new cases.`);
    }

    if (option === "stop") {
        state.subscriptions = state.subscriptions.remove(chat);
        logger.info(`[${chat}] stopped all notrifications`);
        return send(chat, `🚫 Stopped all notifications.`);
    }

    send(chat, "⚠️ Unknown option!");
    send(chat, usage);
}