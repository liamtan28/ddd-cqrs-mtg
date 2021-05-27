import { Event } from "../../framework/Event.ts";

export class RemovedFromDeck extends Event {
    constructor(
        public readonly id: string,
        public readonly cards: Array<string>
    ) {
        super();
    }
}