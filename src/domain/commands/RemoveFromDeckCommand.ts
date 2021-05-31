import { ICommand } from "../../framework/ICommand";

export class RemoveFromDeckCommand implements ICommand {

    constructor(public readonly id: string, public readonly cards: Array<string>)
    {}

}