import { Schema, model } from 'mongoose';

const ReferralsSchema = new Schema(
    {
        percent: {
            type: Number,
            default: 5
        },
        bonus: {
            type: Number,
            default: 1000
        },
        active: {
            type: Boolean,
            default: true,
        }
    },
    { timestamps: true }
);

export const Referrals = model('referrals', ReferralsSchema);
