import { ICommand } from "../../framework/ICommand.ts";

export class RenameDeckCommand implements ICommand {

    constructor(public readonly id: string, public readonly name: string)
    {}

}