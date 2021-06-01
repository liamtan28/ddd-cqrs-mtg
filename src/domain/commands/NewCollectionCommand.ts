import { ICommand } from "../../framework/ICommand";

export class NewCollectionCommand implements ICommand {

    constructor(public readonly id: string, public readonly ownerID: string)
    {}

}