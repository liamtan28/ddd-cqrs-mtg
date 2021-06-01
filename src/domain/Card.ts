import { AggregateRoot } from "../framework/AggregateRoot";
import { CardCreated } from "./events/CardCreated";
import { Format } from "./types";

export class Card extends AggregateRoot {

    #name: string = '';
    #legalFormats: Array<Format> = [];
    #image: string = '';

    getID() {
        return this._id;
    }

    getName(): string {
        return this.#name;
    }
    getLegalFormats(): Array<Format> {
        return this.#legalFormats;
    }
    getImageURI(): string {
        return this.#image;
    }

    constructor(id?: string, name?: string, legalFormats?: Array<Format>, image?: string) {
        super();
        if (id && name && legalFormats && image) {
            this.addEvent(new CardCreated(id, name, legalFormats, image));
        }
    }

    applyCardCreated(event: CardCreated): void {
        const { id, name, legalFormats, image } = event;
        this._id = id;
        this.#name = name;
        this.#legalFormats = legalFormats;
        this.#image = image;
    }

}