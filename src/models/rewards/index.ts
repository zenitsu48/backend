import { Schema, model } from 'mongoose';

const RewardSchema = new Schema(
    {
        address: {
            type: String,
            required: true
        },
        symbol: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export const Rewards = model('rewards', RewardSchema);
