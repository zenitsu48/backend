import { Schema, model } from 'mongoose';

const PaymentsSchema = new Schema(
    {
        balanceId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'balances'
        },
        currencyId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'currencies'
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'users'
        },
        address: {
            type: String
        },
        pay_address: {
            type: String //in the case of nowpayments, the address that the user has to pay
        },
        amount: {
            type: Number
        },
        amounti: {
            type: Number
        },
        currency: {
            type: String //the payment field of the currencies table
        },
        paymentId: {
            type: String //in the case of nowpayments, payment id for specify the each payments
        },
        id: {
            type: String
        },
        ipn_id: {
            type: String
        },
        ipn_mode: {
            type: String
        },
        ipn_type: {
            type: String
        },
        merchant: {
            type: String
        },
        status: {
            type: Number
        },
        status_text: {
            type: String
        },
        txn_id: {
            type: String
        },
        method: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export const Payments = model('payments', PaymentsSchema);
