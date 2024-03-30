import { AnyObject, Document, Schema, model } from 'mongoose';

export interface ICrashGame extends Document {
  crashPoint: number;
  players: AnyObject;
  refundedPlayers: string[];
  privateSeed: string;
  privateHash: string;
  publicSeed: string;
  status: number;
  created: Date;
  startedAt: Date;
}

// Setup CrashGame Schema
const crashGameSchema = new Schema(
  {
    // Basic fields
    crashPoint: Number,
    players: Object,
    refundedPlayers: Array,

    // Provably Fair fields
    privateSeed: String,
    privateHash: String,
    publicSeed: {
      type: String,
      default: null
    },

    // Game status
    status: {
      type: Number,
      default: 1
      /**
       * Status list:
       * 1 = Not Started
       * 2 = Starting
       * 3 = In Progress
       * 4 = Over
       * 5 = Blocking
       * 6 = Refunded
       */
    },

    // When game was created
    created: {
      type: Date,
      default: Date.now
    },

    // When game was started
    startedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    minimize: false
  }
);

// Create and export the new model
export const CrashGame = model<ICrashGame>('crashgames', crashGameSchema);
