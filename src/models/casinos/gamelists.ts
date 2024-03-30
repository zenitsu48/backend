import { Schema, model } from 'mongoose';

const CasinoGameListsSchema = new Schema({
    gameId: {
        type: String,
    },
    gameName: {
        type: String,
    },
    LAUNCHURLID: {
        type: Number,
    },
    imageUrl: {
        type: String,
        default: ""
    },
    status: {
        type: Boolean,
        default: true
    },
    detail: {
        type: Object,
        default: {}
    }
}
);

export const CasinoGameLists = model('casino_gamelist', CasinoGameListsSchema);
