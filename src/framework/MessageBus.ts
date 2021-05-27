import { ICommand } from "./ICommand.ts";
import { IMessageBus } from "./IMessageBus.ts";
import { Event } from "./Event.ts";

export class MessageBus implements IMessageBus {

    #eventHandlers = new Map<string, (event: any) => void>();
    #commandHandlers = new Map<string, any>();

    registerCommandHandlers(commandNames: Array<string>, handlerClass: any): void {
        const handlerClassName = handlerClass.constructor.name;
        // Check that command handler class has a method called handle(CommandName) for 
        // each command
        commandNames.forEach((commandName: string): void => {
            const methodName = `handle${commandName}`;
            if (!handlerClass.constructor.prototype.hasOwnProperty(methodName)) {
                throw new Error(
                    `[MESSAGE BUS] Attempted to bind command (${commandName}) to commandHandler (${handlerClassName}) with no handle method.`
                );
            }
            this.#commandHandlers.set(commandName, handlerClass);
        });
        console.log(`[MESSAGE BUS] Registered ${commandNames.length} commands to handler (${handlerClassName})`);
    }
    sendCommand(command: ICommand): void {
        const commandName = command.constructor.name;
        const methodName = `handle${commandName}`;
        console.log(`[MESSAGE BUS] received new command (${commandName})`);

        if (!this.#commandHandlers.has(commandName)) {
            throw new Error(`[MESSAGE BUS] Attempted to issue command ${commandName} with no registered handlers.`);
        }
        // TODO fix typing here
        const handlerClass = this.#commandHandlers.get(commandName) as any;
        handlerClass[methodName](command);
    }
    registerEventHandler<T extends Event>(event: /*Event*/ string, handler: (event: T) => void) {
        this.#eventHandlers.set(event, handler);
        console.log(`[MESSAGE BUS] Registered new event handler for event ${event}`);
    }

    publishEvents(events: Event[]): void {
        events.forEach((event: Event) => {
            const eventName = event.constructor.name;
            const handler = this.#eventHandlers.get(eventName);
            if (!handler) {
                throw new Error(`[MESSAGE BUS] Attempted to publish event (${eventName}) with no bound handler.`);
            }

            handler(event);
            console.log(`[MESSAGE BUS] Published event (${eventName}) to event handlers`);
        });
    }

}