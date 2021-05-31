import { ICommand } from "../../framework/ICommand";

export class RenameDeckCommand implements ICommand {

    constructor(public readonly id: string, public readonly name: string)
    {}

}