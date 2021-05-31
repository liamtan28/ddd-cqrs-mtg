import { Format } from "../types";
import { ICommand } from "../../framework/ICommand";

export class NewCardCommand implements ICommand {

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly legalFormats: Array<Format>,
        public readonly image: string
    )
    {}

}