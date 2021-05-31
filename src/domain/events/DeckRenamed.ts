import { Event } from "../../framework/Event";

export class DeckRenamed extends Event {
    constructor(
        public readonly id: string,
        public readonly name: string,
    ) {
        super();
    }
}