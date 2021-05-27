import { ICommand } from "../../framework/ICommand.ts";

export class RemoveFromDeckCommand implements ICommand {

    constructor(public readonly id: string, public readonly cards: Array<string>)
    {}

}