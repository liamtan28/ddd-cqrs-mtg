import { Event } from "../../framework/Event";
import { Format } from "../types";

export class DeckCreated extends Event {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly format: Format
    ) {
        super();
    }
}