import { ObjectId } from '../base';
import { CasinoBetHistory, SportsBetsV2 } from '../../models';
import { Request, Response } from 'express';

const aggregateQuery = [
    {
        $lookup: {
            from: 'users',
            localField: 'USERID',
            foreignField: '_id',
            as: 'user'
        }
    },
    {
        $lookup: {
            from: 'currencies',
            localField: 'betting.origin_currency',
            foreignField: 'symbol',
            as: 'currency'
        }
    },
    {
        $lookup: {
            from: 'casino_providers',
            localField: 'gameId',
            foreignField: 'System',
            as: 'provider'
        }
    },
    // {
    //     $lookup: {
    //         from: 'casino_gamelists',
    //         localField: 'GAMEID',
    //         foreignField: 'gameId',
    //         as: 'game'
    //     }
    // },
    {
        $unwind: '$user'
    },
    // {
    //     $unwind: '$game'
    // }, 
    {
        $unwind: '$currency'
    },
    // {
    //     $unwind: '$provider'
    // },
    {
        $project: {
            'currency.abi': 0
        }
    },
    {
        $sort: { createdAt: -1 }
    }
];

export const get = async (req: Request, res: Response) => {
    const results = await CasinoBetHistory.aggregate(aggregateQuery as any);
    return res.json(results);
};

export const getOne = async (req: Request, res: Response) => {
    const result = await CasinoBetHistory.aggregate([
        {
            $match: { _id: ObjectId(req.params.id) }
        },
        ...(aggregateQuery as any)
    ]);
    return res.json(result[0]);
};

export const list = async (req: Request, res: Response) => {
    const {
        pageSize = null,
        page = null,
        userId = null,
        currency = null,
        status = null,
        providerId = null,
        date = null,
        sort = null,
        cases = null,
        column = null,
    } = req.body;
    let query = {} as any;
    let sortQuery = { createdAt: -1 } as any;
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    if (userId) {
        query.USERID = ObjectId(userId);
    }
    if (currency) {
        query["betting.origin_currency"] = currency;
    }
    if (providerId) {
        query.GAMEID = providerId;
    }
    if (status) {
        query.TYPE = status;
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    const count = await SportsBetsV2.countDocuments(query);
    if (!pageSize || !page) {
        const results = await SportsBetsV2.aggregate([{ $match: query }, ...aggregateQuery, { $sort: sortQuery }]);

        return res.json({ results, count });
    } else {
        const results = await SportsBetsV2.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $sort: sortQuery },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize }
        ]);
        return res.json({ results, count });
    }
};

export const csv = async (req: Request, res: Response) => {
    const {
        userId = null,
        currency = null,
        status = null,
        gameId = null,
        providerId = null,
        date = null,
        sort = null,
        column = null
    } = req.body;
    let query = {} as any;
    let sortQuery = { createdAt: -1 } as any;
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    if (userId) {
        query.userId = ObjectId(userId);
    }
    if (currency) {
        query.currency = ObjectId(currency);
    }
    if (gameId) {
        query.gameId = ObjectId(gameId);
    }
    if (providerId) {
        query.providerId = ObjectId(providerId);
    }
    if (status) {
        query.status = status;
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    const results = await CasinoBetHistory.aggregate([
        { $match: query },
        ...aggregateQuery,
        { $sort: sortQuery },
        {
            $project: {
                Username: '$user.username',
                Email: '$user.email',
                Balance: {
                    $concat: [{ $convert: { input: '$balance', to: 'string' } }, ' ', '$currency.symbol']
                }
            }
        }
    ]);
    return res.json(results);
};

export const create = async (req: Request, res: Response) => {
    const result = await CasinoBetHistory.create(req.body);
    return res.json(result);
};

export const updateOne = async (req: Request, res: Response) => {
    const query = { _id: ObjectId(req.params.id) };
    await CasinoBetHistory.updateOne(query, req.body);
    const result = await CasinoBetHistory.aggregate([{ $match: query }, ...(aggregateQuery as any)]);
    return res.json(result[0]);
};

export const deleteOne = async (req: Request, res: Response) => {
    const result = await CasinoBetHistory.deleteOne({ _id: ObjectId(req.params.id) });
    return res.json(result);
};

export const deleteMany = async (req: Request, res: Response) => {
    const query = req.body;
    const result = await CasinoBetHistory.deleteMany(query);
    return res.json(result)
}