import { Format } from "../types";
import { ICommand } from "../../framework/ICommand";

export class ChangeDeckFormatCommand implements ICommand {

    constructor(public readonly id: string, public readonly newFormat: Format)
    {}

}