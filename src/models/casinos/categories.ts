import { Schema, model } from 'mongoose';

const CasinoCategoriesSchema = new Schema({
    Id: {
        type: String,
    },
    Name: {
        type: String,
    },
    Status: {
        type: Boolean,
        default: true
    }
}
);

export const CasinoCategories = model('casino_categories', CasinoCategoriesSchema);
