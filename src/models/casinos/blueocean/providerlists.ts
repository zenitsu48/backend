import { Schema, model } from "mongoose";

const GameProvidersSchema = new Schema({
    providerName: {
      type: String,
      required: true,
    },
    Agregator: {
      type: String,
      required: true,
    },
    Percentage: {
      type: Number,
      default: 0,
    },
    RTP: {
      type: Number,
      default: 95,
    },
    gameType: {
      type: String,
    },
    providerOrder: {
      type: Number,
    },
    status: {
      type: Boolean,
      default: true,
    },
    Route: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      default: "",
    },
    pro_info: {
      type: String,
      default: "",
    },
    currency: {
      type: Array,
      default: [],
    },
    country: {
      type: Array,
      default: [],
    },
  });

  export const ProviderList = model('bo_provider_list', GameProvidersSchema);