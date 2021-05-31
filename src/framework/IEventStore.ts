import { Event } from "./Event";

export interface IEventStore {
    saveEvents(
        aggregateId: string,
        events: Array<Event>,
        expectedVersion: number
      ): void
      getEventsForAggregate(aggregateId: string): Array<Event>
}