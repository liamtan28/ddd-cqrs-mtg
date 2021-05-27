import { AggregateRoot } from "../framework/AggregateRoot.ts";
import { Card } from "./Card.ts";
import { Format } from "./types.ts";

import { AddedToDeck } from "./events/AddedToDeck.ts";
import { DeckCreated } from "./events/DeckCreated.ts";
import { DeckRenamed } from "./events/DeckRenamed.ts";
import { DeckFormatChanged } from "./events/DeckFormatChanged.ts";
import { RemovedFromDeck } from "./events/RemovedFromDeck.ts";

export class Deck extends AggregateRoot {

    #name: string = '';
    #format: Format = Format.UNKNOWN;
    #cards: /*Array<Card>*/ Array<string> = [];

    constructor(id?: string, name?: string, format?: Format) {
        super();
        // TODO really bad way to deal with empty create for reconstruction.
        if(id && name && format) {
            this.addEvent(new DeckCreated(id, name, format));
        }
    }
    getName() {
        return this.#name;
    }
    getFormat() {
        return this.#format;
    }
    getCards() {
        return this.#cards;
    }
    getSize() {
        return this.#cards.length;
    }

    applyDeckCreated(event: DeckCreated): void {
        this._id = event.id;
        this.#name = event.name;
        this.#format = event.format;
        this.#cards = [];
    }

    addCards(ids: Array<string>): void {
        this.addEvent(new AddedToDeck(this.id, ids));
    }

    applyAddedToDeck(event: AddedToDeck): void {
        this.#cards = [...this.#cards, ...event.cards];
    }

    removeCards(ids: Array<string>): void {
        this.addEvent(new RemovedFromDeck(this.id, ids));
    }

    applyRemovedFromDeck(event: RemovedFromDeck): void {
        this.#cards = this.#cards.filter((card: string) => !event.cards.includes(card));
    }

    rename(name: string): void {
        this.addEvent(new DeckRenamed(this.id, name));
    }

    applyDeckRenamed(event: DeckRenamed): void {
        this.#name = event.name;
    }

    changeFormat(newFormat: Format): void {
        this.addEvent(new DeckFormatChanged(this.id, newFormat));
    }

    applyDeckFormatChanged(event: DeckFormatChanged): void {
        this.#format = event.newFormat;
    }
}