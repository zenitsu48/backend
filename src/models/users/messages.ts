import { Schema, model } from 'mongoose';

const MessagesSchema = new Schema(
    {
        userId: {
            type: String,
            required: true
        },
        userName: {
            type: String,
            required: true
        },
        content: {
            type: String
        }
    },
    { timestamps: true }
);

export const Messages = model('messages', MessagesSchema);
