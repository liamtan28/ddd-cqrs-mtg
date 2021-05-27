import { ICommand } from "./ICommand.ts";
import { IMessageBus } from "./IMessageBus.ts";

export class MessageBus implements IMessageBus {

    #handlers = new Map<string, any>();

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
            this.#handlers.set(commandName, handlerClass);
        });
        console.log(`[MESSAGE BUS] Registered ${commandNames.length} commands to handler (${handlerClassName})`);
    }
    sendCommand(command: ICommand): void {
        const commandName = command.constructor.name;
        const methodName = `handle${commandName}`;
        console.log(`[MESSAGE BUS] received new command (${commandName})`);

        if (!this.#handlers.has(commandName)) {
            throw new Error(`[MESSAGE BUS] Attempted to issue command ${commandName} with no registered handlers.`);
        }
        const handlerClass = this.#handlers.get(commandName) as any;
        handlerClass[methodName](command);
    }
    registerEventHandler<T extends Event>(event: Event, handler: (event: T) => void) {
        throw new Error("[MESSAGE BUS] Method not implemented.");
    }
    publishEvents(events: Event[]): void {
        throw new Error("[MESSAGE BUS] Method not implemented.");
    }

}