export class Card {

    #id: string;
    #name: string;
    #legalFormats: Array<string>;
    #image?: URL;

    constructor(id: string, name: string, legalFormats: Array<string>, image?: URL) {
        this.#id = id;
        this.#name = name;
        this.#legalFormats = legalFormats;
        this.#image = image;
    }

}