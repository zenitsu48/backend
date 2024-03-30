import { Request, Response } from 'express';
import { P2pBets, P2pPools } from '../../models/p2p';
import { Currencies } from '../../models';
import { ObjectId, checkBalance, generatInfo, handleBet } from '../base';

export const aggregateQuery = [
    {
        $lookup: {
            from: "users",
            localField: "ownerId",
            foreignField: "_id",
            as: "user",
        },
    },
    {
        $lookup: {
            from: "currencies",
            localField: "currency",
            foreignField: "_id",
            as: "currency",
        },
    },
    {
        $unwind: "$currency",
    },
    {
        $unwind: "$user",
    },
    {
        $project: { "currency.abi": 0 },
    },
    {
        $sort: { createdAt: -1 },
    },
] as any;

export const getOne = async (req: Request, res: Response) => {
    const result = await P2pPools.findOne({ _id: ObjectId(req.params.id) });
    return res.json(result);
};

export const list = async (req: Request, res: Response) => {
    const {
        ownerId = null,
        currency = null,
        status = null,
        sort = null,
        column = null,
        date = null,
        page = null,
        pageSize = null,
    } = req.body;

    let query = {} as any;
    let sortQuery = { createdAt: -1 } as any;

    if (ownerId) {
        query.ownerId = ObjectId(ownerId);
    }
    if (status) {
        query.status = status;
    }
    if (currency) {
        query.currency = ObjectId(currency);
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    console.log(query,)
    const count = await P2pPools.countDocuments(query);

    if (!pageSize || !page) {
        const results = await P2pPools.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $sort: sortQuery },
        ]);
        return res.json({ results, count });
    } else {
        const results = await P2pPools.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $sort: sortQuery },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
        ]);
        return res.json({ results, count });
    }
};

export const setResult = async (req: Request, res: Response) => {
    try {
        const { poolId, status, type, losttype } = req.body;
        console.log(req.body, "body")
        const poolid = ObjectId(poolId);
        const pool = await P2pPools.findOne({ _id: poolid });
        if (pool.status === 'FINISHED' || pool.status === 'CANCELLED')
            return res.status(400).json('You can not resettle!');
        if (status === 'FINISHED') {
            const upool = await P2pPools.findOneAndUpdate({ _id: poolid }, { status, winoption: type })
            let oprofit = 0;
            if (type === 1) {
                oprofit = pool.spool * 0.01
            } else {
                oprofit = pool.fpool * 0.01
            }
            console.log(pool.ownerId, "pool.ownerId")
            if (oprofit > 0) {
                await handleBet({
                    req,
                    currency: '61d45a9c72e5042aaffea2af',
                    userId: pool.ownerId,
                    amount: oprofit,
                    type: 'p2p-bet-owner-settled',
                    info: pool._id
                });
            }
            const bets = await P2pBets.find({ poolId: poolid, type });
            for (let i = 0; i < bets.length; i++) {
                let profit = 0;
                if (type === 1) {
                    profit = (pool.spool * 0.95) * bets[i].stake / pool.fpool
                } else {
                    profit = (pool.fpool * 0.95) * bets[i].stake / pool.spool
                }
                await P2pBets.findOneAndUpdate(
                    { _id: bets[i]._id },
                    { profit, status: 'WIN' }
                );
                console.log("here")
                await handleBet({
                    req,
                    currency: '61d45a9c72e5042aaffea2af',
                    userId: bets[i].userId,
                    amount: profit + bets[i].stake,
                    type: 'p2p-bet-settled',
                    info: bets[i]._id
                });
            }
            await P2pBets.updateMany({ poolId: poolid, type: losttype }, { status: 'LOST' })
            return res.json({ data: upool });
        } else if (status === 'CANCELLED') {
            const upool = await P2pPools.findOneAndUpdate({ _id: poolid }, { status })
            await P2pBets.updateMany({ poolId: poolid }, { status: 'REFUND' });
            const bets = await P2pBets.find({ poolId: poolid });
            for (let i = 0; i < bets.length; i++) {
                await handleBet({
                    req,
                    currency: '61d45a9c72e5042aaffea2af',
                    userId: bets[i].userId,
                    amount: bets[i].stake,
                    type: 'p2p-bet-settled',
                    info: bets[i]._id
                });
            }
            return res.json({ data: upool });
        } else {
            return res.json({ data: true });
        }

    } catch (e) {
        console.log(e)
        return res.status(400).json('Something went wrong!');
    }
}

export const joinPool = async (req: Request, res: Response) => {
    try {
        const { userId, type, stake, currencyId, poolId } = req.body;
        const currency = ObjectId(currencyId);
        const pool = await P2pPools.findOne({ _id: poolId, status: 'ACTIVE' });
        const curr = await Currencies.findOne({ _id: currency });
        if (curr.symbol !== 'USDT') {
            return res.status(400).json('You have to use USDT!');
        }
        const checked = await checkBalance({ userId, currency: currencyId, amount: stake });
        if (!checked) {
            return res.status(400).json('Balances not enough!');
        }
        if (pool) {
            console.log(poolId, "poolId")
            const bet = await P2pBets.findOne({ poolId, userId, type });
            if (bet) {
                return res.status(400).json('You have already joined!');
            } else {
                const bet = new P2pBets({ ...req.body, price: curr.price, status: 'BET' });
                const result = await bet.save();
                if (type === 1) {
                    await P2pPools.findOneAndUpdate(
                        { _id: poolId },
                        { $inc: { fpool: stake, fusers: 1 } },
                        { upsert: true }
                    );
                } else {
                    await P2pPools.findOneAndUpdate(
                        { _id: poolId },
                        { $inc: { spool: stake, susers: 1 } },
                        { upsert: true }
                    );
                }
                await handleBet({
                    req,
                    currency: currencyId,
                    userId,
                    amount: stake * -1,
                    type: 'p2p-bet',
                    info: generatInfo()
                });
                return res.json({ data: result });
            }
        } else {
            return res.status(400).json('The pool is not exist!');
        }
    } catch (e) {
        console.log(e)
        return res.status(400).json('Something went wrong!');
    }
}

export const createPool = async (req: Request, res: Response) => {
    try {
        const pool = new P2pPools({ ...req.body, currency: ObjectId('61d45a9c72e5042aaffea2af') });
        const data = await pool.save();
        return res.json({ data: data });
    } catch (e) {
        console.log(e)
        return res.status(400).json('Something went wrong!');
    }
}

export const getPools = async (req: Request, res: Response) => {
    const gte = new Date();
    try {
        const pools = await P2pPools.aggregate(
            [
                {
                    $match: { status: 'ACTIVE', expire: { $gte: gte } }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'ownerId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $unwind: '$user'
                },
                {
                    $project: {
                        avatar: 1,
                        min: 1,
                        max: 1,
                        option: 1,
                        content: 1,
                        expire: 1,
                        fusers: 1,
                        susers: 1,
                        fpool: 1,
                        spool: 1,
                        'user.avatar': 1,
                        'user.username': 1
                    }
                },
            ]
        );
        return res.json({ data: pools });
    } catch (e) {
        console.log(e);
        return res.status(400).json('Something went wrong!');
    }
}