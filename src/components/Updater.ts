import axios, { AxiosResponse } from "axios";
import { Map, List } from "immutable";
import { Logger } from "pino";
import { pluralize, parseCase } from "../helpers";
import { Bot, RawCase, Case } from "../types";
import state, { Filter } from "../state";

interface ApiResponse {
    confirmed: Array<RawCase>;
    recovered: Array<RawCase>;
    // deaths: Array<Case>;
}

class Updater {
    logger: Logger;
    api: string;
    interval: number;
    timer: NodeJS.Timeout;
    bots: Map<string, Bot>;

    private constructor(logger, interval, bots) {
        this.api = "https://w3qa5ydb4l.execute-api.eu-west-1.amazonaws.com/prod/finnishCoronaData";
        this.logger = logger;
        this.interval = interval;
        this.bots = bots;
    }

    static async create(logger, interval, bots): Promise<Updater> {
        const instance = new Updater(logger, interval, bots);
        await instance.updateState();
        return instance;
    }

    start(): void {
        this.timer = setInterval(this.updateState.bind(this), this.interval);
    }

    stop(): void {
        clearInterval(this.timer);
    }

    private async updateState(): Promise<void> {
        const response: AxiosResponse<ApiResponse> = await axios.get(this.api);
        const confirmed = response?.data?.confirmed;
        const recovered = response?.data?.recovered;
        if (!confirmed || !recovered) {
            this.logger.error("API is offline or returning incomplete data!");
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
            state.subscriptions.forEach(this.announce.bind(this));
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

    announce(filter: Filter, chat: string): void {
        const diff = state.last - filter.last;
        if (diff >= filter.every) {
            const [service, id] = chat.split("|");
            const bot = this.bots.get(service);
            bot.send(id, { text: `🦠 *${diff}* new ${pluralize("case", diff)}!` });

            filter.last = state.last;
            state.subscriptions.set(chat, filter);
        }
    }
}

export default Updater;