import { AggregateRoot } from "./AggregateRoot";

export interface IRepository<T extends AggregateRoot> {

    getById(id: string): T;
    getByIds(ids: Array<string>): Array<T>;
    save(entity: T, expectedVersion: number): void;
    
}