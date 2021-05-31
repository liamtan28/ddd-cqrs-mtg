import { Repository } from "../../framework/Repository";
import { NewCardCommand } from "../commands/NewCardCommand";
import { Card } from "../Card";

export class CardCommandHandlers {
    constructor(private readonly repository: Repository<Card>) {}

    handleNewCardCommand(command: NewCardCommand) {
        const card: Card = new Card(command.id, command.name, command.legalFormats, command.image);
        this.repository.save(card, 4);
    }
}