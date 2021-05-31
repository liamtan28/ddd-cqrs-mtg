import { AggregateRoot } from "./AggregateRoot";

export interface IRepository<T extends AggregateRoot> {

    getById(id: string): T;
    save(entity: T, expectedVersion: number): void;
    
}