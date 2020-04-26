export type Message = {
    text: string;
};

export interface Bot {
    send(id: number | string, message: Message);
    readonly id: string;
}

export interface RawCase extends BaseCase {
    id: string;
    date: string;
}

export interface Case extends BaseCase {
    id: number;
    date: number;
}

export interface BaseCase {
    infectionSource: "unknown" | number;
    infectionSourceCountry: string;
    healthCareDistrict: string;
}