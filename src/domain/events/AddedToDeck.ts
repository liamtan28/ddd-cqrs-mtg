import { Event } from "../../framework/Event.ts";
import { Card } from "../Card.ts";

export class AddedToDeck extends Event {
    constructor(
        public readonly id: string,
        public readonly cards: Array<string>
    ) {
        super();
    }
}