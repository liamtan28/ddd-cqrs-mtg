import { Event } from "../../framework/Event";
import { Format } from "../types";

export class CardCreated extends Event {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly legalFormats: Array<Format>,
        public readonly image: string,
    ) {
        super();
    }
}