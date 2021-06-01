import { Repository } from "../../framework/Repository";

import { Card } from "../Card";
import { Collection } from "../Collection";
import { AddToCollectionCommand } from "../commands/AddToCollectionCommand";
import { NewCollectionCommand } from "../commands/NewCollectionCommand";

export class CollectionCommandHandlers {
    constructor(private readonly collectionRepo: Repository<Collection>, private readonly cardRepo: Repository<Card>) {}

    handleNewCollectionCommand(command: NewCollectionCommand) {
        const collection: Collection = new Collection(command.id, command.ownerID);
        this.collectionRepo.save(collection, 0);
    }

    handleAddToCollectionCommand(command: AddToCollectionCommand) {
        const collection = this.collectionRepo.getById(command.id);
        const cards: Array<Card> = this.cardRepo.getByIds(command.cards);
        collection.addCards(cards);
        this.collectionRepo.save(collection, 0);
    }
/*
    handleRemoveFromDeckCommand(command: RemoveFromDeckCommand) {
        const deck = this.deckRepo.getById(command.id);
        deck.removeCards(command.cards);
        this.deckRepo.save(deck, 0);
    }
    */

}