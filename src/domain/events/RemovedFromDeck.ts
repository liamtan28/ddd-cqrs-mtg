import { Event } from "../../framework/Event";

export class RemovedFromDeck extends Event {
    constructor(
        public readonly id: string,
        public readonly cards: Array<string>
    ) {
        super();
    }
}