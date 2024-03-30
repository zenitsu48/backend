import { Request, Response } from 'express';
import { DashboardSettings } from '../../models/settings/dashboard';

export const update = async (req: Request, res: Response) => {
    const { type, amount, reset } = req.body;
    try {
        if (reset) {
            const result = await DashboardSettings.updateOne({ type }, { time: new Date(), amount: 0 }, { upsert: true })
            if (result) {
                return res.json('success')
            }
        } else {
            const result = await DashboardSettings.updateOne({ type }, { amount }, { upsert: true })
            if (result) {
                return res.json('success')
            }
        }
    } catch (e) {
        console.log(e)
        return res.json('failed')
    }
}

export const get = async (req: Request, res: Response) => {
    try {
        const result = await DashboardSettings.find();
        return res.json(result)
    } catch (e) {
        console.log(e)
        return res.json('failed')
    }
}