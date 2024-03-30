import { Schema, model } from 'mongoose';

const P2pPoolsSchema = new Schema(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        currency: {
            type: Schema.Types.ObjectId,
            ref: 'currencies'
        },
        min: {
            type: Number,
            require: true
        },
        max: {
            type: Number,
            require: true
        },
        option: {
            type: Object
        },
        fpool: {
            type: Number,
            default: 0
        },
        spool: {
            type: Number,
            default: 0
        },
        fusers: {
            type: Number,
            default: 0
        },
        susers: {
            type: Number,
            default: 0
        },
        content: {
            type: String,
            require: true
        },
        avatar: {
            type: String,
            default: ''
        },
        expire: {
            type: Date,
            required: true
        },
        winoption: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            default: 'ACTIVE',
            enum: ['ACTIVE', 'CANCELLED', 'FINISHED'],
            require: true
        }
    },
    { timestamps: true }
);

export const P2pPools = model('p2p_pools', P2pPoolsSchema);
