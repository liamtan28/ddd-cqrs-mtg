import { Event } from "./Event.ts";

export interface IEventStore {
    saveEvents(
        aggregateId: string,
        events: Array<Event>,
        expectedVersion: number
      ): void
      getEventsForAggregate(aggregateId: string): Array<Event>
}