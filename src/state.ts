import fs from "fs";
import { Map, List } from "immutable";
import { Case } from "./types";

export type Filter = {
    every: number;
    last: number;
};

const filepath = process.env.STATE_FILE ?? "./state.json";
const state = loadState();

interface CommonState {
    last: number;
}

interface State extends CommonState {
    today: number;
    total: number;
    recoveries: number;
    totalRecovered: number;
    deaths: number;
    totalDeaths: number;
    yesterday: number;
    dayBefore: number;
    districtsToday: string;
    districtsTotal: string;
    subscriptions: Map<string, Filter>;
    infections: List<Case>;
    persist: () => Promise<void>;
}

interface PrimitiveState extends CommonState {
    subscriptions: { [key: string]: Filter };
}

function stateToPrimitive(state: State): PrimitiveState {
    return {
        last: state.last,
        subscriptions: state.subscriptions.toObject()
    };
};

function primitiveToState(primitive: PrimitiveState): State {
    return {
        last: primitive.last,
        today: 0,
        total: 0,
        recoveries: 0,
        totalRecovered: 0,
        deaths: 0,
        totalDeaths: 0,
        yesterday: 0,
        dayBefore: 0,
        districtsToday: "",
        districtsTotal: "",
        subscriptions: Map(primitive.subscriptions),
        infections: List(),
        persist
    };
}

function loadState(): State {
    try {
        const raw: PrimitiveState = fs.existsSync(filepath)
            ? JSON.parse(fs.readFileSync(filepath, "utf-8"))
            : { last: 0, subscriptions: Map() };
        return primitiveToState(raw);
    } catch (error) {
        console.error("Error while restoring state", error);
        process.exit(1);
    }
}

async function persist(): Promise<void> {
    try {
        const item: PrimitiveState = stateToPrimitive(state);
        await fs.promises.writeFile(filepath, JSON.stringify(item, null, 2));
    } catch (error) {
        console.error("Error while persisting state", error);
        process.exit(1);
    }
}

export default state;