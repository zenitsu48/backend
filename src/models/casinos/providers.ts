import { Schema, model } from 'mongoose';

const CasinoProvidersSchema = new Schema({
    System: {
        type: String,
    },
    Name: {
        type: String,
    },
    Categories: {
        type: Array,
        default: []
    },
    Status: {
        type: Boolean,
        default: true
    }
}
);

export const CasinoProviders = model('casino_providers', CasinoProvidersSchema);
