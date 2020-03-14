export function pluralize(singular: string, count): string {
    return singular + (count > 1 ? "s" : "");
}