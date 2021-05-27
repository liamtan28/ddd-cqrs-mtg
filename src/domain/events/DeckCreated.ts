import { Event } from "../../framework/Event.ts";
import { Format } from "../types.ts";

export class DeckCreated extends Event {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly format: Format
    ) {
        super();
    }
}