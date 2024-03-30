import { Schema, model } from 'mongoose';

const SportsBettingV3Schema = new Schema(
    {
        BetId: {
            type: Schema.Types.ObjectId,
            ref: 'sports_betsv3'
        },
        BetType: {       // FullName in Bets array
            type: String, 
            require: true
        },
        OrderNumber: {
            type: Number,
            require: true
        },
        TransactionId: {
            type: Number,
            require: true
        },
        EventId: {
            type: Number,
            require: true
        },
        EventDate: {
            type: Date,
            require: true
        },
        EventNameOnly: {
            type: String,
            require: true
        },
        FullStake: {
            type: String,
            default: ""
        },
        StakeTypeName: {
            type: String,
            require: true
        },
        StakeName: {
            type: String,
            require: true
        },
        StakeAmount: {
            type: Number,
            require: true
        },
        Profit: {        // MaxWinAmount in Bets array
            type: Number,
            default: 0,
            require: true
        },
        SportId: {
            type: Number,
            require: true
        },
        SportName: {
            type: String,
            require: true
        },
        Factor: {
            type: Number,
            require: true
        },
        Score: {
            type: String,
            default: ""
        },
        StatusName: {
            type: String,
            default: 'New',
            enum: ['New', 'Winner', 'Lost', 'Return', 'Half-return', 'Half-win', 'Rejected', 'Initial Return', 'Initial Half Return', 'Initial Half Won'],
            require: true
        }, 
        Teams: {
            type: Object,
            default: null
        }, 
        FillDate: {
            type: Date,
            default: new Date().toISOString()
        },
        Result: {
            type: String,
            default: "Ok"
        }
    },
    { timestamps: true }
);

export const SportsBettingV3 = model('sports_bettingsv3', SportsBettingV3Schema);
