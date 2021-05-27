import { v4 } from "../../../deps.ts";
import { DeckRepository } from "../DeckRepository.ts";
import { InMemoryEventStore } from "../../framework/InMemoryEventStore.ts";
import { MessageBus } from "../../framework/MessageBus.ts";

import { Format } from "../types.ts";

import { DeckCommandHandlers } from "../handlers/DeckCommandHandlers.ts";
import { NewDeckCommand } from "../commands/NewDeckCommand.ts";
import { AddToDeckCommand } from "../commands/AddToDeckCommand.ts";
import { RenameDeckCommand } from "../commands/RenameDeckCommand.ts";
import { ChangeDeckFormatCommand } from "../commands/ChangeDeckFormatCommand.ts";
import { RemoveFromDeckCommand } from "../commands/RemoveFromDeckCommand.ts";

console.log("\n========= BEGIN TEST =========\n");

// EventStore
const eventStore = new InMemoryEventStore();

// Repos
const deckRepo: DeckRepository = new DeckRepository(eventStore);

// MessageBus

const messageBus = new MessageBus();

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

const DECK_ID = v4.generate();
const DECK_NAME = "Jund Death's Shadow";
const DECK_FORMAT = Format.MODERN;

const CARDS = ["Abrupt Decay",
"Ancient Tomb",
"Anguished Unmaking",
"Arid Mesa",
"Armageddon",
"Avacyn, Angel of Hope",
"Bayou",
"Birds of Paradise",
"Blood Crypt",
"Bloodstained Mire",
"Bloom Tender",
"Brainstorm",
"Breeding Pool",
"Chrome Mox",
"City of Brass",
"Command Tower",
"Conflux",
"Counterspell",
"Cyclonic Rift",
"Demonic Tutor",
"Dockside Extortionist",
"Elesh Norn, Grand Cenobite",
"Elvish Mystic",
"Emrakul, the Promised End",
"Enlightened Tutor",
"Enter the Infinite",
"Exotic Orchard",
"Exploration",
"Farseek",
"Fellwar Stone",
"Fist of Suns",
"Flooded Strand",
"Force of Negation",
"Force of Will",
"Gilded Drake",
"Godless Shrine",
"Grim Monolith",
"Hallowed Fountain",
"In Garruk's Wake",
"Insurrection",
"Island",
"Jin-Gitaxias, Core Augur",
"Jodah, Archmage Eternal",
"Kozilek, Butcher of Truth",
"Kozilek, the Great Distortion",
"Llanowar Elves",
"Lotus Petal",
"Mana Confluence",
"Mana Vault",
"Marsh Flats",
"Mirari's Wake",
"Misty Rainforest",
"Mountain",
"Myojin of Night's Reach",
"Myojin of Seeing Winds",
"Mystic Remora",
"Mystical Tutor",
"Nature's Lore",
"Nexus of Fate",
"Omniscience",
"Overgrown Tomb",
"Pact of Negation",
"Plateau",
"Polluted Delta",
"Ponder",
"Preordain",
"Prismatic Vista",
"Reflecting Pool",
"Rhystic Study",
"Sacred Foundry",
"Sakura-Tribe Elder",
"Scalding Tarn",
"Scrubland",
"Selvala, Heart of the Wilds",
"Sensei's Divining Top",
"Sol Ring",
"Steam Vents",
"Stomping Ground",
"Swan Song",
"Swords to Plowshares",
"Sylvan Caryatid",
"Sylvan Library",
"Taiga",
"Talisman of Conviction",
"Talisman of Progress",
"Temple Garden",
"Temporal Mastery",
"Time Stretch",
"Tooth and Nail",
"Toxic Deluge",
"Tropical Island",
"Ulamog, the Ceaseless Hunger",
"Vampiric Tutor",
"Verdant Catacombs",
"Vorinclex, Voice of Hunger",
"Watery Grave",
"Wheel of Fortune",
"Windswept Heath",
"Wooded Foothills",
"Worldly Tutor",
"Zacama, Primal Calamity",
];

const CARDS_FOR_REMOVAL = [
    "Abrupt Decay",
    "Ancient Tomb",
    "Anguished Unmaking",
    "Arid Mesa",
    "Armageddon",
];


// Commands
const newDeckCommand = new NewDeckCommand(DECK_ID, DECK_NAME, DECK_FORMAT);
const addToDeckCommand = new AddToDeckCommand(DECK_ID, CARDS);
const renameDeckCommand = new RenameDeckCommand(DECK_ID, "Jodah CEDH Deck");
const changeDeckFormatCommand = new ChangeDeckFormatCommand(DECK_ID, Format.EDH);
const removeFromDeckCommand = new RemoveFromDeckCommand(DECK_ID, CARDS_FOR_REMOVAL);

messageBus.sendCommand(newDeckCommand);
messageBus.sendCommand(addToDeckCommand);
messageBus.sendCommand(renameDeckCommand);
messageBus.sendCommand(changeDeckFormatCommand);
messageBus.sendCommand(removeFromDeckCommand);

const deck = deckRepo.getById(DECK_ID);

console.log({
    id: deck.id,
    name: deck.getName(),
    format: deck.getFormat(),
    numCards: deck.getSize(),
});
