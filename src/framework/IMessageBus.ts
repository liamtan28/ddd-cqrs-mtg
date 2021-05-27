import { ICommand } from "./ICommand.ts";

export interface IMessageBus {

    registerCommandHandlers(commands: Array<ICommand>, handlers: any): void;
    registerEventHandler<T extends Event>(event: Event, handler: (event: T) => void): void;

    sendCommand(command: ICommand): void;
    publishEvents(events: Array<Event>): void;
}