import { IMessageBus } from "../../framework/IMessageBus";
import { Card } from "../Card";

import { AddedToDeck } from "../events/AddedToDeck";
import { DeckCreated } from "../events/DeckCreated";
import { DeckFormatChanged } from "../events/DeckFormatChanged";
import { DeckRenamed } from "../events/DeckRenamed";
import { RemovedFromDeck } from "../events/RemovedFromDeck";
import { Format } from "../types";

/*

interface DeckProjectionView {
    deckID: string;
    deckName: string;
    deckFormat: Format;
    numberOfCards: number;
    cards: Array<CardProjectionView>;
}

*/

interface CardView {
    id: string;
    name: string;
    legalFormats: Array<Format>;
    image: string;
}
interface DeckView {
    id: string;
    name: string;
    format: Format;
    numCards: number;
    isLegal: boolean;
    cards: Array<CardView>;
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

    private static isDeckLegal(numCards: number, cards: Array<CardView>, format: Format): boolean {
        if (numCards < 60) return false;
        for (const card of cards) {
            if(!card.legalFormats.includes(format)) {
                return false;
            }
        }
        return true;
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
                isLegal: false,
                cards: [],
            });
        });

        messageBus.registerEventHandler<AddedToDeck>('AddedToDeck', (e) => {
            const view = this.#deckViews.get(e.id) as DeckView;
            const updatedView = {
                ...view,
                numCards: view.numCards + e.cards.length,
                cards: [...view.cards, ...e.cards.map((card: Card): CardView => ({
                    id: card.getID(),
                    name: card.getName(),
                    legalFormats: card.getLegalFormats(),
                    image: card.getImageURI(),
                }))],
            };
            const isLegal = DeckProjection.isDeckLegal(updatedView.numCards, updatedView.cards, updatedView.format);
            this.#deckViews.set(e.id, {
                ...updatedView,
                isLegal
            });
        });

        messageBus.registerEventHandler<RemovedFromDeck>('RemovedFromDeck', (e) => {
            const view = this.#deckViews.get(e.id) as DeckView;
            const updatedView = {
                ...view,
                numCards: view.numCards - e.cards.length,
                cards: view.cards.filter(((card: CardView) => !e.cards.includes(card.id))),
            }
            
            this.#deckViews.set(e.id, updatedView);
            const isLegal = DeckProjection.isDeckLegal(updatedView.numCards, updatedView.cards, updatedView.format);
            this.#deckViews.set(e.id, {
                ...updatedView,
                isLegal
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