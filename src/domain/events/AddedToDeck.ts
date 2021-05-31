import { Event } from "../../framework/Event";
import { Card } from "../Card";

export class AddedToDeck extends Event {
    constructor(
        public readonly id: string,
        public readonly cards: Array<string>
    ) {
        super();
    }
}