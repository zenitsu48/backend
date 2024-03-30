import { Request, Response } from "express";
import { Balances, Currencies, Rewards } from "../../models";
import { balanceUpdate } from "../base";

export const deleteMany = async (req: Request, res: Response) => {
    try {
        const { symbol } = req.body;
        await Rewards.deleteMany({ symbol });
    } catch (e) {
        console.log(e)
    }
}

export const updateMany = async (req: Request, res: Response) => {
    try {
        const { rewards } = req.body;
        for (const item of rewards) {
            await Rewards.findOneAndUpdate(
                { address: item.address, symbol: item.symbol },
                { $inc: { amount: item.amount } },
                { upsert: true }
            );
        }
        return res.json(true)
    } catch (e) {
        console.log(e)
        return res.json(false)
    }
}
    ;
export const updateSymbol = async (req: Request, res: Response) => {
    try {
        await Rewards.updateMany({}, { symbol: 'BCB' })
        return res.json(true)
    } catch (e) {
        console.log(e)
        return res.json(false)
    }
};

export const get = async (req: Request, res: Response) => {
    try {
        const { address } = req.body;
        const result = await Rewards.find({ address });
        return res.json(result)
    } catch (e) {
        console.log(e);
        return res.json({})
    }
}

export const claim = async (req: Request, res: Response) => {
    try {
        const { address, userId, symbol } = req.body;
        const data = await Rewards.findOne({ address, symbol });
        if (data.amount && data.amount > 0) {
            const currency = await Currencies.findOne({ symbol });
            let balance = await Balances.findOne({ currency: currency._id, userId });
            if (!balance) {
                balance = await Balances.findOneAndUpdate({ currency: currency._id, userId }, { status: false }, { upsert: true, new: true });
            }
            await balanceUpdate({
                req,
                balanceId: balance._id,
                amount: data.amount,
                type: 'claimed-reward'
            })
            await Rewards.findOneAndDelete({ address, symbol });
            return res.json("success")
        }
    } catch (e) {
        console.log(e)
        return res.json("error")
    }

}
