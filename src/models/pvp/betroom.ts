import { number } from 'joi';
import { Schema, model } from 'mongoose';

const betroomSchema = new Schema(
    {
        user1Id: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        user1Winner: {
            type: String
        },
        user1Balance: {
            type: Number
        },
        user1Odds: {
            type: Number
        },
        user1Profit: {
            type: Number
        },
        user1Status: {
            type: String
        },
        user2Id: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        user2Winner: {
            type: String
        },
        user2Balance: {
            type: Number
        },
        user2Odds: {
            type: Number
        },
        user2Profit: {
            type: Number
        },
        user2Status: {
            type: String
        },
        user3Id: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        user3Winner: {
            type: String
        },
        user3Balance: {
            type: Number
        },
        user3Odds: {
            type: Number
        },
        user3Profit: {
            type: Number
        },
        user3Status: {
            type: String
        },
        eventId: {
            type: Number
        },
        currency: {
            type: Schema.Types.ObjectId,
            ref: 'currencies'
        },
        finished: {
            type: Boolean,
            default: false
        },
        handicap: {
            type: Number
        },
        type: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export const BetRooms = model('betrooms', betroomSchema);
