import { Event } from "../../framework/Event.ts";
import { Format } from "../types.ts";

export class DeckFormatChanged extends Event {
    constructor(
        public readonly id: string,
        public readonly newFormat: Format,
    ) {
        super();
    }
}