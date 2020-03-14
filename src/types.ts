export type Message = {
    text: string;
};

export interface Bot {
    send(id: number | string, message: Message);
    readonly id: string;
}