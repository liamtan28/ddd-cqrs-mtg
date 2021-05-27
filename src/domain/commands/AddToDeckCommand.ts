import { ICommand } from "../../framework/ICommand.ts";

export class AddToDeckCommand implements ICommand {

    constructor(public readonly id: string, public readonly cards: Array<string>)
    {}

}