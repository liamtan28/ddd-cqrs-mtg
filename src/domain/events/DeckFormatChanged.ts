import { Event } from "../../framework/Event";
import { Format } from "../types";

export class DeckFormatChanged extends Event {
    constructor(
        public readonly id: string,
        public readonly newFormat: Format,
    ) {
        super();
    }
}