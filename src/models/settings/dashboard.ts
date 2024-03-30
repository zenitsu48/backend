import { Schema, model } from 'mongoose';

const DashboardSettingSchema = new Schema(
    {
        type: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            default: 0
        },
        time: {
            type: Date,
            default: new Date(),
            require: true
        }
    },
    { timestamps: true }
);

export const DashboardSettings = model('dashboard_setting', DashboardSettingSchema);
