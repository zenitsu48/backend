import { Balances, Payments } from '../../models';
import { Request, Response } from 'express';
import { balanceUpdate, ObjectId } from '../base';
import request = require('request');

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
        $lookup: {
            from: 'currencies',
            localField: 'currencyId',
            foreignField: '_id',
            as: 'currency'
        }
    },
    {
        $unwind: '$user'
    },
    {
        $unwind: '$currency'
    },
    // {
    //     $project: {
    //         'currency.abi': 0
    //     }
    // },
    {
        $sort: { createdAt: -1 }
    }
] as any;

export const get = async (req: Request, res: Response) => {
    const results = await Payments.aggregate(aggregateQuery);
    return res.json(results);
};

export const getOne = async (req: Request, res: Response) => {
    const result = await Payments.aggregate([{ $match: { _id: ObjectId(req.params.id) } }, ...aggregateQuery]);
    return res.json(result[0]);
};

export const list = async (req: Request, res: Response) => {
    const {
        pageSize = null,
        page = null,
        userId = null,
        type = null,
        currency = null,
        sort = null,
        column = null,
        date = null,
        method
    } = req.body;
    let query = {} as any;
    let sortQuery = { createdAt: -1 } as any;
    if (userId) {
        query.userId = ObjectId(userId);
    }
    if (type) {
        query.ipn_type = type;
    }
    if (currency) {
        query.currencyId = ObjectId(currency);
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    if (method !== '' && method !== undefined) {
        query.method = method;
    }
    const count = await Payments.countDocuments(query);
    if (!pageSize || !page) {
        const results = await Payments.aggregate([{ $match: query }, ...aggregateQuery, { $sort: sortQuery }]);
        return res.json({ results, count });
    } else {
        const results = await Payments.aggregate([
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
    const { userId = null, type = null, currency = null, sort = null, column = null, date = null, method } = req.body;
    let query = {} as any;
    let sortQuery = { createdAt: -1 } as any;
    if (userId) {
        query.userId = ObjectId(userId);
    }
    if (type) {
        query.ipn_type = type;
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    if (currency) {
        query.currencyId = currency;
    }
    if (method !== '' && method !== undefined) {
        query.method = method;
    }
    const results = await Payments.aggregate([
        { $match: query },
        ...aggregateQuery,
        { $sort: sortQuery },
        {
            $project: {
                _id: 0,
                ID: '$_id',
                Username: '$user.username',
                Email: '$user.email',
                TransactionHash: '$txn_id',
                Amount: {
                    $concat: [{ $convert: { input: '$amount', to: 'string' } }, ' ', '$currency.symbol']
                },
                Address: '$address',
                Status: '$status_text',
                Type: '$ipn_type',
                CreatedAt: '$updatedAt'
            }
        }
    ]);
    return res.json(results);
};

export const create = async (req: Request, res: Response) => {
    const result = await Payments.create(req.body);
    return res.json(result);
};

export const updateOne = async (req: Request, res: Response) => {
    const query = { _id: ObjectId(req.params.id) };
    await Payments.updateOne(query, req.body);
    const result = await Payments.aggregate([{ $match: query }, ...aggregateQuery]);
    return res.json(result[0]);
};

export const deleteOne = async (req: Request, res: Response) => {
    const result = await Payments.deleteOne({ _id: ObjectId(req.params.id) });
    return res.json(result);
};

// when the admin approve the withdraw
export const approveWithdrawal = async (req: Request, res: Response) => {
    const { status, paymentId, type, txn_id } = req.body;
    if (status === 'pending') {
        await Payments.updateOne({ _id: ObjectId(paymentId) }, { status: -2, status_text: 'pending' });
        return res.json(true);
    } else if (status === 'approve') {
        //when the admin sends the money about withdraw requests
        if (type === 1) {
        } else {
            await Payments.updateOne({ _id: ObjectId(paymentId) }, { txn_id, status: 105, status_text: 'approve' });
            return res.json(true);
        }
    } else if (status === 'confirmed') {
        //when the admin withdraws
        await Payments.updateOne({ _id: ObjectId(paymentId) }, { status: 2, status_text: 'confirmed' });
        return res.json(true);
    } else if (status === 'canceled') {
        const payment = await Payments.findOneAndUpdate({ _id: ObjectId(paymentId) }, { status: -1, status_text: 'canceled' });
        await balanceUpdate({
            req,
            balanceId: payment.balanceId,
            amount: payment.amount,
            type: 'withdrawal-metamask-canceled'
        });
        return res.json(true);
    }
};
