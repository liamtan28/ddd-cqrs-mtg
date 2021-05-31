import { IMessageBus } from "../../framework/IMessageBus";

import { CardCreated } from "../events/CardCreated";
import { Format } from "../types";

interface CardView {
    id: string;
    name: string;
    legalFormats: Array<Format>;
    image: string;
}


// TODO really not sure about this.
// Unanswered questions:
// How do I query this? Is this meant to be some ETL into another DB?
// Seems like i am duplicating domain logic here to the projection
// this logic also exists in the domain layer.

export class CardProjection {

    #deckViews: Map<string, CardView> = new Map<string, CardView>();

    getCard(id: string): CardView | undefined {
        return this.#deckViews.get(id);
    }
    getCards() {
        return [...this.#deckViews.values()];
    }

    public constructor(private readonly messageBus: IMessageBus) {

        // TODO once again address the use of string here
        // via reflection or some other cheeky solution.
        // look at old mates code if you struggle. 
        // They've done it somehow
        messageBus.registerEventHandler<CardCreated>('CardCreated', (e) => {
            this.#deckViews.set(e.id, {
                id: e.id,
                name: e.name,
                legalFormats: e.legalFormats,
                image: e.image,
            });
        });

    }
}