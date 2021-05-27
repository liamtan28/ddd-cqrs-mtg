import { IEventStore } from "../framework/IEventStore.ts";
import { InMemoryEventStore } from "../framework/InMemoryEventStore.ts";
import { IRepository } from "../framework/IRepository.ts";
import { Deck } from "./Deck.ts";



export class DeckRepository implements IRepository<Deck> {

    constructor(private readonly storage: IEventStore)
    {}

    // 1. Create empty domain object (TODO how do we do this without creating 
    // constructor as it adds another creation event at start)
    // 2. get all events from eventStore
    // 3. Replay events and return
    getById(id: string): Deck {

        const deck: Deck = new Deck(id);
        const events = this.storage.getEventsForAggregate(id);
        deck.reconstruct(events);
        return deck;
    }

    save(deck: Deck, expectedVersion: number): void {
        this.storage.saveEvents(deck.id, deck.uncommittedChanges, expectedVersion);
        deck.markChangesAsCommitted();
    }

}