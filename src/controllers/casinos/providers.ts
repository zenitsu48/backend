import { ObjectId } from '../base';
import { CasinoProviders } from '../../models';
import { Request, Response } from 'express';

export const get = async (req: Request, res: Response) => {
    const result = await CasinoProviders.find().sort({
        status: -1,
        createdAt: -1
    });
    return res.json(result);
};

export const getOne = async (req: Request, res: Response) => {
    const result = await CasinoProviders.findOne({
        _id: ObjectId(req.params.id)
    });
    return res.json(result);
};

export const list = async (req: Request, res: Response) => {
    const { pageSize = null, page = null, providerId = null } = req.body;
    let query = {} as any;
    if (providerId) {
        query = { System: providerId };
    } else {
        query = { System: { $ne: '972' } };
    }
    const count = await CasinoProviders.countDocuments(query);
    if (!pageSize || !page) {
        const results = await CasinoProviders.find(query).sort({
            Status: -1,
            createdAt: -1
        });
        return res.json({ results, count });
    } else {
        const results = await CasinoProviders.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ Status: -1, createdAt: -1 });
        return res.json({ results, count });
    }
};

export const label = async (req: Request, res: Response) => {
    const results = await CasinoProviders.aggregate([
        {
            $match: {
                System: { $ne: '972' }
            }
        },
        {
            $project: {
                label: '$Name',
                value: '$System',
                _id: 0
            }
        },
        {
            $sort: {
                label: 1
            }
        }
    ]);
    return res.json(results);
};

export const create = async (req: Request, res: Response) => {
    const result = await CasinoProviders.create(req.body);
    return res.json(result);
};

export const updateOne = async (req: Request, res: Response) => {
    const result = await CasinoProviders.findByIdAndUpdate({ _id: ObjectId(req.params.id) }, req.body, { new: true });
    return res.json(result);
};

export const deleteOne = async (req: Request, res: Response) => {
    const result = await CasinoProviders.deleteOne({
        _id: ObjectId(req.params.id)
    });
    return res.json(result);
};
