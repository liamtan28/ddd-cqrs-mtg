import { AggregateRoot } from "./AggregateRoot.ts";

export interface IRepository<T extends AggregateRoot> {

    getById(id: string): T;
    save(entity: T, expectedVersion: number): void;
    
}