import { IMessageBus } from "../../framework/IMessageBus";
import { Card } from "../Card";
import { AddedToCollection } from "../events/AddedToCollection";

import { CardCreated } from "../events/CardCreated";
import { CollectionCreated } from "../events/CollectionCreated";
import { Format } from "../types";


interface CardView {
    id: string;
    name: string;
    legalFormats: Array<Format>;
    image: string;
}

interface CollectionView {
  cards: Array<CardView>;
}

export class CollectionProjection {

    #collectionViews: Map<string, CollectionView> = new Map<string, CollectionView>();

    getCollectionView(id: string) {
        return this.#collectionViews.get(id);
    }

    public constructor(private readonly messageBus: IMessageBus) {

        // TODO once again address the use of string here
        // via reflection or some other cheeky solution.
        // look at old mates code if you struggle. 
        // They've done it somehow
        messageBus.registerEventHandler<CollectionCreated>('CollectionCreated', (e) => {
            this.#collectionViews.set(e.id, {
                cards: []
            });
            console.log(this.#collectionViews.get(e.id));
        });

        messageBus.registerEventHandler<AddedToCollection>('AddedToCollection', (e) => {
            const view = this.#collectionViews.get(e.id) as CollectionView;
            const updatedView = {
                ...view,
                cards: [...view.cards, ...e.cards.map((card: Card): CardView => ({
                    id: card.getID(),
                    name: card.getName(),
                    legalFormats: card.getLegalFormats(),
                    image: card.getImageURI(),
                }))],
            };
            this.#collectionViews.set(e.id, updatedView);
        })

    }
}