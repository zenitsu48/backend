import * as request from 'request';
import { ObjectId } from '../base';
import { BetRooms, SportsBetting, Users } from '../../models';
import { Request, Response } from 'express';

const aggregateQuery = [
    {
        $lookup: {
            from: 'sports_lists',
            localField: 'SportId',
            foreignField: 'SportId',
            as: 'sport'
        }
    },
    {
        $lookup: {
            from: 'sports_bets',
            localField: 'betId',
            foreignField: '_id',
            as: 'bet'
        }
    },
    {
        $unwind: '$bet'
    },
    {
        $lookup: {
            from: 'currencies',
            localField: 'bet.currency',
            foreignField: '_id',
            as: 'currency'
        }
    },
    {
        $lookup: {
            from: 'users',
            localField: 'bet.userId',
            foreignField: '_id',
            as: 'user'
        }
    },
    {
        $unwind: '$user'
    },
    {
        $unwind: '$currency'
    },
    {
        $project: { 'currency.abi': 0 }
    },
    {
        $sort: { createdAt: -1 }
    }
] as any;

const aggregateQuery2 = [
    {
        $lookup: {
            from: 'sports_matchs',
            localField: 'eventId',
            foreignField: 'id',
            as: 'sport'
        }
    },
    {
        $unwind: '$sport'
    },
    {
        $lookup: {
            from: 'currencies',
            localField: 'currency',
            foreignField: '_id',
            as: 'currency'
        }
    },
    {
        $unwind: '$currency'
    },
    {
        $sort: { createdAt: -1 }
    }
] as any;

const aggregateQuery3 = [
    {
        $lookup: {
            from: 'sports_end_matchs',
            localField: 'eventId',
            foreignField: 'id',
            as: 'sport'
        }
    },
    {
        $unwind: '$sport'
    },
    {
        $lookup: {
            from: 'currencies',
            localField: 'currency',
            foreignField: '_id',
            as: 'currency'
        }
    },
    {
        $unwind: '$currency'
    },
    {
        $sort: { createdAt: -1 }
    }
] as any;

const getEvent = async (eventId: string) => {
    return new Promise(async (resolve, reject) => {
        const options = {
            method: 'GET',
            url: process.env.ENDED_ENDPOINT as string,
            headers: { 'Content-Type': 'application/json' },
            qs: { token: process.env.SPORTSBOOK_APIKEY, event_id: eventId },
            json: true
        };
        request(options, async (error, response, body) => {
            if (error) {
                resolve({ status: false, result: {} });
            } else {
                if (body && body.success && body.results.length) {
                    const result = body.results[0];
                    resolve({ status: true, result });
                } else {
                    resolve({ status: false, result: {} });
                }
            }
        });
    });
};

export const getEvents = async (req: Request, res: Response) => {
    const { eventId } = req.body;
    const result = await getEvent(eventId);
    return res.json(result);
};

export const get = async (req: Request, res: Response) => {
    const result = await SportsBetting.aggregate(aggregateQuery);
    return res.json(result);
};

export const getOne = async (req: Request, res: Response) => {
    const result = await SportsBetting.aggregate([{ $match: { _id: ObjectId(req.params.id) } }, ...aggregateQuery]);
    return res.json(result[0]);
};

export const list = async (req: Request, res: Response) => {
    const {
        betId = null,
        eventId = null,
        SportId = null,
        oddType = null,
        status = null,
        timeStatus = null,
        date = null,
        sort = null,
        column = null,
        pageSize = null,
        page = null
    } = req.body;
    let query = {} as any;
    let sortQuery = { createdAt: -1 } as any;
    if (eventId) {
        query.eventId = Number(eventId);
    }
    if (betId) {
        query.betId = ObjectId(betId);
    }
    if (SportId) {
        query.SportId = SportId;
    }
    if (oddType) {
        query.oddType = oddType;
    }
    if (timeStatus || timeStatus === 0) {
        query.TimeStatus = String(timeStatus);
    }
    if (status) {
        query.status = status;
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    const count = await SportsBetting.countDocuments(query);
    if (!pageSize || !page) {
        const results = await SportsBetting.aggregate([{ $match: query }, ...aggregateQuery, { $sort: sortQuery }]);
        return res.json({ results, count });
    } else {
        const results = await SportsBetting.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $sort: sortQuery },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize }
        ]);
        return res.json({ results, count });
    }
};

export const create = async (req: Request, res: Response) => {
    const result = await SportsBetting.create(req.body);
    return res.json(result);
};

export const updateOne = async (req: Request, res: Response) => {
    const query = { _id: ObjectId(req.params.id) };
    await SportsBetting.updateOne(query, req.body);
    const result = await SportsBetting.aggregate([{ $match: query }, ...aggregateQuery]);
    return res.json(result[0]);
};

export const deleteOne = async (req: Request, res: Response) => {
    const result = await SportsBetting.deleteOne({
        _id: ObjectId(req.params.id)
    });
    return res.json(result);
};


export const activeList = async (req: Request, res: Response) => {
    const { betId = null, eventId = null, date = null, pageSize = null, page = null } = req.body;
    let query = {} as any;
    let sortQuery = { createdAt: -1 } as any;

    query.finished = false;
    if (betId) {
        query._id = ObjectId(betId);
    }
    if (eventId) {
        query.eventId = Number(eventId);
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    const count = await BetRooms.countDocuments(query);
    if (!pageSize || !page) {
        const results = await SportsBetting.aggregate([{ $match: query }, ...aggregateQuery2, { $sort: sortQuery }]);
        return res.json({ results, count });
    } else {
        const results = await BetRooms.aggregate([
            { $match: query },
            ...aggregateQuery2,
            { $sort: sortQuery },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize }
        ]);
        await results.map(async (row, ind) => {
            row.user1 = { username: '', avatar: '', email: '' };
            row.user2 = { username: '', avatar: '', email: '' };
            row.user3 = { username: '', avatar: '', email: '' };
            if (row.user1Id) row.user1 = await Users.findById(row.user1Id);
            if (row.user2Id) row.user2 = await Users.findById(row.user2Id);
            if (row.user3Id) row.user3 = await Users.findById(row.user3Id);
            if ((row.type === 0 && row.user1Id && row.user2Id && row.user3Id) || (row.type === 1 && row.user1Id && row.user3Id)) {
                row.status = true;
            } else {
                row.status = false;
            }
            if (ind === results.length - 1) {
                setTimeout(() => {
                    return res.json({ results, count });
                }, 500);
            }
        });
        if (!results.length) {
            return res.json({ results: [], count: 0 });
        }
    }
};

export const finishedList = async (req: Request, res: Response) => {
    const { betId = null, eventId = null, date = null, pageSize = null, page = null } = req.body;
    let query = {} as any;
    let sortQuery = { createdAt: -1 } as any;

    query.finished = true;
    if (betId) {
        query._id = ObjectId(betId);
    }
    if (eventId) {
        query.eventId = Number(eventId);
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    const count = await BetRooms.countDocuments(query);
    if (!pageSize || !page) {
        const results = await SportsBetting.aggregate([{ $match: query }, ...aggregateQuery3, { $sort: sortQuery }]);
        return res.json({ results, count });
    } else {
        const results = await BetRooms.aggregate([
            { $match: query },
            ...aggregateQuery3,
            { $sort: sortQuery },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize }
        ]);
        await results.map(async (row, ind) => {
            row.user1 = { username: '', avatar: '', email: '' };
            row.user2 = { username: '', avatar: '', email: '' };
            row.user3 = { username: '', avatar: '', email: '' };
            if (row.user1Id) row.user1 = await Users.findById(row.user1Id);
            if (row.user2Id) row.user2 = await Users.findById(row.user2Id);
            if (row.user3Id) row.user3 = await Users.findById(row.user3Id);
            if ((row.type === 0 && row.user1Id && row.user2Id && row.user3Id) || (row.type === 1 && row.user1Id && row.user3Id)) {
                row.status = true;
            } else {
                row.status = false;
            }
            if (ind === results.length - 1) {
                setTimeout(() => {
                    return res.json({ results, count });
                }, 500);
            }
        });
        if (!results.length) {
            return res.json({ results: [], count: 0 });
        }
    }
};
