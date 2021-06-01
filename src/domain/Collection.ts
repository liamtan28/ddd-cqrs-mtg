import { AggregateRoot } from "../framework/AggregateRoot";
import { Card } from "./Card";
import { AddedToCollection } from "./events/AddedToCollection";
import { CollectionCreated } from "./events/CollectionCreated";

export class Collection extends AggregateRoot {
    #ownerID: string = '';
    #cards: Array<Card> = [];

    getCards() {
        return this.#cards;
    }

    constructor(id?: string, ownerID?: string) {
        super();
        if (id && ownerID) {
            this.addEvent(new CollectionCreated(id, ownerID));
        }
    }

    applyCollectionCreated(event: CollectionCreated) {
        this._id = event.id;
        this.#ownerID = event.ownerID;
    }

    addCards(ids: Array<Card>): void {
        this.addEvent(new AddedToCollection(this.id, ids));
    }

    applyAddedToCollection(event: AddedToCollection): void {
        this.#cards = [...this.#cards, ...event.cards];
    }
    removeCards(ids: Array<string>): void {

    }
}