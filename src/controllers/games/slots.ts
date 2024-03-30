import { Request, Response } from 'express';
import { Balances, Users } from '../../models';
import { balanceUpdate } from '../base';

export const auth = async (req: any, res: Response) => {
    try {
        const data = req.body;
        const user = req.user;
        if (data.opid == '1') {
            const balance = await Balances.findOne({
                userId: user._id,
                status: true
            });
            if (!balance) {
                return res.json({ status: false });
            }
            return res.json({
                status: true,
                data: {
                    userId: user._id,
                    username: user.username,
                    balance: balance.balance,
                    balanceId: balance._id
                }
            });
        } else {
            return res.json({ status: false });
        }
    } catch (e) {
        return res.json({ status: false });
    }
};

export const debit = async (req: any, res: Response) => {
    try {
        const data = req.body;
        await balanceUpdate({
            req,
            balanceId: data.balanceId,
            amount: data.amount,
            type: 'slots-debit'
        });
        return res.json({ status: true });
    } catch (e) {
        return res.json({ status: false });
    }
};
