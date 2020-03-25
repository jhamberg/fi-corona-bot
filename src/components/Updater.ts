import axios, { AxiosResponse } from "axios";
import { Map, List } from "immutable";
import { Logger } from "pino";
import { pluralize, parseCase } from "../helpers";
import { Bot, RawCase, Case } from "../types";
import state, { Filter } from "../state";

interface ApiResponse {
    confirmed: Array<RawCase>;
    recovered: Array<RawCase>;
    deaths: Array<RawCase>;
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
        this.logger.info("Downloading data...");
        const response: AxiosResponse<ApiResponse> = await axios.get(this.api);
        const confirmed = response?.data?.confirmed;
        const recovered = response?.data?.recovered;
        const deceased = response?.data?.deaths;

        if (!confirmed || !recovered) {
            this.logger.error("API is offline or returning incomplete data!");
            return;
        }

        // Convert cases to a more convenient format
        const infections: List<Case> = List(confirmed).map(parseCase);
        const recoveries: List<Case> = List(recovered).map(parseCase);
        const deaths: List<Case> = List(deceased).map(parseCase);

        const previousId = state.last;
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
        const recoveriesToday = recoveries
            .filter(recovery => recovery.date >= today.getTime());
        const deathsToday = deaths
            .filter(death => death.date >= today.getTime());

        state.infections = infections;
        state.today = casesToday.count();
        state.recoveries = recoveriesToday.count();
        state.deaths = deathsToday.count();
        state.yesterday = casesYesterday.count();
        state.dayBefore = casesDayBefore.count();
        state.total = confirmed.length - recovered.length;
        state.totalRecovered = recovered.length;
        state.totalDeaths = deceased.length;

        const districtsToday = this.districts(casesToday)
            .sort()
            .reverse()
            .map((count, district) => `${district}: +${count}`)
            .join("\n");

        const districtsRecovered = this.districts(recoveries);
        const districtsTotal = this.districts(infections)
            .mergeWith((sick, recovered) => sick - recovered, districtsRecovered)
            .filter(cases => cases > 0)
            .sort()
            .reverse()
            .map((count, district) => `${district}: ${count}`)
            .join("\n");

        state.districtsToday = districtsToday;
        state.districtsTotal = districtsTotal;

        // Announce new cases
        if (latest.id - previousId > 0) {
            this.logger.info("Sending notifications...");
            const success = state.subscriptions
                .map((filter, chat) => this.announce(filter, chat, latest.id))
                .filter(Boolean);

            if (success) {
                // Only update when all subsribers are up to date
                state.last = latest.id;
                this.logger.info("All notifications sent!");
            }
        }

        await state.persist();
        this.logger.info("State updated");
    }

    announce(filter: Filter, chat: string, latestId: number): boolean {
        const infections = state.infections.filter(inf => inf.id > filter.last);
        const diff = infections.count();

        if (diff < filter.every) {
            return true;
        }

        const [service, id] = chat.split("|");
        const bot = this.bots.get(service);
        const districts = this.districts(infections)
            .filter(cases => cases > 0)
            .sort()
            .reverse();

        try {
            if (districts.count() === 1) {
                const text = `🦠 *${diff}* new ${pluralize("case", diff)} in ` +
                    `${districts.keySeq().first()}!\n\n` +
                    `Today *+${state.today}* ${pluralize("case", state.today)}.\n` +
                    `In total *${state.total}* ${pluralize("case", state.total)}.`;
                bot.send(id, { text });
            } else {
                const text = `🦠 *${diff}* new cases!\n\n` +
                    "*Healthcare Districts:*\n" +
                    `${districts.map((diff, dist) => `${dist}: +${diff}`).join("\n")}\n\n` +
                    `Total *${state.total}* ${pluralize("case", state.total)}.\n` +
                    `Today *+${state.today}* new ${pluralize("case", state.today)}.`;
                bot.send(id, { text });
            }
            filter.last = latestId;
            state.subscriptions.set(chat, filter);
            return true;
        } catch (error) {
            // This happens when the service cannot be reached
            this.logger.error(`Failed sending notification to ${chat}`, error);
            return false;
        }
    }

    districts(cases: List<Case>): Map<string, number> {
        return cases
            .groupBy(inf => inf.healthCareDistrict)
            .toMap()
            .map(cases => cases.count());
    }
}

export default Updater;