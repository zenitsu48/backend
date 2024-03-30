import { ObjectId } from '../base';
import { Sessions } from '../../models';
import { Request, Response } from 'express';

const aggregateQuery = [
    {
        $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
        }
    },
    {
        $unwind: '$user'
    },
    {
        $sort: {
            socketId: -1,
            createdAt: -1
        }
    }
] as any;

export const get = async (req: Request, res: Response) => {
    const result = await Sessions.aggregate(aggregateQuery);
    return res.json(result);
};

export const getOne = async (req: Request, res: Response) => {
    const result = await Sessions.aggregate([
        {
            $match: { _id: ObjectId(req.params.id) }
        },
        ...aggregateQuery
    ]);
    return res.json(result[0]);
};

export const list = async (req: Request, res: Response) => {
    const { pageSize = null, page = null, userId = null, date = null } = req.body;
    let query = {} as any;
    if (userId) {
        query.userId = ObjectId(userId);
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    const count = await Sessions.countDocuments(query);
    if (!pageSize || !page) {
        const results = await Sessions.aggregate([{ $match: query }, ...aggregateQuery]);
        return res.json({ results, count });
    } else {
        const results = await Sessions.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize }
        ]);
        return res.json({ results, count });
    }
};

export const csv = async (req: Request, res: Response) => {
    const { userId = null, date = null } = req.body;
    let query = {} as any;
    if (userId) {
        query.userId = ObjectId(userId);
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    const results = await Sessions.aggregate([
        { $match: query },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $unwind: '$user'
        },
        {
            $project: {
                _id: 0,
                Email: '$user.email',
                Username: '$user.username',
                IP: '$ip',
                CreatedAt: '$createdAt'
            }
        }
    ]);
    return res.json(results);
};

export const create = async (req: Request, res: Response) => {
    const result = await Sessions.create(req.body);
    return res.json(result);
};

export const updateOne = async (req: Request, res: Response) => {
    const query = { _id: ObjectId(req.params.id) };
    await Sessions.updateOne(query, req.body);
    const result = await Sessions.aggregate([{ $match: query }, ...aggregateQuery]);
    return res.json(result[0]);
};

export const deleteAll = async (req: Request, res: Response) => {
    const data = await Sessions.find();
    const result = await Sessions.deleteMany();
    for (const i in data) {
        req.app.get('io').to(data[i].socketId).emit('logout');
    }
    return res.json(result);
};

export const deleteOne = async (req: Request, res: Response) => {
    const result = await Sessions.findByIdAndDelete(ObjectId(req.params.id));
    req.app.get('io').to(result.socketId).emit('logout');
    return res.json(result);
};
