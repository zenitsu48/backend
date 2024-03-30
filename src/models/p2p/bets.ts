import { Schema, model } from 'mongoose';

const P2pBetsSchema = new Schema(
    {
        poolId: {
            type: Schema.Types.ObjectId,
            ref: 'p2p_pools'
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        currency: {
            type: Schema.Types.ObjectId,
            ref: 'currencies'
        },
        stake: {
            type: Number,
            require: true
        },
        price: {
            type: Number,
            default: 0
        },
        profit: {
            type: Number,
            default: 0,
            require: true
        },
        type: {
            type: Number,
            enum: [1, 2],
            require: true
        },
        status: {
            type: String,
            default: 'BET',
            enum: ['BET', 'SETTLED', 'LOST', 'WIN', 'REFUND', 'CANCEL'],
            require: true
        }
    },
    { timestamps: true }
);

export const P2pBets = model('p2p_bets', P2pBetsSchema);
