import { Event } from "./Event";

export abstract class AggregateRoot {

    #changes: Array<Event> = [];
    #version: number = 0;

    protected _id: string = '';

    get id() {
        return this._id;
    }

    get uncommittedChanges(): Array<Event> {
        return this.#changes;
    }

    markChangesAsCommitted(): void {
        this.#changes = [];
    }

    /**
     * Reconstruct aggregate root from history of events
     */
    reconstruct(events: Array<Event>) {
        events.forEach((e: Event) => this._applyChange(e, true));
    }

    /**
     * Allow implementation of AggregateRoot to apply changes.
     */
    protected addEvent(event: Event): void {
        this._applyChange(event, false);
    }

    private _applyChange(event: Event, fromHistory = true): void {
        const methodName: string = `apply${event.constructor.name}`;

        // If the subclass AggregateRoot has no apply method for this
        // type of event, throw error
        if (!this.constructor.prototype.hasOwnProperty(methodName)) {
            throw new Error(`[AGGREGATE] No apply method (${methodName}) for Aggregate Root (${this.constructor.name})`);
        }
        
        // Invoke the apply method for this event
        // TODO fix typing here, not sure how.
        (this as any)[methodName](event);
        this.#version++;

        // Exit early if reconstructing, as we do not need to add the 
        // event to the uncommitted changes.
        if (fromHistory) {
            return;
        }

        this.#changes.push(event);


    }
}