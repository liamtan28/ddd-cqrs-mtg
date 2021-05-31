import { AggregateRoot } from "../framework/AggregateRoot";
import { Card } from "./Card";

export class Collection extends AggregateRoot {

    #id: string;
    #cards: Array<Card>;

    constructor(id: string) {
        super();
    }

    addCards(ids: Array<string>): void {

    }
    removeCards(ids: Array<string>): void {

    }
}