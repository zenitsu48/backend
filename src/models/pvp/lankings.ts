import { Schema, model } from 'mongoose';

const LankingsSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        won: {
            type: Number,
            default: 0
        },
        lost: {
            type: Number,
            default: 0
        },
        draw: {
            type: Number,
            default: 0
        },
        not: {
            type: Number,
            default: 0
        },
        Wprofit: {
            eth: {
                type: Number,
                default: 0
            },
            wci: {
                type: Number,
                default: 0
            },
            usdt: {
                type: Number,
                default: 0
            },
            total: {
                type: Number,
                default: 0
            }
        },
        Lprofit: {
            eth: {
                type: Number,
                default: 0
            },
            wci: {
                type: Number,
                default: 0
            },
            usdt: {
                type: Number,
                default: 0
            },
            total: {
                type: Number,
                default: 0
            }
        }
    },
    { timestamps: true }
);

export const Lankings = model('lankings', LankingsSchema);
