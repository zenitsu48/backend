import { Schema, model } from 'mongoose';

const SportsBetsV3Schema = new Schema({
    UserId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    OrderNumber: {
        type: Number,
        required: true
    },
    BetAmount: {
        type: Number,
        required: true
    },
    WinAmount: {
        type: Number,
        required: true
    },
    TransactionId: {
        type: Number,
        required: true
    },
    LastBalance: {
        type: Number,
        required: true
    },
    UpdatedBalance: {
        type: Number,
        required: true
    },
    Currency: {
        type: String,
        default: "USDT"
    },
    BetType: {
        type: String,
        required: true
    },
    Status: {
        type: String,
        required: true
    },
    IpAddress: {
        type: String,
        required: true
    }
}, { timestamps: true })

export const SportsBetsV3 = model('sports_betsv3', SportsBetsV3Schema);
