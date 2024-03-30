import { Referrals } from "../../models";
import { Request, Response } from 'express';

export const get = async (req: Request, res: Response) => {
    const result = await Referrals.find();
    return res.json(result);
};

export const edit = async (req: Request, res: Response) => {
    const { percent, bonus } = req.body;
    const referral = await Referrals.findOne({ active: true });
    referral.percent = percent;
    referral.bonus = bonus;
    const result = await referral.save();
    return res.json(result);
}