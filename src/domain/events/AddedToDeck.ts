import { Event } from "../../framework/Event";
import { Card } from "../Card";


/**
 * 
 * 
 * I really don't know how much I love this TODO address.
 * 
 * The purpose of enriching events like this is so that read projections
 * have access to all of relevant info to build a view.
 */
export class AddedToDeck extends Event {
    constructor(
        public readonly id: string,
        public readonly cards: Array<Card>
    ) {
        super();
    }
}