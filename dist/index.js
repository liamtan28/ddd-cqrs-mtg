/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

;// CONCATENATED MODULE: external "express"
const external_express_namespaceObject = require("express");;
var external_express_default = /*#__PURE__*/__webpack_require__.n(external_express_namespaceObject);
;// CONCATENATED MODULE: ./src/framework/Repository.ts
class Repository {
    storage;
    Type;
    constructor(storage, Type) {
        this.storage = storage;
        this.Type = Type;
    }
    // 1. Create empty domain object (TODO how do we do this without creating 
    // constructor as it adds another creation event at start)
    // 2. get all events from eventStore
    // 3. Replay events and return
    getById(id) {
        const entity = new this.Type();
        const events = this.storage.getEventsForAggregate(id);
        entity.reconstruct(events);
        return entity;
    }
    save(entity, expectedVersion) {
        this.storage.saveEvents(entity.id, entity.uncommittedChanges, expectedVersion);
        entity.markChangesAsCommitted();
    }
}

;// CONCATENATED MODULE: ./src/framework/MessageBus.ts
class MessageBus {
    #eventHandlers = new Map();
    #commandHandlers = new Map();
    registerCommandHandlers(commandNames, handlerClass) {
        const handlerClassName = handlerClass.constructor.name;
        // Check that command handler class has a method called handle(CommandName) for 
        // each command
        commandNames.forEach((commandName) => {
            const methodName = `handle${commandName}`;
            if (!handlerClass.constructor.prototype.hasOwnProperty(methodName)) {
                throw new Error(`[MESSAGE BUS] Attempted to bind command (${commandName}) to commandHandler (${handlerClassName}) with no handle method.`);
            }
            this.#commandHandlers.set(commandName, handlerClass);
        });
        console.log(`[MESSAGE BUS] Registered ${commandNames.length} commands to handler (${handlerClassName})`);
    }
    sendCommand(command) {
        const commandName = command.constructor.name;
        const methodName = `handle${commandName}`;
        console.log(`[MESSAGE BUS] received new command (${commandName})`);
        if (!this.#commandHandlers.has(commandName)) {
            throw new Error(`[MESSAGE BUS] Attempted to issue command ${commandName} with no registered handlers.`);
        }
        // TODO fix typing here
        const handlerClass = this.#commandHandlers.get(commandName);
        handlerClass[methodName](command);
    }
    registerEventHandler(event, handler) {
        this.#eventHandlers.set(event, handler);
        console.log(`[MESSAGE BUS] Registered new event handler for event ${event}`);
    }
    publishEvents(events) {
        events.forEach((event) => {
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
const messageBus = new MessageBus();
Object.freeze(messageBus);


;// CONCATENATED MODULE: ./src/framework/InMemoryEventStore.ts

class EventDescriptor {
    aggregateId;
    event;
    version;
    constructor(aggregateId, event, version) {
        this.aggregateId = aggregateId;
        this.event = event;
        this.version = version;
    }
}
class InMemoryEventStore {
    messageBus;
    constructor(messageBus) {
        this.messageBus = messageBus;
    }
    #events = new Map();
    saveEvents(aggregateId, events, expectedVersion) {
        // TODO implement version locking here
        if (!this.#events.has(aggregateId)) {
            this.#events.set(aggregateId, []);
        }
        const newEvents = events.map((event) => new EventDescriptor(aggregateId, event, 0));
        this.#events.set(aggregateId, [...this.#events.get(aggregateId) || [], ...newEvents]);
        // TODO this will be by configuring whatever I use for a real event stores
        // responsibility to talk to the MessageBus
        this.messageBus.publishEvents(events);
    }
    getEventsForAggregate(aggregateId) {
        const eventDescriptors = this.#events.get(aggregateId) || [];
        return eventDescriptors
            .map((desc) => desc.event);
    }
}
const eventStore = new InMemoryEventStore(messageBus);
Object.freeze(eventStore);


;// CONCATENATED MODULE: ./src/domain/types.ts
var Format;
(function (Format) {
    Format["MODERN"] = "Modern";
    Format["STANDARD"] = "Standard";
    Format["PAUPER"] = "Pauper";
    Format["LEGACY"] = "Legacy";
    Format["VINTAGE"] = "Vintage";
    Format["EDH"] = "EDH";
    Format["UNKNOWN"] = "Unknown";
})(Format || (Format = {}));

;// CONCATENATED MODULE: ./src/framework/AggregateRoot.ts
class AggregateRoot {
    #changes = [];
    #version = 0;
    _id = '';
    get id() {
        return this._id;
    }
    get uncommittedChanges() {
        return this.#changes;
    }
    markChangesAsCommitted() {
        this.#changes = [];
    }
    /**
     * Reconstruct aggregate root from history of events
     */
    reconstruct(events) {
        events.forEach((e) => this._applyChange(e, true));
    }
    /**
     * Allow implementation of AggregateRoot to apply changes.
     */
    addEvent(event) {
        this._applyChange(event, false);
    }
    _applyChange(event, fromHistory = true) {
        const methodName = `apply${event.constructor.name}`;
        // If the subclass AggregateRoot has no apply method for this
        // type of event, throw error
        if (!this.constructor.prototype.hasOwnProperty(methodName)) {
            throw new Error(`[AGGREGATE] No apply method (${methodName}) for Aggregate Root (${this.constructor.name})`);
        }
        // Invoke the apply method for this event
        // TODO fix typing here, not sure how.
        this[methodName](event);
        this.#version++;
        // Exit early if reconstructing, as we do not need to add the 
        // event to the uncommitted changes.
        if (fromHistory) {
            return;
        }
        this.#changes.push(event);
    }
}

;// CONCATENATED MODULE: ./src/framework/Event.ts
class Event {
}

;// CONCATENATED MODULE: ./src/domain/events/AddedToDeck.ts

class AddedToDeck extends Event {
    id;
    cards;
    constructor(id, cards) {
        super();
        this.id = id;
        this.cards = cards;
    }
}

;// CONCATENATED MODULE: ./src/domain/events/DeckCreated.ts

class DeckCreated extends Event {
    id;
    name;
    format;
    constructor(id, name, format) {
        super();
        this.id = id;
        this.name = name;
        this.format = format;
    }
}

;// CONCATENATED MODULE: ./src/domain/events/DeckRenamed.ts

class DeckRenamed extends Event {
    id;
    name;
    constructor(id, name) {
        super();
        this.id = id;
        this.name = name;
    }
}

;// CONCATENATED MODULE: ./src/domain/events/DeckFormatChanged.ts

class DeckFormatChanged extends Event {
    id;
    newFormat;
    constructor(id, newFormat) {
        super();
        this.id = id;
        this.newFormat = newFormat;
    }
}

;// CONCATENATED MODULE: ./src/domain/events/RemovedFromDeck.ts

class RemovedFromDeck extends Event {
    id;
    cards;
    constructor(id, cards) {
        super();
        this.id = id;
        this.cards = cards;
    }
}

;// CONCATENATED MODULE: ./src/domain/Deck.ts







class Deck extends AggregateRoot {
    #name = '';
    #format = Format.UNKNOWN;
    #cards = /*Array<Card>*/ [];
    constructor(id, name, format) {
        super();
        // TODO really bad way to deal with empty create for reconstruction.
        if (id && name && format) {
            this.addEvent(new DeckCreated(id, name, format));
        }
    }
    getName() {
        return this.#name;
    }
    getFormat() {
        return this.#format;
    }
    getCards() {
        return this.#cards;
    }
    getSize() {
        return this.#cards.length;
    }
    applyDeckCreated(event) {
        this._id = event.id;
        this.#name = event.name;
        this.#format = event.format;
        this.#cards = [];
    }
    addCards(ids) {
        this.addEvent(new AddedToDeck(this.id, ids));
    }
    applyAddedToDeck(event) {
        this.#cards = [...this.#cards, ...event.cards];
    }
    removeCards(ids) {
        this.addEvent(new RemovedFromDeck(this.id, ids));
    }
    applyRemovedFromDeck(event) {
        this.#cards = this.#cards.filter((card) => !event.cards.includes(card));
    }
    rename(name) {
        this.addEvent(new DeckRenamed(this.id, name));
    }
    applyDeckRenamed(event) {
        this.#name = event.name;
    }
    changeFormat(newFormat) {
        this.addEvent(new DeckFormatChanged(this.id, newFormat));
    }
    applyDeckFormatChanged(event) {
        this.#format = event.newFormat;
    }
}

;// CONCATENATED MODULE: ./src/domain/handlers/DeckCommandHandlers.ts

class DeckCommandHandlers {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    handleNewDeckCommand(command) {
        const deck = new Deck(command.id, command.name, command.format);
        this.repository.save(deck, 0);
    }
    handleAddToDeckCommand(command) {
        const deck = this.repository.getById(command.id);
        deck.addCards(command.cards);
        this.repository.save(deck, 0);
    }
    handleRemoveFromDeckCommand(command) {
        const deck = this.repository.getById(command.id);
        deck.removeCards(command.cards);
        this.repository.save(deck, 0);
    }
    handleRenameDeckCommand(command) {
        const deck = this.repository.getById(command.id);
        deck.rename(command.name);
        this.repository.save(deck, 0);
    }
    handleChangeDeckFormatCommand(command) {
        const deck = this.repository.getById(command.id);
        deck.changeFormat(command.newFormat);
        this.repository.save(deck, 0);
    }
}

;// CONCATENATED MODULE: ./src/domain/commands/NewDeckCommand.ts
class NewDeckCommand {
    id;
    name;
    format;
    constructor(id, name, format) {
        this.id = id;
        this.name = name;
        this.format = format;
    }
}

;// CONCATENATED MODULE: ./src/domain/commands/AddToDeckCommand.ts
class AddToDeckCommand {
    id;
    cards;
    constructor(id, cards) {
        this.id = id;
        this.cards = cards;
    }
}

;// CONCATENATED MODULE: ./src/domain/projections/DeckProjection.ts
// TODO really not sure about this.
// Unanswered questions:
// How do I query this? Is this meant to be some ETL into another DB?
// Seems like i am duplicating domain logic here to the projection
// this logic also exists in the domain layer.
class DeckProjection {
    messageBus;
    #deckViews = new Map();
    getDeckView(id) {
        return this.#deckViews.get(id);
    }
    constructor(messageBus) {
        this.messageBus = messageBus;
        // TODO once again address the use of string here
        // via reflection or some other cheeky solution.
        // look at old mates code if you struggle. 
        // They've done it somehow
        messageBus.registerEventHandler('DeckCreated', (e) => {
            this.#deckViews.set(e.id, {
                id: e.id,
                name: e.name,
                format: e.format,
                numCards: 0,
                cards: [],
            });
        });
        messageBus.registerEventHandler('AddedToDeck', (e) => {
            const view = this.#deckViews.get(e.id);
            this.#deckViews.set(e.id, {
                ...view,
                numCards: view.numCards + e.cards.length,
                cards: [...view.cards, ...e.cards],
            });
        });
        messageBus.registerEventHandler('RemovedFromDeck', (e) => {
            const view = this.#deckViews.get(e.id);
            this.#deckViews.set(e.id, {
                ...view,
                numCards: view.numCards - e.cards.length,
                cards: view.cards.filter(((cardId) => !e.cards.includes(cardId))),
            });
        });
        messageBus.registerEventHandler('DeckRenamed', (e) => {
            const view = this.#deckViews.get(e.id);
            this.#deckViews.set(e.id, {
                ...view,
                name: e.name,
            });
        });
        messageBus.registerEventHandler('DeckFormatChanged', (e) => {
            const view = this.#deckViews.get(e.id);
            this.#deckViews.set(e.id, {
                ...view,
                format: e.newFormat,
            });
        });
    }
}

;// CONCATENATED MODULE: ./src/domain/events/CardCreated.ts

class CardCreated extends Event {
    id;
    name;
    legalFormats;
    image;
    constructor(id, name, legalFormats, image) {
        super();
        this.id = id;
        this.name = name;
        this.legalFormats = legalFormats;
        this.image = image;
    }
}

;// CONCATENATED MODULE: ./src/domain/Card.ts


class Card extends AggregateRoot {
    #name = '';
    #legalFormats = [];
    #image = '';
    getName() {
        return this.#name;
    }
    getLegalFormats() {
        return this.#legalFormats;
    }
    getImageURI() {
        return this.#image;
    }
    constructor(id, name, legalFormats, image) {
        super();
        if (id && name && legalFormats && image) {
            this.addEvent(new CardCreated(id, name, legalFormats, image));
        }
    }
    applyCardCreated(event) {
        const { id, name, legalFormats, image } = event;
        this._id = id;
        this.#name = name;
        this.#legalFormats = legalFormats;
        this.#image = image;
    }
}

;// CONCATENATED MODULE: ./src/domain/commands/NewCardCommand.ts
class NewCardCommand {
    id;
    name;
    legalFormats;
    image;
    constructor(id, name, legalFormats, image) {
        this.id = id;
        this.name = name;
        this.legalFormats = legalFormats;
        this.image = image;
    }
}

;// CONCATENATED MODULE: ./src/domain/handlers/CardCommandHandlers.ts

class CardCommandHandlers {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    handleNewCardCommand(command) {
        const card = new Card(command.id, command.name, command.legalFormats, command.image);
        this.repository.save(card, 4);
    }
}

;// CONCATENATED MODULE: ./src/domain/projections/CardProjection.ts
// TODO really not sure about this.
// Unanswered questions:
// How do I query this? Is this meant to be some ETL into another DB?
// Seems like i am duplicating domain logic here to the projection
// this logic also exists in the domain layer.
class CardProjection {
    messageBus;
    #deckViews = new Map();
    getCard(id) {
        return this.#deckViews.get(id);
    }
    getCards() {
        return [...this.#deckViews.values()];
    }
    constructor(messageBus) {
        this.messageBus = messageBus;
        // TODO once again address the use of string here
        // via reflection or some other cheeky solution.
        // look at old mates code if you struggle. 
        // They've done it somehow
        messageBus.registerEventHandler('CardCreated', (e) => {
            this.#deckViews.set(e.id, {
                id: e.id,
                name: e.name,
                legalFormats: e.legalFormats,
                image: e.image,
            });
        });
    }
}

;// CONCATENATED MODULE: ./src/index.ts














// Repos
const deckRepo = new Repository(eventStore, Deck);
const cardRepo = new Repository(eventStore, Card);
// Projections
const deckProjection = new DeckProjection(messageBus);
const cardProjection = new CardProjection(messageBus);
messageBus.registerCommandHandlers([
    'NewDeckCommand',
    'AddToDeckCommand',
    'RenameDeckCommand',
    'ChangeDeckFormatCommand',
    'RemoveFromDeckCommand',
], new DeckCommandHandlers(deckRepo));
messageBus.registerCommandHandlers([
    'NewCardCommand'
], new CardCommandHandlers(cardRepo));
/**
 * TEST DATA
 */
const TEST_DECK_ID = "bf874a46-4c88-4492-a003-8ce6a33bac08";
messageBus.sendCommand(new NewDeckCommand(TEST_DECK_ID, "NewDeck", Format.MODERN));
const TEST_CARDS = [
    {
        "id": "0000579f-7b35-4ed3-b44c-db2a538066fe",
        "name": "Fury Sliver",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0000579f-7b35-4ed3-b44c-db2a538066fe.jpg?1562894979"
    },
    {
        "id": "00006596-1166-4a79-8443-ca9f82e6db4e",
        "name": "Kor Outfitter",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00006596-1166-4a79-8443-ca9f82e6db4e.jpg?1562609251"
    },
    {
        "id": "0000a54c-a511-4925-92dc-01b937f9afad",
        "name": "Spirit",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0000a54c-a511-4925-92dc-01b937f9afad.jpg?1562701869"
    },
    {
        "id": "0000cd57-91fe-411f-b798-646e965eec37",
        "name": "Siren Lookout",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0000cd57-91fe-411f-b798-646e965eec37.jpg?1562549609"
    },
    {
        "id": "00012bd8-ed68-4978-a22d-f450c8a6e048",
        "name": "Web",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Oldschool",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00012bd8-ed68-4978-a22d-f450c8a6e048.jpg?1559596693"
    },
    {
        "id": "0001f1ef-b957-4a55-b47f-14839cdbab6f",
        "name": "Venerable Knight",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0001f1ef-b957-4a55-b47f-14839cdbab6f.jpg?1572489814"
    },
    {
        "id": "00020b05-ecb9-4603-8cc1-8cfa7a14befc",
        "name": "Wildcall",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00020b05-ecb9-4603-8cc1-8cfa7a14befc.jpg?1562633475"
    },
    {
        "id": "0002ab72-834b-4c81-82b1-0d2760ea96b0",
        "name": "Mystic Skyfish",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0002ab72-834b-4c81-82b1-0d2760ea96b0.jpg?1596250027"
    },
    {
        "id": "00030770-5e99-4943-819d-8d807c24cc14",
        "name": "Swamp",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00030770-5e99-4943-819d-8d807c24cc14.jpg?1600716281"
    },
    {
        "id": "000366c8-7a43-49d7-a103-ac5bd7efd9aa",
        "name": "Swamp",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/000366c8-7a43-49d7-a103-ac5bd7efd9aa.jpg?1562052318"
    },
    {
        "id": "0003b07e-0d6e-4844-93c7-3f1f6a7d8c4d",
        "name": "Bronze Horse",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0003b07e-0d6e-4844-93c7-3f1f6a7d8c4d.jpg?1562894975"
    },
    {
        "id": "00042443-4d4e-4087-b4e5-5e781e7cc5fa",
        "name": "Wall of Vipers",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00042443-4d4e-4087-b4e5-5e781e7cc5fa.jpg?1562894988"
    },
    {
        "id": "0005968a-8708-441b-b9a1-9373aeb8114d",
        "name": "Mulch",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0005968a-8708-441b-b9a1-9373aeb8114d.jpg?1562700539"
    },
    {
        "id": "0005c844-787c-4f0c-8d25-85cec151642b",
        "name": "Whiptongue Hydra",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0005c844-787c-4f0c-8d25-85cec151642b.jpg?1592710235"
    },
    {
        "id": "000619be-f2b4-407d-a76c-7245d8cab7bd",
        "name": "Wall of Roots",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/000619be-f2b4-407d-a76c-7245d8cab7bd.jpg?1562164455"
    },
    {
        "id": "000809e6-2dd5-41cc-a316-3edb4e40eb58",
        "name": "Siren's Call",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Oldschool",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/000809e6-2dd5-41cc-a316-3edb4e40eb58.jpg?1559591503"
    },
    {
        "id": "000ac9e5-3c95-4e87-9424-109e2eea6b45",
        "name": "Blood Operative",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/000ac9e5-3c95-4e87-9424-109e2eea6b45.jpg?1572892902"
    },
    {
        "id": "000ba9c3-cd88-47c1-966a-00466569a9bf",
        "name": "Selvala's Enforcer",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/000ba9c3-cd88-47c1-966a-00466569a9bf.jpg?1562864254"
    },
    {
        "id": "000ce65b-5347-4a88-81af-be9053e4d3f3",
        "name": "Fresh Meat",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/000ce65b-5347-4a88-81af-be9053e4d3f3.jpg?1562875106"
    },
    {
        "id": "000d609c-deb7-4bd7-9c1d-e20fb3ed4f5f",
        "name": "Orzhov Guildgate",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/000d609c-deb7-4bd7-9c1d-e20fb3ed4f5f.jpg?1561813417"
    },
    {
        "id": "000edc61-b3ae-49e3-87f4-0250fa6a4501",
        "name": "Sinew Sliver",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/000edc61-b3ae-49e3-87f4-0250fa6a4501.jpg?1619393551"
    },
    {
        "id": "000eded9-854c-408a-aadf-c26209e27432",
        "name": "Charge",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/000eded9-854c-408a-aadf-c26209e27432.jpg?1562730460"
    },
    {
        "id": "000f1f50-08e5-4d83-8159-98f06a0e2279",
        "name": "Island",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/000f1f50-08e5-4d83-8159-98f06a0e2279.jpg?1572491305"
    },
    {
        "id": "00101358-0e89-4bd1-b1f2-e889645b616e",
        "name": "Novice Knight",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00101358-0e89-4bd1-b1f2-e889645b616e.jpg?1562300243"
    },
    {
        "id": "00107210-313f-49c1-84ff-92628f75b764",
        "name": "Fallen Askari",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00107210-313f-49c1-84ff-92628f75b764.jpg?1562276948"
    },
    {
        "id": "00108a1c-e620-4124-9b31-3bb3ff2a0407",
        "name": "Altar's Reap",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00108a1c-e620-4124-9b31-3bb3ff2a0407.jpg?1573508916"
    },
    {
        "id": "00111afb-26fe-487b-8d12-087cd8a8fe86",
        "name": "Odric, Master Tactician",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00111afb-26fe-487b-8d12-087cd8a8fe86.jpg?1591320115"
    },
    {
        "id": "0012621b-c0e1-48d6-99b9-ecca4763d748",
        "name": "Afflict",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0012621b-c0e1-48d6-99b9-ecca4763d748.jpg?1562895004"
    },
    {
        "id": "0013620d-8e17-4246-86bf-71eafd51b806",
        "name": "Invisible Stalker",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0013620d-8e17-4246-86bf-71eafd51b806.jpg?1562825313"
    },
    {
        "id": "0013a9c4-77a1-418d-85c2-bd68b65cd3d4",
        "name": "Dakkon, Shadow Slayer",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0013a9c4-77a1-418d-85c2-bd68b65cd3d4.jpg?1621544474"
    },
    {
        "id": "0014def3-4063-4929-ac51-76aef1bb2a68",
        "name": "Shahrazad",
        "legalFormats": [
            "Oldschool"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0014def3-4063-4929-ac51-76aef1bb2a68.jpg?1562895012"
    },
    {
        "id": "00154b70-57d2-4c32-860f-1c36fc49b10c",
        "name": "Destructive Tampering",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00154b70-57d2-4c32-860f-1c36fc49b10c.jpg?1576381772"
    },
    {
        "id": "0015ef55-4b85-4147-9974-b3ff4a1487c3",
        "name": "Harmonize",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0015ef55-4b85-4147-9974-b3ff4a1487c3.jpg?1591320837"
    },
    {
        "id": "0015fee8-068a-421e-9143-bcb575371f9a",
        "name": "Nocturnal Raid",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0015fee8-068a-421e-9143-bcb575371f9a.jpg?1562717466"
    },
    {
        "id": "0017de60-ee1c-4675-b04e-cdfa2c2a596e",
        "name": "Flensermite",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0017de60-ee1c-4675-b04e-cdfa2c2a596e.jpg?1562609238"
    },
    {
        "id": "0017e784-5f71-4f7a-aed5-2ceff2cac18b",
        "name": "Triskelion",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0017e784-5f71-4f7a-aed5-2ceff2cac18b.jpg?1583453177"
    },
    {
        "id": "001e8222-8dea-4767-8c13-21fb7ba556d7",
        "name": "Gate Smasher",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/001e8222-8dea-4767-8c13-21fb7ba556d7.jpg?1562781756"
    },
    {
        "id": "001eb913-2afe-4d7d-89a1-7c35de92d702",
        "name": "Island",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Oldschool",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/001eb913-2afe-4d7d-89a1-7c35de92d702.jpg?1540162762"
    },
    {
        "id": "0020a124-ba76-4d40-84e9-9803268d9f16",
        "name": "World Breaker",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0020a124-ba76-4d40-84e9-9803268d9f16.jpg?1562895014"
    },
    {
        "id": "00215182-51bd-4c7e-9675-179749a25a07",
        "name": "Mad Auntie",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00215182-51bd-4c7e-9675-179749a25a07.jpg?1561965987"
    },
    {
        "id": "00223901-d462-41b0-9749-b093058f682f",
        "name": "Coral Eel",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00223901-d462-41b0-9749-b093058f682f.jpg?1562730475"
    },
    {
        "id": "002715a3-b84f-40ba-8fa9-6b2854626f4d",
        "name": "Lurking Nightstalker",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/002715a3-b84f-40ba-8fa9-6b2854626f4d.jpg?1562895018"
    },
    {
        "id": "0027e323-4f5a-412b-868d-6fb3a0c8050a",
        "name": "Spark Spray",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0027e323-4f5a-412b-868d-6fb3a0c8050a.jpg?1562895016"
    },
    {
        "id": "0027e5ca-8046-40a0-bd73-79be55f28bff",
        "name": "Remand",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0027e5ca-8046-40a0-bd73-79be55f28bff.jpg?1592754515"
    },
    {
        "id": "00293ce4-3475-4064-8510-9e8c02faf3bf",
        "name": "Plains",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00293ce4-3475-4064-8510-9e8c02faf3bf.jpg?1592674050"
    },
    {
        "id": "00298672-079c-4c92-9916-0bc2893898d0",
        "name": "Plains",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00298672-079c-4c92-9916-0bc2893898d0.jpg?1562895031"
    },
    {
        "id": "0029955b-32a5-4dd8-8a8c-5c80cdfd13aa",
        "name": "Edric, Spymaster of Trest",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Penny",
            "Commander"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0029955b-32a5-4dd8-8a8c-5c80cdfd13aa.jpg?1562864258"
    },
    {
        "id": "002ad179-ddf4-4f48-9504-cfa02e11a52e",
        "name": "Clearwater Pathway // Clearwater Pathway",
        "legalFormats": [],
        "image": ""
    },
    {
        "id": "002cf7d8-3fc2-48eb-a727-a1ce5a049665",
        "name": "Bubbling Beebles",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/002cf7d8-3fc2-48eb-a727-a1ce5a049665.jpg?1562443310"
    },
    {
        "id": "0030407c-9aa0-49ad-b2d6-cde0adbd9d09",
        "name": "Unholy Strength",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0030407c-9aa0-49ad-b2d6-cde0adbd9d09.jpg?1562231343"
    },
    {
        "id": "0031d026-9e9a-46f6-8204-1acfee8b8809",
        "name": "Forest",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0031d026-9e9a-46f6-8204-1acfee8b8809.jpg?1561894880"
    },
    {
        "id": "00320106-ce51-46a9-b0f9-79b3baf4e505",
        "name": "Consecrate // Consume",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00320106-ce51-46a9-b0f9-79b3baf4e505.jpg?1584832033"
    },
    {
        "id": "00323a16-8bfd-49af-b073-8f0b23a9d947",
        "name": "Thornwood Falls",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00323a16-8bfd-49af-b073-8f0b23a9d947.jpg?1580015367"
    },
    {
        "id": "00325992-ec1c-469a-8df0-ffb9a197d221",
        "name": "Goblin Bowling Team",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00325992-ec1c-469a-8df0-ffb9a197d221.jpg?1562799056"
    },
    {
        "id": "0032a2ab-a385-47e4-843b-1ac677032dc4",
        "name": "Elvish Aberration",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0032a2ab-a385-47e4-843b-1ac677032dc4.jpg?1561756565"
    },
    {
        "id": "00341664-d848-44d2-ba06-21a6ae8e6788",
        "name": "Wings of Aesthir",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00341664-d848-44d2-ba06-21a6ae8e6788.jpg?1562867376"
    },
    {
        "id": "0034d32c-cc82-48d7-a913-d58cc3d3afeb",
        "name": "Mwonvuli Beast Tracker",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0034d32c-cc82-48d7-a913-d58cc3d3afeb.jpg?1591694417"
    },
    {
        "id": "0034ed95-a296-44c1-a084-e03c57c1865f",
        "name": "Return to Dust",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0034ed95-a296-44c1-a084-e03c57c1865f.jpg?1620529378"
    },
    {
        "id": "00365412-41db-427c-9109-8f69c17c326d",
        "name": "Shock",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00365412-41db-427c-9109-8f69c17c326d.jpg?1576381909"
    },
    {
        "id": "0038ac6a-318f-44fb-bb64-7ae172c4aca3",
        "name": "Walk the Plank",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0038ac6a-318f-44fb-bb64-7ae172c4aca3.jpg?1562549640"
    },
    {
        "id": "0038ea4d-d0a6-44a4-bee6-24c03313d2bc",
        "name": "Sphinx's Revelation",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0038ea4d-d0a6-44a4-bee6-24c03313d2bc.jpg?1593814610"
    },
    {
        "id": "0039b1f3-6bcd-4578-af5b-e13fb2036ef2",
        "name": "Mise",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0039b1f3-6bcd-4578-af5b-e13fb2036ef2.jpg?1562487436"
    },
    {
        "id": "0039ead5-2afa-49d6-ae4a-45ae2118188a",
        "name": "Kor Entanglers",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0039ead5-2afa-49d6-ae4a-45ae2118188a.jpg?1562895068"
    },
    {
        "id": "003bc8f1-f282-491c-984d-1ce7ac027053",
        "name": "Spread the Sickness",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/003bc8f1-f282-491c-984d-1ce7ac027053.jpg?1562258478"
    },
    {
        "id": "003c6e4d-16f4-4ce8-9df2-a59e736b52cd",
        "name": "Izoni, Thousand-Eyed",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/003c6e4d-16f4-4ce8-9df2-a59e736b52cd.jpg?1541005763"
    },
    {
        "id": "003db299-c62b-405e-9833-5ebaef9c8301",
        "name": "Duelist's Heritage",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/003db299-c62b-405e-9833-5ebaef9c8301.jpg?1562385690"
    },
    {
        "id": "003dc436-a3af-4e65-b4f8-387155fbcb85",
        "name": "Lazav, Dimir Mastermind",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/003dc436-a3af-4e65-b4f8-387155fbcb85.jpg?1604194919"
    },
    {
        "id": "003e99a0-2caa-407b-be40-92ec17836eb3",
        "name": "Celestial Kirin",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/003e99a0-2caa-407b-be40-92ec17836eb3.jpg?1562492050"
    },
    {
        "id": "004237f7-1099-4422-9ce9-6065a803e230",
        "name": "Snapdax, Apex of the Hunt",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/004237f7-1099-4422-9ce9-6065a803e230.jpg?1591310946"
    },
    {
        "id": "00427d72-b140-45eb-b2ec-2ac2dab16966",
        "name": "Ornithopter",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Oldschool",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00427d72-b140-45eb-b2ec-2ac2dab16966.jpg?1562588733"
    },
    {
        "id": "00429670-c439-4bd5-bd64-3ac7d352c68e",
        "name": "Kamahl, Pit Fighter",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00429670-c439-4bd5-bd64-3ac7d352c68e.jpg?1561756567"
    },
    {
        "id": "0042d67c-2466-4c20-816e-92e476e545cc",
        "name": "Saheeli's Directive",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0042d67c-2466-4c20-816e-92e476e545cc.jpg?1545872568"
    },
    {
        "id": "00444e40-7436-48c3-9cbb-e6d8b96c1a3a",
        "name": "Festering Goblin",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00444e40-7436-48c3-9cbb-e6d8b96c1a3a.jpg?1562730486"
    },
    {
        "id": "00464232-2594-405a-95bb-f9b2a3287871",
        "name": "Orzhov Advokist",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00464232-2594-405a-95bb-f9b2a3287871.jpg?1562385692"
    },
    {
        "id": "0046b802-bc71-44af-8925-666684d5fc87",
        "name": "Initiate's Companion",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0046b802-bc71-44af-8925-666684d5fc87.jpg?1592578758"
    },
    {
        "id": "0047302d-4e3d-4327-9bb2-ecd5b00b00e3",
        "name": "Tsabo's Assassin",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0047302d-4e3d-4327-9bb2-ecd5b00b00e3.jpg?1562895043"
    },
    {
        "id": "0049e68d-0caf-474f-9523-dad343f1250a",
        "name": "Hogaak, Arisen Necropolis",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0049e68d-0caf-474f-9523-dad343f1250a.jpg?1570653053"
    },
    {
        "id": "004a0178-b523-473f-8410-480e6aaec242",
        "name": "Survival of the Fittest",
        "legalFormats": [
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/004a0178-b523-473f-8410-480e6aaec242.jpg?1562895025"
    },
    {
        "id": "004af467-815a-47c0-a974-1ae49ca3a1a8",
        "name": "Jasmine Boreal",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Oldschool"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/004af467-815a-47c0-a974-1ae49ca3a1a8.jpg?1562770875"
    },
    {
        "id": "004b44af-9b27-4689-a6b6-bcd3ad0aca7e",
        "name": "Bone Dragon",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/004b44af-9b27-4689-a6b6-bcd3ad0aca7e.jpg?1562895090"
    },
    {
        "id": "004b6463-0aef-4419-b4f2-dc3fa6eee901",
        "name": "Psychic Venom",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel",
            "Oldschool",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/004b6463-0aef-4419-b4f2-dc3fa6eee901.jpg?1562588734"
    },
    {
        "id": "004d5c22-415c-4aa8-87f6-a4cf609d1eae",
        "name": "Fire Elemental",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/004d5c22-415c-4aa8-87f6-a4cf609d1eae.jpg?1557432085"
    },
    {
        "id": "004e1457-d951-4029-8bb6-17a290793e79",
        "name": "Grizzly Fate",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/004e1457-d951-4029-8bb6-17a290793e79.jpg?1562895050"
    },
    {
        "id": "004eefa4-947b-45fc-b45c-5263bfd763bc",
        "name": "Ancient Spring",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/004eefa4-947b-45fc-b45c-5263bfd763bc.jpg?1562895051"
    },
    {
        "id": "00508913-ba8c-4985-9547-d74e07e1cc6b",
        "name": "Sengir Vampire",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00508913-ba8c-4985-9547-d74e07e1cc6b.jpg?1597377088"
    },
    {
        "id": "0050be51-8c4e-4b97-b171-ede5fadfd141",
        "name": "Digsite Engineer",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0050be51-8c4e-4b97-b171-ede5fadfd141.jpg?1618169816"
    },
    {
        "id": "0052158b-58d1-4416-a7ce-7c6a7595263c",
        "name": "Belbe's Armor",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0052158b-58d1-4416-a7ce-7c6a7595263c.jpg?1562628387"
    },
    {
        "id": "00522c4b-4e64-4403-96b1-df41afbe255f",
        "name": "Slinking Skirge",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00522c4b-4e64-4403-96b1-df41afbe255f.jpg?1562443312"
    },
    {
        "id": "00536ba7-1865-4895-8314-da8949d261c9",
        "name": "Thalakos Lowlands",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00536ba7-1865-4895-8314-da8949d261c9.jpg?1562895099"
    },
    {
        "id": "0053bd00-90fd-48c2-8f79-952d5d1e3e74",
        "name": "Spined Wurm",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0053bd00-90fd-48c2-8f79-952d5d1e3e74.jpg?1562445660"
    },
    {
        "id": "0055934f-1567-4207-aaad-d32d0fe1cdba",
        "name": "Grim Captain's Call",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0055934f-1567-4207-aaad-d32d0fe1cdba.jpg?1562549649"
    },
    {
        "id": "00574054-7fac-4d77-a955-06e49fb01ae1",
        "name": "Catastrophe",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00574054-7fac-4d77-a955-06e49fb01ae1.jpg?1562895101"
    },
    {
        "id": "0057bac8-7600-422e-88ef-accf1d0bb4ef",
        "name": "Beledros Witherbloom",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0057bac8-7600-422e-88ef-accf1d0bb4ef.jpg?1620579805"
    },
    {
        "id": "0057c2ae-ea4f-404a-ab95-f3979efd1b3b",
        "name": "Enchanted Carriage",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0057c2ae-ea4f-404a-ab95-f3979efd1b3b.jpg?1572490964"
    },
    {
        "id": "0057f94e-c2be-44e1-a93b-e31432f4ffa5",
        "name": "Insect",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0057f94e-c2be-44e1-a93b-e31432f4ffa5.jpg?1562086858"
    },
    {
        "id": "0058be07-a8a1-448e-8c3d-61718cb384ec",
        "name": "Floodbringer",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0058be07-a8a1-448e-8c3d-61718cb384ec.jpg?1562875117"
    },
    {
        "id": "0059d21b-0725-4806-8691-2451db36787f",
        "name": "Phyresis",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0059d21b-0725-4806-8691-2451db36787f.jpg?1562609245"
    },
    {
        "id": "005a19e2-c334-4b87-bc8b-55f62fc9abd9",
        "name": "Banewhip Punisher",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/005a19e2-c334-4b87-bc8b-55f62fc9abd9.jpg?1562787211"
    },
    {
        "id": "005a993c-5111-4364-9fba-75b3d94a8296",
        "name": "Mountain",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Oldschool",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/005a993c-5111-4364-9fba-75b3d94a8296.jpg?1559591904"
    },
    {
        "id": "005ad65e-cf0b-48e9-a314-2ebba5a1400c",
        "name": "Nin, the Pain Artist",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/005ad65e-cf0b-48e9-a314-2ebba5a1400c.jpg?1562598065"
    },
    {
        "id": "005ae9a2-b235-49ee-ae54-6875e087f43d",
        "name": "Corpse Traders",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/005ae9a2-b235-49ee-ae54-6875e087f43d.jpg?1592754744"
    },
    {
        "id": "005b9531-3b50-4d13-9ed5-a42d961ab6af",
        "name": "Zodiac Rabbit",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/005b9531-3b50-4d13-9ed5-a42d961ab6af.jpg?1562542499"
    },
    {
        "id": "005b9fec-66de-4079-88e0-c7de7e22d18e",
        "name": "Rite of the Serpent",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/005b9fec-66de-4079-88e0-c7de7e22d18e.jpg?1562781741"
    },
    {
        "id": "005be4aa-9800-4f68-b341-90328dc34d13",
        "name": "Scourge of Fleets",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/005be4aa-9800-4f68-b341-90328dc34d13.jpg?1605370826"
    },
    {
        "id": "005c5a29-0cf5-4f14-83cc-f8b0ba40e8bf",
        "name": "Maro's Gone Nuts",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/005c5a29-0cf5-4f14-83cc-f8b0ba40e8bf.jpg?1582674200"
    },
    {
        "id": "005dae9a-dddc-4a11-95bb-cce319edcce4",
        "name": "Skullclamp",
        "legalFormats": [
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/005dae9a-dddc-4a11-95bb-cce319edcce4.jpg?1561930373"
    },
    {
        "id": "005edd3a-238d-471a-8d5b-2df735c49f67",
        "name": "Skullmane Baku",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/005edd3a-238d-471a-8d5b-2df735c49f67.jpg?1562875119"
    },
    {
        "id": "00604865-a6af-4ce1-8010-f9c276c2c945",
        "name": "Pia Nalaar",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00604865-a6af-4ce1-8010-f9c276c2c945.jpg?1562895058"
    },
    {
        "id": "0061031e-4189-492f-a55c-aef827c0c6ae",
        "name": "Shatterskull Charger",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0061031e-4189-492f-a55c-aef827c0c6ae.jpg?1607365341"
    },
    {
        "id": "00615487-3526-4b4c-bb06-8f2af1f101d0",
        "name": "Infected Vermin",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00615487-3526-4b4c-bb06-8f2af1f101d0.jpg?1562895063"
    },
    {
        "id": "006313f8-cc60-4a4e-8ec6-953cdf1c16e3",
        "name": "Venerable Warsinger",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006313f8-cc60-4a4e-8ec6-953cdf1c16e3.jpg?1617474312"
    },
    {
        "id": "0063ed19-494b-4199-9120-d479bfcb625a",
        "name": "Murderous Betrayal",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0063ed19-494b-4199-9120-d479bfcb625a.jpg?1562895062"
    },
    {
        "id": "00652c09-c50c-40da-8f0f-86b5cc3f6c26",
        "name": "Eyeblight Massacre",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00652c09-c50c-40da-8f0f-86b5cc3f6c26.jpg?1620529820"
    },
    {
        "id": "0066c7a6-7775-43ba-81cd-35fbc5621bc3",
        "name": "Raise Dead",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Oldschool",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0066c7a6-7775-43ba-81cd-35fbc5621bc3.jpg?1559591661"
    },
    {
        "id": "006871fd-2641-42cb-a2ac-a33d05fc5a35",
        "name": "Saprazzan Skerry",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006871fd-2641-42cb-a2ac-a33d05fc5a35.jpg?1562378939"
    },
    {
        "id": "00694044-99c9-49f1-9e93-274d702a59f8",
        "name": "Elder Gargaroth",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00694044-99c9-49f1-9e93-274d702a59f8.jpg?1596311641"
    },
    {
        "id": "006a2cce-dd8f-47d5-aedd-135e51ecfa23",
        "name": "Jan Tomcani Bio",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006a2cce-dd8f-47d5-aedd-135e51ecfa23.jpg?1563217273"
    },
    {
        "id": "006b0048-8a84-469c-974f-b75177b4dd81",
        "name": "Enigma Drake",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006b0048-8a84-469c-974f-b75177b4dd81.jpg?1597251081"
    },
    {
        "id": "006b5000-2a8f-4020-9dbf-7170da13b54e",
        "name": "Sphinx Summoner",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006b5000-2a8f-4020-9dbf-7170da13b54e.jpg?1562799057"
    },
    {
        "id": "006b5880-eb49-4198-930c-39a85ff6ec66",
        "name": "Blessing of Frost",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006b5880-eb49-4198-930c-39a85ff6ec66.jpg?1612987486"
    },
    {
        "id": "006c118e-b5c7-4726-acee-59132f23e4fc",
        "name": "Saproling",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006c118e-b5c7-4726-acee-59132f23e4fc.jpg?1561756349"
    },
    {
        "id": "006c18cf-b6d2-4fba-b9da-c9762fb3885b",
        "name": "Worship",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006c18cf-b6d2-4fba-b9da-c9762fb3885b.jpg?1562895069"
    },
    {
        "id": "006cbb74-7447-45fb-b44b-bac31832b392",
        "name": "Duress",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006cbb74-7447-45fb-b44b-bac31832b392.jpg?1562549670"
    },
    {
        "id": "006d1cf4-bdf2-4ed3-8583-38309807ce93",
        "name": "Miara, Thorn of the Glade",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006d1cf4-bdf2-4ed3-8583-38309807ce93.jpg?1612487303"
    },
    {
        "id": "006d2bf1-20f7-4b09-8d98-8233d91682bd",
        "name": "Flame Slash",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006d2bf1-20f7-4b09-8d98-8233d91682bd.jpg?1562700549"
    },
    {
        "id": "006e0990-0596-4537-aced-51ac499938af",
        "name": "Forest",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006e0990-0596-4537-aced-51ac499938af.jpg?1562229259"
    },
    {
        "id": "006ead4a-dc57-4856-8e13-235ba55483e6",
        "name": "Touch of the Void",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006ead4a-dc57-4856-8e13-235ba55483e6.jpg?1562895118"
    },
    {
        "id": "006fa597-c469-4c9c-a14f-f09e1074392b",
        "name": "Guardian Angel",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel",
            "Oldschool"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/006fa597-c469-4c9c-a14f-f09e1074392b.jpg?1559591797"
    },
    {
        "id": "0070651d-79aa-4ea6-b703-6ecd3528b548",
        "name": "Warrant // Warden",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0070651d-79aa-4ea6-b703-6ecd3528b548.jpg?1600989505"
    },
    {
        "id": "0070bbf6-fdee-44ec-bfb8-3e99d6338e6e",
        "name": "Sparkspitter",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0070bbf6-fdee-44ec-bfb8-3e99d6338e6e.jpg?1573512621"
    },
    {
        "id": "00717f7c-0778-4a02-b6c0-b3c3f07e75a9",
        "name": "Hold the Perimeter",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00717f7c-0778-4a02-b6c0-b3c3f07e75a9.jpg?1576381482"
    },
    {
        "id": "0071bf6e-a78b-4286-b3e7-acf44631a001",
        "name": "Lightning Shrieker",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0071bf6e-a78b-4286-b3e7-acf44631a001.jpg?1562821887"
    },
    {
        "id": "0071c208-c5cc-49f2-83d7-b4d2a71a0a31",
        "name": "Atris, Oracle of Half-Truths",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0071c208-c5cc-49f2-83d7-b4d2a71a0a31.jpg?1581630508"
    },
    {
        "id": "0072cf13-284b-4fb8-ab2c-b2e15388a30a",
        "name": "Diamond Faerie",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0072cf13-284b-4fb8-ab2c-b2e15388a30a.jpg?1593275523"
    },
    {
        "id": "0073802c-2758-49e7-8b1f-8113704ed8a3",
        "name": "Finale of Promise",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0073802c-2758-49e7-8b1f-8113704ed8a3.jpg?1557640373"
    },
    {
        "id": "00760b58-8a7d-44fa-a5e7-9df54c21c77d",
        "name": "Laelia, the Blade Reforged",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00760b58-8a7d-44fa-a5e7-9df54c21c77d.jpg?1618151375"
    },
    {
        "id": "00775f44-fbe6-41ee-9977-d13d1fb5b6fb",
        "name": "Cyclopean Tomb",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Oldschool"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00775f44-fbe6-41ee-9977-d13d1fb5b6fb.jpg?1559591832"
    },
    {
        "id": "0079326b-ef87-49b8-9772-9134fb5deb3e",
        "name": "Grove of the Guardian",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0079326b-ef87-49b8-9772-9134fb5deb3e.jpg?1541002954"
    },
    {
        "id": "007a5c8c-ed0b-4844-9393-a3d25d4ffa1d",
        "name": "Deadly Alliance",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/007a5c8c-ed0b-4844-9393-a3d25d4ffa1d.jpg?1604195436"
    },
    {
        "id": "007b526c-5387-4ed4-a320-b826d507e014",
        "name": "Deep-Sea Terror",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/007b526c-5387-4ed4-a320-b826d507e014.jpg?1562004585"
    },
    {
        "id": "007c828b-5854-41ac-9c18-f9d41c69ed33",
        "name": "Rhino",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/007c828b-5854-41ac-9c18-f9d41c69ed33.jpg?1563073152"
    },
    {
        "id": "007ce039-def1-4039-a0a0-ba72e8872dc5",
        "name": "Steamflogger Boss",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/007ce039-def1-4039-a0a0-ba72e8872dc5.jpg?1611976597"
    },
    {
        "id": "007d0556-ccc4-47c5-b2ab-54b9681b74ee",
        "name": "Immaculate Magistrate",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/007d0556-ccc4-47c5-b2ab-54b9681b74ee.jpg?1593813597"
    },
    {
        "id": "007f0aab-e4e1-48dd-b333-76dd5c7ebe67",
        "name": "Soul of Eternity",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/007f0aab-e4e1-48dd-b333-76dd5c7ebe67.jpg?1608918383"
    },
    {
        "id": "007f1787-0d40-4fbd-b774-df891a0e5620",
        "name": "Jaya Ballard",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/007f1787-0d40-4fbd-b774-df891a0e5620.jpg?1562895130"
    },
    {
        "id": "00832a47-dec8-411e-9708-b3ebbd3a2dfc",
        "name": "Llanowar",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00832a47-dec8-411e-9708-b3ebbd3a2dfc.jpg?1547432491"
    },
    {
        "id": "0084ba4e-98eb-4eb4-b23e-c5ab4d7d95cb",
        "name": "Refresh",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0084ba4e-98eb-4eb4-b23e-c5ab4d7d95cb.jpg?1562895117"
    },
    {
        "id": "00850712-704b-46af-93e6-51d7d79832f9",
        "name": "Bone Picker",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00850712-704b-46af-93e6-51d7d79832f9.jpg?1597172099"
    },
    {
        "id": "0088098e-c6b5-4483-be3e-d4ffd6ff64b1",
        "name": "Zodiac Ox",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0088098e-c6b5-4483-be3e-d4ffd6ff64b1.jpg?1562542504"
    },
    {
        "id": "0088e145-d402-42bb-98b5-af33901de44a",
        "name": "Alesha, Who Smiles at Death",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0088e145-d402-42bb-98b5-af33901de44a.jpg?1591320536"
    },
    {
        "id": "008b1ea5-1a8d-4a9d-b208-421fea2f9c58",
        "name": "Nissa, Vastwood Seer // Nissa, Sage Animist",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": ""
    },
    {
        "id": "008c8d72-097e-472d-88c8-78bf29e42e32",
        "name": "Spurnmage Advocate",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/008c8d72-097e-472d-88c8-78bf29e42e32.jpg?1562628404"
    },
    {
        "id": "008c9605-7652-4ef6-9742-de325168141e",
        "name": "Linvala, Shield of Sea Gate",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/008c9605-7652-4ef6-9742-de325168141e.jpg?1607365051"
    },
    {
        "id": "008d3b2e-a5e6-4ac2-85a0-82628333b80c",
        "name": "Construct",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/008d3b2e-a5e6-4ac2-85a0-82628333b80c.jpg?1618767999"
    },
    {
        "id": "008d7611-eaee-4474-bf16-30d11b5d310f",
        "name": "Lake of the Dead",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/008d7611-eaee-4474-bf16-30d11b5d310f.jpg?1562542510"
    },
    {
        "id": "008de17e-aa79-4d4c-ab66-d516eca49e42",
        "name": "Consuming Vapors",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/008de17e-aa79-4d4c-ab66-d516eca49e42.jpg?1562700551"
    },
    {
        "id": "008df307-f010-47bc-8548-65a1c7b1c4b8",
        "name": "Spell Blast",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Oldschool",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/008df307-f010-47bc-8548-65a1c7b1c4b8.jpg?1559601144"
    },
    {
        "id": "00906b47-6316-4e00-bbf5-b801ab583f4f",
        "name": "Pelakka Wurm",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00906b47-6316-4e00-bbf5-b801ab583f4f.jpg?1562300248"
    },
    {
        "id": "00924a16-fb85-41a4-bd7a-88f51f728333",
        "name": "Ripscale Predator",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00924a16-fb85-41a4-bd7a-88f51f728333.jpg?1608910367"
    },
    {
        "id": "0092d7a0-bd00-45e5-a052-c0a9d970bc2e",
        "name": "Twinblade Slasher",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0092d7a0-bd00-45e5-a052-c0a9d970bc2e.jpg?1562895101"
    },
    {
        "id": "009521db-a4e5-43d7-9ef0-710c69a4f797",
        "name": "Beastmaster Ascension",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/009521db-a4e5-43d7-9ef0-710c69a4f797.jpg?1561930380"
    },
    {
        "id": "0095225d-ba7d-4ccc-b730-1bed46c840eb",
        "name": "Plains",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0095225d-ba7d-4ccc-b730-1bed46c840eb.jpg?1539399107"
    },
    {
        "id": "0095245c-a30e-4e2a-88c9-632c678e9f03",
        "name": "Gemrazer",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0095245c-a30e-4e2a-88c9-632c678e9f03.jpg?1591227650"
    },
    {
        "id": "0095c374-5edf-41c2-b597-f6e18b348170",
        "name": "Nezumi Cutthroat",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0095c374-5edf-41c2-b597-f6e18b348170.jpg?1562895133"
    },
    {
        "id": "00963993-ff4d-4cc6-a7e0-ed8adac40bfd",
        "name": "Zealous Persecution",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00963993-ff4d-4cc6-a7e0-ed8adac40bfd.jpg?1562895154"
    },
    {
        "id": "009661e7-c704-43a1-82e3-7da0b609844e",
        "name": "Lady Zhurong, Warrior Queen",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/009661e7-c704-43a1-82e3-7da0b609844e.jpg?1562255446"
    },
    {
        "id": "0097101d-e63d-4785-8c68-5d2fca3ded78",
        "name": "Hunting Wilds",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0097101d-e63d-4785-8c68-5d2fca3ded78.jpg?1592710936"
    },
    {
        "id": "009b1aff-a8c7-4032-ab29-a77c94c5af59",
        "name": "Manabarbs",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/009b1aff-a8c7-4032-ab29-a77c94c5af59.jpg?1562542876"
    },
    {
        "id": "009c5aac-194f-4b95-8f69-cc74aa15c3a5",
        "name": "Temur Charm",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/009c5aac-194f-4b95-8f69-cc74aa15c3a5.jpg?1591321473"
    },
    {
        "id": "009d2fb8-6144-46d9-9085-26232c174109",
        "name": "Necrotic Hex",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/009d2fb8-6144-46d9-9085-26232c174109.jpg?1608909836"
    },
    {
        "id": "00a1209e-c4c3-4250-ad36-ef451f5e34cd",
        "name": "Hellion",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00a1209e-c4c3-4250-ad36-ef451f5e34cd.jpg?1562701871"
    },
    {
        "id": "00a26fdf-fdce-4939-8c6a-c9dff623072f",
        "name": "Inventor's Goggles",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00a26fdf-fdce-4939-8c6a-c9dff623072f.jpg?1576383234"
    },
    {
        "id": "00a28b9d-1bd2-4ca4-a1e1-4138891d6739",
        "name": "Blockbuster",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00a28b9d-1bd2-4ca4-a1e1-4138891d6739.jpg?1598915355"
    },
    {
        "id": "00a4ffc1-7731-42d9-b970-2a8d84cba14d",
        "name": "Nature's Lore",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00a4ffc1-7731-42d9-b970-2a8d84cba14d.jpg?1562588736"
    },
    {
        "id": "00a52735-fb3b-4e61-a07f-f6d1cd433a75",
        "name": "Eron the Relentless",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00a52735-fb3b-4e61-a07f-f6d1cd433a75.jpg?1562895149"
    },
    {
        "id": "00a80eae-6a58-4833-80fa-2c22d531b9d1",
        "name": "Colossus of Sardia",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00a80eae-6a58-4833-80fa-2c22d531b9d1.jpg?1562542882"
    },
    {
        "id": "00a8776a-58f2-4a42-8919-2dd255f3f577",
        "name": "Krosan Verge",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00a8776a-58f2-4a42-8919-2dd255f3f577.jpg?1592711571"
    },
    {
        "id": "00a9bcaf-47ea-406e-ac51-e68ba181214a",
        "name": "Monk Idealist",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00a9bcaf-47ea-406e-ac51-e68ba181214a.jpg?1562700566"
    },
    {
        "id": "00ad3531-399c-4897-b0ee-ad2a26445a17",
        "name": "Mercadian Atlas",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00ad3531-399c-4897-b0ee-ad2a26445a17.jpg?1562378940"
    },
    {
        "id": "00adcfec-9893-48e7-b905-158eac5497f2",
        "name": "Drannith Magistrate",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00adcfec-9893-48e7-b905-158eac5497f2.jpg?1591311426"
    },
    {
        "id": "00ae906b-2c4d-48e9-9f2d-217777e22292",
        "name": "Thermokarst",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00ae906b-2c4d-48e9-9f2d-217777e22292.jpg?1562895150"
    },
    {
        "id": "00aef0cf-8b96-4120-9ef4-16203b7c6b9b",
        "name": "Knight of the White Orchid",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00aef0cf-8b96-4120-9ef4-16203b7c6b9b.jpg?1618015353"
    },
    {
        "id": "00afdd58-a6e3-490c-8ff5-3d761fcd3885",
        "name": "Nomads' Assembly",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00afdd58-a6e3-490c-8ff5-3d761fcd3885.jpg?1561930387"
    },
    {
        "id": "00b016d7-e7ac-4958-b21e-82324b001369",
        "name": "Disintegrate",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Oldschool",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00b016d7-e7ac-4958-b21e-82324b001369.jpg?1559592814"
    },
    {
        "id": "00b33e71-ef08-4aeb-bca2-a2a4a43c2e0d",
        "name": "Ajani, the Greathearted",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00b33e71-ef08-4aeb-bca2-a2a4a43c2e0d.jpg?1579260110"
    },
    {
        "id": "00b361e3-8aaa-4194-8ae8-45bdb70c97bb",
        "name": "Gift of Paradise",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00b361e3-8aaa-4194-8ae8-45bdb70c97bb.jpg?1608910670"
    },
    {
        "id": "00b65a4b-d0d9-4439-96f9-0e0dd532c824",
        "name": "Telepathy",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00b65a4b-d0d9-4439-96f9-0e0dd532c824.jpg?1562231349"
    },
    {
        "id": "00b8fe63-1968-4a56-958d-903f0ebf3a75",
        "name": "Temple of the False God",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00b8fe63-1968-4a56-958d-903f0ebf3a75.jpg?1561930388"
    },
    {
        "id": "00b9ac91-51e4-4653-ac2a-da166a894f2a",
        "name": "Nikara, Lair Scavenger",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00b9ac91-51e4-4653-ac2a-da166a894f2a.jpg?1591234210"
    },
    {
        "id": "00ba9fa2-bfd2-4dc7-b96d-d22a8886a6ae",
        "name": "Rescuer Sphinx",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00ba9fa2-bfd2-4dc7-b96d-d22a8886a6ae.jpg?1557576298"
    },
    {
        "id": "00bbaefd-e7dc-4870-ad9c-e94e27de3860",
        "name": "Forest",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00bbaefd-e7dc-4870-ad9c-e94e27de3860.jpg?1551119690"
    },
    {
        "id": "00bd8485-d63a-4077-a3d1-4d0f2f4d8035",
        "name": "Elvish Healer",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00bd8485-d63a-4077-a3d1-4d0f2f4d8035.jpg?1562895157"
    },
    {
        "id": "00beba34-54cc-4a30-8424-71a1215647a6",
        "name": "Mirror Gallery",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00beba34-54cc-4a30-8424-71a1215647a6.jpg?1562875125"
    },
    {
        "id": "00bfc923-4f6b-4c6f-b74f-ddf95a3459f8",
        "name": "Tempt with Discovery",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00bfc923-4f6b-4c6f-b74f-ddf95a3459f8.jpg?1562895142"
    },
    {
        "id": "00bff927-0727-4ce1-918b-d32474194fd9",
        "name": "Underworld Dreams",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00bff927-0727-4ce1-918b-d32474194fd9.jpg?1562542520"
    },
    {
        "id": "00c050c3-4f50-4bb6-8477-6737887ca10d",
        "name": "Loxodon Convert",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00c050c3-4f50-4bb6-8477-6737887ca10d.jpg?1562875113"
    },
    {
        "id": "00c1c7c9-ca58-465a-9001-05e1c7baa51a",
        "name": "Grim Lavamancer",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00c1c7c9-ca58-465a-9001-05e1c7baa51a.jpg?1561756573"
    },
    {
        "id": "00c48e08-9a77-4ba2-8041-90998f7e3812",
        "name": "Dread Specter",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00c48e08-9a77-4ba2-8041-90998f7e3812.jpg?1562717468"
    },
    {
        "id": "00c57090-c1fe-4100-a03c-95607074280e",
        "name": "Fleshformer",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00c57090-c1fe-4100-a03c-95607074280e.jpg?1562799064"
    },
    {
        "id": "00c74207-577c-4eab-9759-4cab76c17f2c",
        "name": "Island",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00c74207-577c-4eab-9759-4cab76c17f2c.jpg?1562271990"
    },
    {
        "id": "00c77bdd-6e82-4330-b4e4-aa147838e365",
        "name": "Call the Bloodline",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00c77bdd-6e82-4330-b4e4-aa147838e365.jpg?1575935476"
    },
    {
        "id": "00c7d94f-3760-4c97-b0bf-c895f4132c7f",
        "name": "Needlepeak Spider",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00c7d94f-3760-4c97-b0bf-c895f4132c7f.jpg?1619397300"
    },
    {
        "id": "00c81160-192c-4077-8ed1-3643919a2025",
        "name": "Orazca Frillback",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00c81160-192c-4077-8ed1-3643919a2025.jpg?1555040703"
    },
    {
        "id": "00c833d3-d406-4c24-a4ab-9302fc27497e",
        "name": "Search for Glory",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00c833d3-d406-4c24-a4ab-9302fc27497e.jpg?1613073201"
    },
    {
        "id": "00c8543f-5c5d-4b1a-ad96-f154f1914608",
        "name": "Mist Raven",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00c8543f-5c5d-4b1a-ad96-f154f1914608.jpg?1593813089"
    },
    {
        "id": "00c8f94a-7690-47f5-b664-61411a32ab74",
        "name": "Contagion",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00c8f94a-7690-47f5-b664-61411a32ab74.jpg?1562767761"
    },
    {
        "id": "00c92601-11b9-4e7c-bc81-882085f3fae6",
        "name": "Crystal Rod",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Oldschool",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00c92601-11b9-4e7c-bc81-882085f3fae6.jpg?1559591942"
    },
    {
        "id": "00cab68b-ee26-46eb-a18b-9b42bf2d10e5",
        "name": "Ghor-Clan Bloodscale",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00cab68b-ee26-46eb-a18b-9b42bf2d10e5.jpg?1593272312"
    },
    {
        "id": "00cb17a0-5a13-4d02-b7fb-f99531bc8ca5",
        "name": "Dark Depths",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00cb17a0-5a13-4d02-b7fb-f99531bc8ca5.jpg?1599710396"
    },
    {
        "id": "00cbe506-7332-4d29-9404-b7c6e1e791d8",
        "name": "Liliana of the Dark Realms",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00cbe506-7332-4d29-9404-b7c6e1e791d8.jpg?1562825281"
    },
    {
        "id": "00cbf1b0-5aa5-4420-84ea-7ea777ae34a7",
        "name": "Gruul War Chant",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00cbf1b0-5aa5-4420-84ea-7ea777ae34a7.jpg?1576383198"
    },
    {
        "id": "00cd61eb-a526-46db-8675-334663e0d63a",
        "name": "Ur-Golem's Eye",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00cd61eb-a526-46db-8675-334663e0d63a.jpg?1562635124"
    },
    {
        "id": "00cdcb50-ea5d-47d6-bb86-6ee7fbd233fc",
        "name": "Ghost Ship",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00cdcb50-ea5d-47d6-bb86-6ee7fbd233fc.jpg?1557431267"
    },
    {
        "id": "00ce03f3-ddc0-4cf3-8f07-551c960e8639",
        "name": "Siren's Call",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Oldschool",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00ce03f3-ddc0-4cf3-8f07-551c960e8639.jpg?1559591540"
    },
    {
        "id": "00cf2252-5ead-47df-8150-06c81dc47584",
        "name": "Lightning Elemental",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00cf2252-5ead-47df-8150-06c81dc47584.jpg?1562895131"
    },
    {
        "id": "00d03b17-75ae-40d2-8570-b219ef0dfd4a",
        "name": "Mindslaver",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00d03b17-75ae-40d2-8570-b219ef0dfd4a.jpg?1562813960"
    },
    {
        "id": "00d20c94-0597-4444-8b8a-8f500a2bda32",
        "name": "Cloud Elemental",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00d20c94-0597-4444-8b8a-8f500a2bda32.jpg?1562895143"
    },
    {
        "id": "00d2c54f-a1f4-4015-a4f3-8cd360fa466d",
        "name": "Staunch Defenders",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00d2c54f-a1f4-4015-a4f3-8cd360fa466d.jpg?1562813950"
    },
    {
        "id": "00d4d751-50df-4d8f-a6d9-4e76797c429a",
        "name": "Tormented Angel",
        "legalFormats": [
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00d4d751-50df-4d8f-a6d9-4e76797c429a.jpg?1562443313"
    },
    {
        "id": "00d594df-c51b-4936-9af1-536dab1792ae",
        "name": "Cogworker's Puzzleknot",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00d594df-c51b-4936-9af1-536dab1792ae.jpg?1576383045"
    },
    {
        "id": "00d6b8bb-ec11-4ded-a7fc-fa4ea0bb96cc",
        "name": "Quest for the Holy Relic",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00d6b8bb-ec11-4ded-a7fc-fa4ea0bb96cc.jpg?1562609297"
    },
    {
        "id": "00d705f6-4b8b-49e7-b420-5277893f14bd",
        "name": "Urza's Power Plant",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00d705f6-4b8b-49e7-b420-5277893f14bd.jpg?1562895229"
    },
    {
        "id": "00d89839-60d7-4de2-a78a-1afdcc21c053",
        "name": "Tolarian Scholar",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00d89839-60d7-4de2-a78a-1afdcc21c053.jpg?1562730535"
    },
    {
        "id": "00d998ca-7e81-4302-b2c1-acd90ea2b44d",
        "name": "Lightkeeper of Emeria",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00d998ca-7e81-4302-b2c1-acd90ea2b44d.jpg?1592712808"
    },
    {
        "id": "00da134b-7115-4e8d-b257-3cc1c0e0a3e8",
        "name": "Bloodlust Inciter",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00da134b-7115-4e8d-b257-3cc1c0e0a3e8.jpg?1597250070"
    },
    {
        "id": "00dbd0ef-9888-4489-ba4a-65128308fb11",
        "name": "Stormscale Anarch",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00dbd0ef-9888-4489-ba4a-65128308fb11.jpg?1593273270"
    },
    {
        "id": "00dcb25e-764b-47d6-bec4-225aaace77b0",
        "name": "Drifting Shade",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00dcb25e-764b-47d6-bec4-225aaace77b0.jpg?1562630489"
    },
    {
        "id": "00e27348-54c7-4b48-bd04-884938c84728",
        "name": "Angel of Glory's Rise",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00e27348-54c7-4b48-bd04-884938c84728.jpg?1562895169"
    },
    {
        "id": "00e2db9a-d62e-4300-a9e6-a7665fcf2ef7",
        "name": "Fiery Hellhound",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00e2db9a-d62e-4300-a9e6-a7665fcf2ef7.jpg?1562448816"
    },
    {
        "id": "00e3ff89-9901-48ba-900c-5778cdd1b112",
        "name": "Cloudform",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00e3ff89-9901-48ba-900c-5778cdd1b112.jpg?1592710534"
    },
    {
        "id": "00e40c64-58fa-421e-9d01-93b0642f7d8b",
        "name": "Luxury Suite",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00e40c64-58fa-421e-9d01-93b0642f7d8b.jpg?1604195651"
    },
    {
        "id": "00e4415d-1c71-41bc-84f2-2eee6367c49b",
        "name": "Goblin Warchief",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00e4415d-1c71-41bc-84f2-2eee6367c49b.jpg?1562540218"
    },
    {
        "id": "00e58486-07a5-4a2d-8563-22c7f14c0a6e",
        "name": "Song of the Dryads",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00e58486-07a5-4a2d-8563-22c7f14c0a6e.jpg?1599766061"
    },
    {
        "id": "00e5a9be-bfb2-466b-b0fe-3b24694e9f84",
        "name": "Gorger Wurm",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00e5a9be-bfb2-466b-b0fe-3b24694e9f84.jpg?1562639363"
    },
    {
        "id": "00e990aa-5124-4e9d-ab4e-178bcda12abd",
        "name": "Goblin Lore",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00e990aa-5124-4e9d-ab4e-178bcda12abd.jpg?1562542893"
    },
    {
        "id": "00ebd57f-7f7c-41b0-aa56-511c1816bc14",
        "name": "Lava Serpent",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00ebd57f-7f7c-41b0-aa56-511c1816bc14.jpg?1591227280"
    },
    {
        "id": "00eef803-6eea-4e2f-ba13-219e4b66b006",
        "name": "Aethertorch Renegade",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00eef803-6eea-4e2f-ba13-219e4b66b006.jpg?1605328025"
    },
    {
        "id": "00f0ab3f-86c5-49f6-948b-ace35bc03889",
        "name": "Mountain",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00f0ab3f-86c5-49f6-948b-ace35bc03889.jpg?1562255812"
    },
    {
        "id": "00f206c0-a8a7-4ca0-b88f-4736c3dac588",
        "name": "Skarrg Guildmage",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00f206c0-a8a7-4ca0-b88f-4736c3dac588.jpg?1561813759"
    },
    {
        "id": "00f59a16-45a8-4b52-a8df-ea96abafd8ff",
        "name": "Petals of Insight",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00f59a16-45a8-4b52-a8df-ea96abafd8ff.jpg?1562757072"
    },
    {
        "id": "00f6934f-2dd1-4715-9b7c-3ec59e8d083e",
        "name": "Opportunity",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00f6934f-2dd1-4715-9b7c-3ec59e8d083e.jpg?1562895246"
    },
    {
        "id": "00f86a0b-0f46-4ce1-bbeb-7f46881e1627",
        "name": "Foster",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00f86a0b-0f46-4ce1-bbeb-7f46881e1627.jpg?1562895188"
    },
    {
        "id": "00f8931e-6402-483c-a9e8-63ee344c36a7",
        "name": "Faerie Noble",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00f8931e-6402-483c-a9e8-63ee344c36a7.jpg?1562587028"
    },
    {
        "id": "00f8ec3c-d2cb-477c-a7e8-ff497df646d6",
        "name": "Temple of Epiphany",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00f8ec3c-d2cb-477c-a7e8-ff497df646d6.jpg?1592517860"
    },
    {
        "id": "00f9955f-a522-47bf-b064-92dd21a76b18",
        "name": "Solemn Simulacrum",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00f9955f-a522-47bf-b064-92dd21a76b18.jpg?1562133717"
    },
    {
        "id": "00fac2e0-b65e-4b84-9d7e-2a9b2ddfe970",
        "name": "Canker Abomination",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00fac2e0-b65e-4b84-9d7e-2a9b2ddfe970.jpg?1562895194"
    },
    {
        "id": "00fc97d3-d8e4-4234-a6da-7b17316fa9ac",
        "name": "Truga Jungle",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00fc97d3-d8e4-4234-a6da-7b17316fa9ac.jpg?1547434372"
    },
    {
        "id": "00fde52c-c764-433f-af24-fbb54504b243",
        "name": "Relentless Assault",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00fde52c-c764-433f-af24-fbb54504b243.jpg?1562841194"
    },
    {
        "id": "00fe59e8-d1ab-4f74-a7f4-a8feca3705ee",
        "name": "Urza's Power Plant",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel",
            "Oldschool",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00fe59e8-d1ab-4f74-a7f4-a8feca3705ee.jpg?1562486462"
    },
    {
        "id": "00feacac-9496-44bf-ad58-0fd5f3b5675a",
        "name": "Steel Squirrel",
        "legalFormats": [],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00feacac-9496-44bf-ad58-0fd5f3b5675a.jpg?1562895196"
    },
    {
        "id": "00feb2af-b363-4377-98b1-6a07df7f1acd",
        "name": "Forest",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00feb2af-b363-4377-98b1-6a07df7f1acd.jpg?1592518041"
    },
    {
        "id": "00ff9f72-b6da-426b-8f27-77aa79e7b75a",
        "name": "Dissipate",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/00ff9f72-b6da-426b-8f27-77aa79e7b75a.jpg?1562895201"
    },
    {
        "id": "01006833-6007-4c16-9ebb-20d31c60a57a",
        "name": "Taiga",
        "legalFormats": [
            "Legacy",
            "Vintage",
            "Commander",
            "Duel",
            "Oldschool"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/1/01006833-6007-4c16-9ebb-20d31c60a57a.jpg?1559592223"
    },
    {
        "id": "01007d7f-e29b-49d5-bc60-44b2fb77ed3d",
        "name": "Air Servant",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/1/01007d7f-e29b-49d5-bc60-44b2fb77ed3d.jpg?1562895202"
    },
    {
        "id": "01033dae-fec1-41f2-b7f2-cc6a43331790",
        "name": "Parallel Lives",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/1/01033dae-fec1-41f2-b7f2-cc6a43331790.jpg?1562825348"
    },
    {
        "id": "0103f3b1-88c2-4cbf-a67c-49420f92970f",
        "name": "Smite the Monstrous",
        "legalFormats": [
            "Standard",
            "Future",
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Brawl",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/1/0103f3b1-88c2-4cbf-a67c-49420f92970f.jpg?1562825351"
    },
    {
        "id": "01040ed3-4f64-4e47-8f80-3d3a339004f7",
        "name": "Hour of Eternity",
        "legalFormats": [
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/1/01040ed3-4f64-4e47-8f80-3d3a339004f7.jpg?1605100111"
    },
    {
        "id": "0104b5b3-9376-4ad7-9a77-3e564e9c42e6",
        "name": "Ghalta, Primal Hunger",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/1/0104b5b3-9376-4ad7-9a77-3e564e9c42e6.jpg?1555040636"
    },
    {
        "id": "0106caf1-2201-4661-96a5-56af02963fa6",
        "name": "Dromad Purebred",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/1/0106caf1-2201-4661-96a5-56af02963fa6.jpg?1598913635"
    },
    {
        "id": "010711a0-5e95-4a8c-816f-e314f2a909ef",
        "name": "Mutiny",
        "legalFormats": [
            "Historic",
            "Gladiator",
            "Pioneer",
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/1/010711a0-5e95-4a8c-816f-e314f2a909ef.jpg?1555040455"
    },
    {
        "id": "01072149-fe5e-4139-b3b2-3810fd220c8e",
        "name": "Vedalken Ghoul",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Pauper",
            "Vintage",
            "Commander",
            "Duel"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/1/01072149-fe5e-4139-b3b2-3810fd220c8e.jpg?1562639369"
    },
    {
        "id": "01084157-60e5-4693-bbec-be60b0b4e04f",
        "name": "Jolrael, Empress of Beasts",
        "legalFormats": [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel",
            "Premodern"
        ],
        "image": "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/1/01084157-60e5-4693-bbec-be60b0b4e04f.jpg?1562770883"
    }
];
const newCardCommands = TEST_CARDS.map((c) => new NewCardCommand(c.id, c.name, c.legalFormats, c.image));
const addToDeckCommands = TEST_CARDS.slice(0, 20).map((c) => new AddToDeckCommand(TEST_DECK_ID, [c.id]));
for (const command of [...newCardCommands, ...addToDeckCommands]) {
    messageBus.sendCommand(command);
}
/**
 * ROUTING
 */
const app = external_express_default()();
const { PORT = 3000, } = process.env;
app.get('/', (req, res) => {
    res.send({
        message: 'hello world',
    });
});
app.listen(PORT, () => {
    console.log('server started at http://localhost:' + PORT);
});
/*
const router = new Router();
router
  .get("/", (context) => {
    context.response.body = "Hello world!";
  })
  .get("/deck/:id", (context) => {
    context.response.body = deckProjection.getDeckView(context.params.id ?? '');
  })
  .get("/card", (context) => {
    context.response.body = cardProjection.getCards();
  })
  .post("/deck", async (context) => {
      const id = v4.generate();
      const body = await context.request.body().value;
      messageBus.sendCommand(new NewDeckCommand(id, body.name, body.format));
      context.response.body = {id};
  })
  .put("/deck/:id/add", async (context) => {
    const id = context.params.id ?? '';
    const body = await context.request.body().value;
    messageBus.sendCommand(new AddToDeckCommand(id, body.cards));
    context.response.body = { id };
  })
  .post("/card", async (context) => {
    try {
    const body = await context.request.body().value;
    messageBus.sendCommand(new NewCardCommand(body.id, body.name, body.legalFormats, body.image));
    context.response.body = {id: body.id};
    } catch (e) {
      console.error(e);
      context.response.body = { error: e.message }
    }
  });

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8000 });

*/ 

/******/ })()
;