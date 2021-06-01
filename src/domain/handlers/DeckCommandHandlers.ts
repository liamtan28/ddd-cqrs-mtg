import { Deck } from "../Deck";
import { Repository } from "../../framework/Repository";

import { NewDeckCommand } from "../commands/NewDeckCommand";
import { AddToDeckCommand } from "../commands/AddToDeckCommand";
import { RenameDeckCommand } from "../commands/RenameDeckCommand";
import { ChangeDeckFormatCommand } from "../commands/ChangeDeckFormatCommand";
import { RemoveFromDeckCommand } from "../commands/RemoveFromDeckCommand";
import { Card } from "../Card";

export class DeckCommandHandlers {
    constructor(private readonly deckRepo: Repository<Deck>, private readonly cardRepo: Repository<Card>) {}

    handleNewDeckCommand(command: NewDeckCommand) {
        const deck: Deck = new Deck(command.id, command.name, command.format);
        this.deckRepo.save(deck, 0);
    }

    handleAddToDeckCommand(command: AddToDeckCommand) {
        const deck = this.deckRepo.getById(command.id);
        const cards: Array<Card> = this.cardRepo.getByIds(command.cards);
        deck.addCards(cards);
        this.deckRepo.save(deck, 0);
    }

    handleRemoveFromDeckCommand(command: RemoveFromDeckCommand) {
        const deck = this.deckRepo.getById(command.id);
        deck.removeCards(command.cards);
        this.deckRepo.save(deck, 0);
    }

    handleRenameDeckCommand(command: RenameDeckCommand) {
        const deck = this.deckRepo.getById(command.id);
        deck.rename(command.name);
        this.deckRepo.save(deck, 0);
    }

    handleChangeDeckFormatCommand(command: ChangeDeckFormatCommand) {
        const deck = this.deckRepo.getById(command.id);
        deck.changeFormat(command.newFormat);
        this.deckRepo.save(deck, 0);
    }
}