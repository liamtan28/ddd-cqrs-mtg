import colors from "colors";

import { IEventStore } from "./IEventStore";
import { Event } from "./Event";
import { IMessageBus } from "./IMessageBus";
import { messageBus } from "./MessageBus";

class EventDescriptor {
    constructor(
      public readonly aggregateId: string,
      public readonly event: Event,
      public readonly version: number
    ) {}
  }

class InMemoryEventStore implements IEventStore {

    #numEvents = 0;

    constructor(private readonly messageBus: IMessageBus) {}

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
        this.#numEvents += events.length;

        events.forEach(event => console.log(colors.blue(`[EVENT ${event.constructor.name} SAVED] [${event.getTimestamp()}] [${event.getID()}]\n`)));

        // TODO this will be by configuring whatever I use for a real event stores
        // responsibility to talk to the MessageBus
        this.messageBus.publishEvents(events);
        
    }

    getEventsForAggregate(aggregateId: string): Array<Event> {
        const eventDescriptors: Array<EventDescriptor> = this.#events.get(aggregateId) || [];

        return eventDescriptors
            .map((desc: EventDescriptor): Event => desc.event);
    }
}

const eventStore = new InMemoryEventStore(messageBus);
Object.freeze(eventStore);
export {
    eventStore,
    InMemoryEventStore,
}