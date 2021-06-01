import { Event } from "../../framework/Event";
import { Format } from "../types";

export class CollectionCreated extends Event {
    constructor(
        public readonly id: string,
        public readonly ownerID: string,
    ) {
        super();
    }
}