import { Format } from "../types.ts";
import { ICommand } from "../../framework/ICommand.ts";

export class NewDeckCommand implements ICommand {

    constructor(public readonly id: string, public readonly name: string, public readonly format: Format)
    {}

}