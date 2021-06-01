import { ICommand } from "../../framework/ICommand";

export class AddToCollectionCommand implements ICommand {

    constructor(public readonly id: string, public readonly cards: Array<string>)
    {}

}