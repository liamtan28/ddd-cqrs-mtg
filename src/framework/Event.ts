import { v4 } from "uuid";

export abstract class Event {
    #id: string;
    #timestamp: number;
    getID() {
        return this.#id;
    }
    getTimestamp() {
        return this.#timestamp;
    }
    constructor() {
        this.#id = v4();
        this.#timestamp = Date.now();
    }
}