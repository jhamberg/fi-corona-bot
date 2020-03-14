import fs from "fs";
import { Map } from "immutable";

export type Filter = {
    every: number;
    last: number;
};

const filepath = process.env.STATE_FILE ?? "./state.json";
const state = loadState();

interface CommonState {
    total: number;
    recovered: number;
    last: number;
    today: number;
    yesterday: number;
    dayBefore: number;
    districtsToday: string;
    districtsTotal: string;
}

interface State extends CommonState {
    subscriptions: Map<string, Filter>;
    persist: () => Promise<void>;
}

interface PrimitiveState extends CommonState {
    subscriptions: { [key: string]: Filter };
}


function stateToPrimitive(state: State): PrimitiveState {
    return {
        ...state,
        subscriptions: state.subscriptions.toObject()
    };
};

function primitiveToState(primitive: PrimitiveState): State {
    return {
        ...primitive,
        subscriptions: Map(primitive.subscriptions),
        persist
    };
}

function loadState(): State {
    try {
        const defaultState: PrimitiveState = {
            last: null,
            subscriptions: {},
            total: 0,
            recovered: 0,
            today: 0,
            yesterday: 0,
            dayBefore: 0,
            districtsToday: "",
            districtsTotal: ""
        };
        const raw: PrimitiveState = fs.existsSync(filepath)
            ? JSON.parse(fs.readFileSync(filepath, "utf-8"))
            : defaultState;
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