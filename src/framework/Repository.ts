import { AggregateRoot } from "../framework/AggregateRoot";
import { IEventStore } from "../framework/IEventStore";
import { IRepository } from "../framework/IRepository";
export class Repository<T extends AggregateRoot> implements IRepository<T> {

    constructor(
        private readonly storage: IEventStore,
        private Type: new () => T,
        )
    {}

    getByIds(ids: Array<string> = []): Array<T> {
        return ids.map(id => {
            const entity: T = new this.Type();
            const events = this.storage.getEventsForAggregate(id);
            entity.reconstruct(events);
            return entity;
        });
    }

    // 1. Create empty domain object (TODO how do we do this without creating 
    // constructor as it adds another creation event at start)
    // 2. get all events from eventStore
    // 3. Replay events and return
    getById(id: string): T {
        const entity: T = new this.Type();
        const events = this.storage.getEventsForAggregate(id);
        entity.reconstruct(events);
        return entity;
    }

    save(entity: T, expectedVersion: number): void {
        this.storage.saveEvents(
            entity.id,
            entity.uncommittedChanges,
            expectedVersion
        );
        entity.markChangesAsCommitted();
    }

}