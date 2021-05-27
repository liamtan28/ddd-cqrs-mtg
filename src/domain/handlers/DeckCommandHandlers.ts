import { Deck } from "../Deck.ts";
import { DeckRepository } from "../DeckRepository.ts";

import { NewDeckCommand } from "../commands/NewDeckCommand.ts";
import { AddToDeckCommand } from "../commands/AddToDeckCommand.ts";
import { RenameDeckCommand } from "../commands/RenameDeckCommand.ts";
import { ChangeDeckFormatCommand } from "../commands/ChangeDeckFormatCommand.ts";
import { RemoveFromDeckCommand } from "../commands/RemoveFromDeckCommand.ts";

export class DeckCommandHandlers {
    constructor(private readonly repository: DeckRepository) {}

    handleNewDeckCommand(command: NewDeckCommand) {
        const deck: Deck = new Deck(command.id, command.name, command.format);
        this.repository.save(deck, 0);
    }

    handleAddToDeckCommand(command: AddToDeckCommand) {
        const deck = this.repository.getById(command.id);
        deck.addCards(command.cards);
        this.repository.save(deck, 0);
    }

    handleRemoveFromDeckCommand(command: RemoveFromDeckCommand) {
        const deck = this.repository.getById(command.id);
        deck.removeCards(command.cards);
        this.repository.save(deck, 0);
    }

    handleRenameDeckCommand(command: RenameDeckCommand) {
        const deck = this.repository.getById(command.id);
        deck.rename(command.name);
        this.repository.save(deck, 0);
    }

    handleChangeDeckFormatCommand(command: ChangeDeckFormatCommand) {
        const deck = this.repository.getById(command.id);
        deck.changeFormat(command.newFormat);
        this.repository.save(deck, 0);
    }
}