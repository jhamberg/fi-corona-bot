import { Case, RawCase } from "./types";

export const pluralize = (singular: string, count): string => (
    singular + (count > 1 ? "s" : "")
);

export const parseCase = (item: RawCase): Case => ({
    ...item,
    id: Number(item.id),
    date: Date.parse(item.date)
});