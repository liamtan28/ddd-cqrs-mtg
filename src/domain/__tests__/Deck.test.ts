import { v4 } from "uuid";
import { Repository } from "../../framework/Repository";
import { InMemoryEventStore } from "../../framework/InMemoryEventStore";
import { MessageBus } from "../../framework/MessageBus";

import { Format } from "../types";

import { DeckCommandHandlers } from "../handlers/DeckCommandHandlers";
import { NewDeckCommand } from "../commands/NewDeckCommand";
import { AddToDeckCommand } from "../commands/AddToDeckCommand";
import { RenameDeckCommand } from "../commands/RenameDeckCommand";
import { ChangeDeckFormatCommand } from "../commands/ChangeDeckFormatCommand";
import { RemoveFromDeckCommand } from "../commands/RemoveFromDeckCommand";
import { DeckProjection } from "../projections/DeckProjection";
import { Deck } from "../Deck";

console.log("\n========= BEGIN TEST =========\n");


// MessageBus

const messageBus = new MessageBus();
// EventStore
const eventStore = new InMemoryEventStore(messageBus);
// Repos
const deckRepo: Repository<Deck> = new Repository<Deck>(eventStore, Deck);
// Projections
const deckProjection = new DeckProjection(messageBus);

// TODO this sucks. 
// I dont like using strings here
// but you would have to init
// each command to be able to
// get the className without
// using reflection
messageBus.registerCommandHandlers([
    'NewDeckCommand',
    'AddToDeckCommand',
    'RenameDeckCommand',
    'ChangeDeckFormatCommand',
    'RemoveFromDeckCommand',
], new DeckCommandHandlers(deckRepo));

// Test Data

const DECK_ID = v4();
const DECK_NAME = "Jund Death's Shadow";
const DECK_FORMAT = Format.MODERN;

const CARDS = ["1ee86efa-248e-4251-b734-f8ad3e8a0344", "a8e328c6-3a84-49cf-a1a3-1d1e5373d274"]

const CARDS_FOR_REMOVAL = ["a8e328c6-3a84-49cf-a1a3-1d1e5373d274"];


// Commands
messageBus.sendCommand(new NewDeckCommand(DECK_ID, DECK_NAME, DECK_FORMAT));
messageBus.sendCommand(new AddToDeckCommand(DECK_ID, CARDS));
messageBus.sendCommand(new RenameDeckCommand(DECK_ID, "Jodah CEDH Deck"));
messageBus.sendCommand(new ChangeDeckFormatCommand(DECK_ID, Format.EDH));
messageBus.sendCommand(new RemoveFromDeckCommand(DECK_ID, CARDS_FOR_REMOVAL));


await new Promise((resolve) => setTimeout(() => {
    console.log(deckProjection.getDeckView(DECK_ID));
    resolve(deckProjection.getDeckView(DECK_ID));
}, 5000));
