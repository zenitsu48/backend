import { Schema, model } from 'mongoose';

const SportsBetsV2Schema = new Schema({
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
    ip: {
        type: String,
    },
}, { timestamps: true })

export const SportsBetsV2 = model('sports_betsv2', SportsBetsV2Schema);

