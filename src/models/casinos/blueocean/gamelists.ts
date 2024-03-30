import { Schema, model } from "mongoose";

const GameListSchema = new Schema({
    gameId: {
        type: String,
        required: true,
    },
    gameName: {
        type: String,
        required: true,
    },
    launchUrlId: {
        type: Number,
        required: true,
    },
    imageUrl: {
        type: String,
        required: true,
    },
    gameType: {
        type: String,
    },
    percentage: {
        type: Number,
    },
    isNew: {
        type: Boolean,
        default: false,
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    isDesktop: {
        type: Boolean,
        default: true,
    },
    isMobile: {
        type: Boolean,
        default: false,
    },
    opens: {
        type: Number,
        default: 0,
    },
    provider: {
        type: String,
    },
    funmode: {
        type: Boolean,
        default: false,
    },
    slug: {
        type: String,
        required: true,
    }
});

export const BOGameLists = model('bo_game_list', GameListSchema);

