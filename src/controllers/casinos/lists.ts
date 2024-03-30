import { ObjectId } from '../base';
import { CasinoGameLists } from '../../models';
import { Request, Response } from 'express';

export const get = async (req: Request, res: Response) => {
    const result = await CasinoGameLists.find().sort({ status: -1, order: 1, createdAt: -1 }).populate('detail.system');
    return res.json(result);
};

export const getOne = async (req: Request, res: Response) => {
    const result = await CasinoGameLists.findOne({
        _id: ObjectId(req.params.id)
    }).populate('detail.system');
    return res.json(result);
};

export const list = async (req: Request, res: Response) => {
    const { pageSize = null, page = null, providerId = null } = req.body;
    let query = {} as any;
    if (providerId) {
        query["detail.system"] = providerId;
    }
    const count = await CasinoGameLists.countDocuments(query);
    if (!pageSize || !page) {
        const results = await CasinoGameLists.find(query).sort({ status: -1, order: 1, createdAt: -1 }).populate('detail.system');
        return res.json({ results, count });
    } else {
        const results = await CasinoGameLists.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ status: -1, order: 1, createdAt: -1 })
            .populate('detail.system');
        return res.json({ results, count });
    }
};

export const label = async (req: Request, res: Response) => {
    const results = await CasinoGameLists.aggregate([
        {
            $match: { status: true }
        },
        {
            $project: {
                label: '$symbol',
                value: '$_id',
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
    const result = await CasinoGameLists.create(req.body);
    return res.json(result);
};

export const updateOne = async (req: Request, res: Response) => {
    const result = await CasinoGameLists.findByIdAndUpdate(ObjectId(req.params.id), req.body, { new: true }).populate('detail.system');
    return res.json(result);
};

export const updateMany = async (req: Request, res: Response) => {
    const result = await CasinoGameLists.insertMany(req.body);
    return res.json(result);
};

export const deleteOne = async (req: Request, res: Response) => {
    const result = await CasinoGameLists.deleteOne({ _id: ObjectId(req.params.id) });
    return res.json(result);
};
