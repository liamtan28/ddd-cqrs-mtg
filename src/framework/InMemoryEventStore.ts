import { IEventStore } from "./IEventStore.ts";
import { Event } from "./Event.ts";

class EventDescriptor {
    constructor(
      public readonly aggregateId: string,
      public readonly event: Event,
      public readonly version: number
    ) {}
  }

export class InMemoryEventStore implements IEventStore {

    #events: Map<string, Array<EventDescriptor>> = new Map<string, Array<EventDescriptor>>();

    saveEvents(
        aggregateId: string,
        events: Array<Event>,
        expectedVersion: number
    ): void {
        // TODO implement version locking here
        if (!this.#events.has(aggregateId)) {
            this.#events.set(aggregateId, []);
        }
        const newEvents = events.map((event: Event) => new EventDescriptor(
            aggregateId,
            event,
            0, // placeholder TODO fix
        ));
        this.#events.set(aggregateId, [...this.#events.get(aggregateId) || [], ...newEvents]);
        console.log(`[EVENT STORE] ${events.length} events saved to Event Store for aggregate id: ${aggregateId}`);
    }

    getEventsForAggregate(aggregateId: string): Array<Event> {
        const eventDescriptors: Array<EventDescriptor> = this.#events.get(aggregateId) || [];

        return eventDescriptors
            .map((desc: EventDescriptor): Event => desc.event);
    }


}