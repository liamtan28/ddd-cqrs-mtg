import { IMessageBus } from "../../framework/IMessageBus.ts";

import { AddedToDeck } from "../events/AddedToDeck.ts";
import { DeckCreated } from "../events/DeckCreated.ts";
import { DeckFormatChanged } from "../events/DeckFormatChanged.ts";
import { DeckRenamed } from "../events/DeckRenamed.ts";
import { RemovedFromDeck } from "../events/RemovedFromDeck.ts";

interface DeckView {
    id: string;
    name: string;
    format: string;
    numCards: number;
    cards: Array<string>;
}


// TODO really not sure about this.
// Unanswered questions:
// How do I query this? Is this meant to be some ETL into another DB?
// Seems like i am duplicating domain logic here to the projection
// this logic also exists in the domain layer.

export class DeckProjection {

    #deckViews: Map<string, DeckView> = new Map<string, DeckView>();

    getDeckView(id: string): DeckView | undefined {
        return this.#deckViews.get(id);
    }


    public constructor(private readonly messageBus: IMessageBus) {

        // TODO once again address the use of string here
        // via reflection or some other cheeky solution.
        // look at old mates code if you struggle. 
        // They've done it somehow
        messageBus.registerEventHandler<DeckCreated>('DeckCreated', (e) => {
            this.#deckViews.set(e.id, {
                id: e.id,
                name: e.name,
                format: e.format,
                numCards: 0,
                cards: [],
            });
        });

        messageBus.registerEventHandler<AddedToDeck>('AddedToDeck', (e) => {
            const view = this.#deckViews.get(e.id) as DeckView;
            const newCards = [ ...view.cards, ...e.cards]
            this.#deckViews.set(e.id, {
                ...view,
                numCards: view.numCards + e.cards.length,
                cards: newCards,
            });
        });

        messageBus.registerEventHandler<RemovedFromDeck>('RemovedFromDeck', (e) => {
            const view = this.#deckViews.get(e.id) as DeckView;
            this.#deckViews.set(e.id, {
                ...view,
                numCards: view.numCards - e.cards.length,
                cards: view.cards.filter((card => !e.cards.includes(card))),
            });
        });

        messageBus.registerEventHandler<DeckRenamed>('DeckRenamed', (e) => {
            const view = this.#deckViews.get(e.id) as DeckView;
            this.#deckViews.set(e.id, {
                ...view,
                name: e.name,
            });
        });

        messageBus.registerEventHandler<DeckFormatChanged>('DeckFormatChanged', (e) => {
            const view = this.#deckViews.get(e.id) as DeckView;
            this.#deckViews.set(e.id, {
                ...view,
                format: e.newFormat,
            });
        });

    }
}