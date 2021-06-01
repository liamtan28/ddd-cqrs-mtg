import { Event } from "../../framework/Event";
import { Card } from "../Card";

export class AddedToCollection extends Event {
    constructor(
        public readonly id: string,
        public readonly cards: Array<Card>
    ) {
        super();
    }
}