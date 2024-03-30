import { Schema, model } from 'mongoose';

const PokerBetHistorySchema = new Schema({
    GAMEID: {
        type: String,
        required: true,
    },
    USERID: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    LAUNCHURL: {
        type: Number,
        required: true
    },
    AMOUNT: {
        type: Number,
        required: true
    },
    betting: {
        type: Object,
        required: true
    },
    TYPE: {
        type: String,
        required: true
    },
    transactionId: {
        type: String,
        required: true
    },
    lastbalance: {
        type: Number,
        required: true
    },
    updatedbalance: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: "USD"
    },
    currencyId: {
        type: Schema.Types.ObjectId
    },
    ip: {
        type: String,
    },
}, { timestamps: true })

export const PokerBetHistory = model('poker_bethistory', PokerBetHistorySchema);

