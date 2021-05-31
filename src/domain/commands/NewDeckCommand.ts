import { Format } from "../types";
import { ICommand } from "../../framework/ICommand";

export class NewDeckCommand implements ICommand {

    constructor(public readonly id: string, public readonly name: string, public readonly format: Format)
    {}

}