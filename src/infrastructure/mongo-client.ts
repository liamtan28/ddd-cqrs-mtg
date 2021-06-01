import mongoose from "mongoose";
import { 
    MONGO_DB_HOST,
    MONGO_DB_NAME,
    MONGO_DB_PASS,
    MONGO_DB_USER,
} from "../../env";

export function mongoTest() {
mongoose.connect(
    `mongodb+srv://${MONGO_DB_USER}:${MONGO_DB_PASS}@${MONGO_DB_HOST}/${MONGO_DB_NAME}?retryWrites=true&w=majority`,
    {   
        useNewUrlParser: true,
        useUnifiedTopology: true
    },
);


const deckProjectionSchema = new mongoose.Schema({
    deckID: String,
    name: String,
    format: String,
    numCards: Number,
    isLegal: Boolean,
    cards: [{
        name: String,
        legalFormats: [String],
        image: String,
    }]
})

const DeckProjection = mongoose.model('DeckProjection', deckProjectionSchema);

/*
 "cards": [
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

*/

const deckProjection = new DeckProjection({
    deckID: "bf874a46-4c88-4492-a003-8ce6a33bac08",
    name: "TestDeck",
    format: "Modern",
    numCards: 1,
    isLegal: false,
    cards: [ {
        name: "Fury Sliver",
        legalFormats: [
            "Modern",
            "Legacy",
            "Vintage",
            "Penny",
            "Commander",
            "Duel"
        ],
        image: "https://c1.scryfall.com/file/scryfall-cards/normal/front/0/0/0000579f-7b35-4ed3-b44c-db2a538066fe.jpg?1562894979"
    }]

});
deckProjection.save().then(() => DeckProjection.find({deckID: "bf874a46-4c88-4492-a003-8ce6a33bac08"}, (err, docs) => console.log(docs)));
}