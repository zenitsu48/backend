import { Schema, model } from 'mongoose';

const SportsMatchsSchema = new Schema(
    {
        id: {
            type: Number,
            unique: true
        },
        sport_id: {
            type: Number
        },
        time: {
            type: Number
        },
        time_status: {
            type: Number
        },
        league: {
            id: {
                type: Number
            },
            name: {
                type: String
            },
            cc: {
                type: String
            }
        },
        home: {
            id: {
                type: Number
            },
            name: {
                type: String
            },
            image_id: {
                type: Number
            },
            cc: {
                type: String
            }
        },
        away: {
            id: {
                type: Number
            },
            name: {
                type: String
            },
            image_id: {
                type: Number
            },
            cc: {
                type: String
            }
        },
        ss: {
            type: String
        },

        points: {
            type: String
        },
        playing_indicator: {
            type: String
        },
        scores: {
            type: Object
        },
        stats: {
            type: Object
        },
        extra: {
            type: Object
        },
        events: {
            type: Object
        },
        timer: {
            type: Object
        },
        has_lineup: {
            type: Number
        },
        inplay_created_at: {
            type: Number
        },
        inplay_updated_at: {
            type: Number
        },
        confirmed_at: {
            type: Number
        },
        horse_teams: {
            type: Array
        },
        horse_odds: {
            type: Array
        },
        odds: {
            type: Object
        },
        astatus: {
            type: Boolean,
            default: true
        },

    },
    { timestamps: true }
);

export const SportsMatchs = model('sports_matchs', SportsMatchsSchema);
