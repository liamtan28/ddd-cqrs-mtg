import { Format } from "../types.ts";
import { ICommand } from "../../framework/ICommand.ts";

export class ChangeDeckFormatCommand implements ICommand {

    constructor(public readonly id: string, public readonly newFormat: Format)
    {}

}