import { Event } from "../../framework/Event.ts";

export class DeckRenamed extends Event {
    constructor(
        public readonly id: string,
        public readonly name: string,
    ) {
        super();
    }
}