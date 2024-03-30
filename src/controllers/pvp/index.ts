import { Request, Response } from 'express';
import { checkBalance, generatInfo, getActiveBet, handleBet, NumberFix, ObjectId } from '../base';
import {
    SportsBets,
    Sessions,
    Balances,
    SportsBetting,
    SportsLists,
    SportsMatchs,
    Users,
    Lankings,
    BetRooms,
    Currencies,
    SportsEndMatchs
} from '../../models';

import { bettingSettled } from './endMatchs';
import { useCurrency } from '../payment';

const TabLabels = [
    { key: '1_1', value: 'Add Draw', type: 'ha', users: 3 },
    { key: '1_1', value: 'Remove Draw', type: 'ha', users: 2 },
    { key: '1_2', value: 'Asian Handicap', type: 'ha', users: 2 },
    { key: '1_3', value: 'O/U', type: 'ou', users: 2 },
    { key: '1_4', value: 'Asian Corners', type: 'ou', users: 2 },
    { key: '1_5', value: '1st Half Handicap', type: 'ha', users: 2 },
    { key: '1_6', value: '1st Half Goal Line', type: 'ou', users: 2 },
    { key: '1_7', value: '1st Half Asian Corners', type: 'ou', users: 2 },
    { key: '1_8', value: 'Half Time Result', type: 'ha', users: 3 }
];

const LankType = ['won', 'lost', 'draw', 'not', 'Wprofit', 'Lprofit'];

export const createBetRoom = async (req: Request, res: Response) => {
    const { token, id, amount, winner, type } = req.body;
    const sessions: any = await Sessions.findOne({
        accessToken: token
    });
    if (!sessions) return res.status(400).json('Your token is not valid');

    const balance: any = await Balances.findOne({
        userId: sessions.userId,
        status: true
    });
    if (!balance) return res.status(400).json('Your balance is not valid');

    const sportsMatch = await SportsMatchs.findOne({
        id: id
    });
    if (!sportsMatch) return res.status(400).json('Game is not valid');

    if (TabLabels[type].users === 2 && winner == '2') return res.status(400).json('You are a fake');

    let betRoom = new BetRooms();

    let home_od = Number(sportsMatch.odds[TabLabels[type].key]['home_od']),
        draw_od = Number(sportsMatch.odds[TabLabels[type].key]['draw_od']),
        away_od = Number(sportsMatch.odds[TabLabels[type].key]['away_od']),
        handicap = 0;

    if (TabLabels[type].type === 'ou') {
        home_od = sportsMatch.odds[TabLabels[type].key]['over_od'];
        away_od = sportsMatch.odds[TabLabels[type].key]['under_od'];
    }

    if (type !== 1 && TabLabels[type].users === 2) handicap = Number(sportsMatch.odds[TabLabels[type].key]['handicap']);

    if (!home_od || !away_od) return res.status(400).json('Odds are not valid');

    (betRoom.eventId = id), (betRoom.currency = balance.currency._id), (betRoom.finished = false), (betRoom.type = type);

    if (winner == '1') {
        betRoom.user1Id = sessions.userId;
        betRoom.user1Winner = winner;
        betRoom.user1Balance = amount;
        if (TabLabels[type].users === 3) {
            betRoom.user1Odds = home_od;
            betRoom.user2Balance = formatBalance(amount, home_od, draw_od);
            betRoom.user2Odds = draw_od;
            betRoom.user3Balance = formatBalance(amount, home_od, away_od);
            betRoom.user3Odds = away_od;
        } else {
            if (type === 1) {
                betRoom.user1Odds = toFixed((home_od + away_od) / away_od, 3);
                betRoom.user3Balance = formatBalance(
                    amount,
                    toFixed((home_od + away_od) / away_od, 3),
                    toFixed((home_od + away_od) / home_od, 3)
                );
                betRoom.user3Odds = toFixed((home_od + away_od) / home_od, 3);
            } else {
                betRoom.user1Odds = home_od;
                betRoom.user3Balance = formatBalance(amount, home_od, away_od);
                betRoom.user3Odds = away_od;
                betRoom.handicap = handicap;
            }
        }
    } else if (winner == '2') {
        betRoom.user2Id = sessions.userId;
        betRoom.user2Winner = winner;
        betRoom.user2Balance = amount;
        betRoom.user2Odds = draw_od;
        betRoom.user1Balance = formatBalance(amount, draw_od, home_od);
        betRoom.user1Odds = home_od;
        betRoom.user3Balance = formatBalance(amount, draw_od, away_od);
        betRoom.user3Odds = away_od;
    } else if (winner == '0') {
        betRoom.user3Id = sessions.userId;
        betRoom.user3Winner = winner;
        betRoom.user3Balance = amount;
        if (TabLabels[type].users === 3) {
            betRoom.user3Odds = away_od;
            betRoom.user1Balance = formatBalance(amount, away_od, home_od);
            betRoom.user1Odds = home_od;
            betRoom.user2Balance = formatBalance(amount, away_od, draw_od);
            betRoom.user2Odds = draw_od;
        } else {
            if (type === 1) {
                betRoom.user3Odds = toFixed((home_od + away_od) / home_od, 3);
                betRoom.user1Balance = formatBalance(
                    amount,
                    toFixed((home_od + away_od) / home_od, 3),
                    toFixed((home_od + away_od) / away_od, 3)
                );
                betRoom.user1Odds = toFixed((home_od + away_od) / away_od, 3);
            } else {
                betRoom.user3Odds = away_od;
                betRoom.user1Balance = formatBalance(amount, away_od, home_od);
                betRoom.user1Odds = home_od;
                betRoom.handicap = handicap;
            }
        }
    } else return res.status(400).json('Your winner is not valid');

    await betRoom.save();

    const me: any = await BetRooms.findOne().sort({ createdAt: -1 });
    const user: any = await Users.findById(sessions.userId);

    let result = {
        id: me._id,
        user1: {},
        user2: {},
        user3: {},
        eventId: id,
        currency: {
            id: balance.currency._id,
            symbol: balance.currency.symbol,
            icon: balance.currency.icon
        },
        type: me.type
    };
    if (winner == '1') {
        result.user1 = {
            id: user._id,
            username: user.username,
            avatar: user.avatar,
            winner: winner,
            balance: amount,
            odds: me.user1Odds
        };
        result.user2 = {
            balance: me.user2Balance,
            odds: me.user2Odds
        };
        result.user3 = {
            balance: me.user3Balance,
            odds: me.user3Odds
        };
    } else if (winner == '2') {
        result.user2 = {
            id: user._id,
            username: user.username,
            avatar: user.avatar,
            winner: winner,
            balance: amount,
            odds: me.user2Odds
        };
        result.user1 = {
            balance: me.user1Balance,
            odds: me.user1Odds
        };
        result.user3 = {
            balance: me.user3Balance,
            odds: me.user3Odds
        };
    } else if (winner == '0') {
        result.user3 = {
            id: user._id,
            username: user.username,
            avatar: user.avatar,
            winner: winner,
            balance: amount,
            odds: me.user3Odds
        };
        result.user1 = {
            balance: me.user1Balance,
            odds: me.user1Odds
        };
        result.user2 = {
            balance: me.user2Balance,
            odds: me.user2Odds
        };
    }
    req.app.get('io').emit('createRoom', { data: result });

    const info = 'create-bet ' + TabLabels[type].value;

    await handleBet({
        req,
        currency: balance.currency._id,
        userId: sessions.userId,
        amount: -amount,
        type: info,
        info: me._id
    });

    res.json({ status: 200, message: 'success' });
};

export const joinBetRoom = async (req: Request, res: Response) => {
    const { token, id, roomId, winner } = req.body;

    const sessions: any = await Sessions.findOne({
        accessToken: token
    });
    if (!sessions) {
        res.status(400).json('Your token is not valid');
        return;
    }

    const room: any = await BetRooms.findById(ObjectId(roomId));
    if (!room) {
        res.status(400).json('Your Room is not valid');
        return;
    }
    const user = await Users.findById(sessions.userId);
    if (!user) {
        res.status(400).json('You is not exists');
        return;
    }

    let query, result, amount;
    if (winner == 1) {
        query = {
            user1Id: sessions.userId,
            user1Winner: winner
        };

        result = {
            id: roomId,
            user1: {
                id: user._id,
                username: user.username,
                avatar: user.avatar,
                winner: winner,
                balance: room.user1Balance,
                odds: room.user1Odds
            },
            eventId: id
        };

        amount = room.user1Balance;
    } else if (winner == 2 && TabLabels[room.type].users === 3) {
        query = {
            user2Id: sessions.userId,
            user2Winner: winner
        };

        result = {
            id: roomId,
            user2: {
                id: user._id,
                username: user.username,
                avatar: user.avatar,
                winner: winner,
                balance: room.user2Balance,
                odds: room.user2Odds
            },
            eventId: id
        };

        amount = room.user2Balance;
    } else if (winner == 0) {
        query = {
            user3Id: sessions.userId,
            user3Winner: winner
        };

        result = {
            id: roomId,
            user3: {
                id: user._id,
                username: user.username,
                avatar: user.avatar,
                winner: winner,
                balance: room.user3Balance,
                odds: room.user3Odds
            },
            eventId: id
        };

        amount = room.user3Balance;
    }

    await BetRooms.updateOne({ _id: ObjectId(roomId) }, query);

    req.app.get('io').emit('joinRoom', { data: result });

    const info = 'join-bet ' + TabLabels[room.type].value;

    await handleBet({
        req,
        currency: room.currency,
        userId: sessions.userId,
        amount: -amount,
        type: info,
        info: roomId
    });

    res.json({ status: 200, message: 'success' });
};

export const getRoom = async (req: Request, res: Response) => {
    const { id } = req.body;

    // await BetRooms.updateOne({ _id: ObjectId('63691623af86746abc73356a') }, { type: 1 });
    // await BetRooms.updateMany({ bet2: { $ne: true } }, { type: 0 });

    const betRoomes = await BetRooms.find({
        eventId: id
    }).sort({ createdAt: 1 });

    if (!betRoomes.length) {
        res.json({ status: 200, data: [] });
        return;
    }

    let Rooms = Array();
    await Promise.all(
        betRoomes.map(async (row: any, index: number) => {
            let room = {
                id: row._id,
                user1: {},
                user2: {},
                user3: {},
                currency: {},
                type: row.type,
                stateGrid: false
            };

            if (TabLabels[row.type].users === 2) room.stateGrid = true;

            if (row.user1Id) {
                const user1 = await Users.findById(row.user1Id);
                room.user1 = {
                    id: user1?._id,
                    username: user1?.username,
                    avatar: user1?.avatar,
                    winner: row.user1Winner,
                    balance: NumberFix(row.user1Balance, 5),
                    odds: row.user1Odds
                };
            } else
                room.user1 = {
                    balance: NumberFix(row.user1Balance, 5),
                    odds: row.user1Odds
                };
            if (TabLabels[row.type].users === 3) {
                if (row.user2Id) {
                    const user2 = await Users.findById(row.user2Id);
                    room.user2 = {
                        id: user2?._id,
                        username: user2?.username,
                        avatar: user2?.avatar,
                        winner: row.user2Winner,
                        balance: NumberFix(row.user2Balance, 5),
                        odds: row.user2Odds
                    };
                } else
                    room.user2 = {
                        balance: NumberFix(row.user2Balance, 5),
                        odds: row.user2Odds
                    };
            }

            if (row.user3Id) {
                const user3 = await Users.findById(row.user3Id);
                room.user3 = {
                    id: user3?._id,
                    username: user3?.username,
                    avatar: user3?.avatar,
                    winner: row.user3Winner,
                    balance: NumberFix(row.user3Balance, 5),
                    odds: row.user3Odds
                };
            } else
                room.user3 = {
                    balance: NumberFix(row.user3Balance, 5),
                    odds: row.user3Odds
                };

            const currency = await Currencies.findById(row.currency);
            room.currency = {
                id: currency?._id,
                symbol: currency?.symbol,
                icon: currency?.icon
            };
            Rooms.push(room);
        })
    );

    res.json({ status: 200, data: Rooms });
};

const getResult = async (bet: any, row: any, index: String) => {
    let oddType = '';
    const data = row.matchs;
    if (TabLabels[row.type].type === 'ha') {
        if (index === 'user1') {
            oddType = 'home';
        } else if (index === 'user2') {
            oddType = 'draw';
        } else if (index === 'user3') {
            oddType = 'away';
        }
    } else {
        if (index === 'user1') {
            oddType = 'over';
        } else if (index === 'user3') {
            oddType = 'under';
        }
    }
    bet.oddType = oddType;
    bet.stake = row[index + 'Balance'];
    bet.odd = row[index + 'Odds'];

    const matchEndState = data.ss.split("-");
    if (row.type == 2 && (matchEndState[0] == matchEndState[1])) {
        await _handleBet(row.currency, row[index + 'Id'], row[index + 'Balance'], "REFUND" + '_' + row._id);
        const keyProfit = index + 'Profit';
        const keyStatus = index + 'Status';
        await BetRooms.updateOne({ _id: row._id }, { [keyProfit]: row[index + 'Balance'], [keyStatus]: "REFUND" });
        await Lankfunc(row.user1Id, 2, row[index + 'Balance'], row.currency);
    } else {
        const { profit, status, scores, state } = await bettingSettled({ bet, data });
        if (state) {
            let amount = 0;
            if (profit !== 0) {
                amount = await formatBalanceFee(row[index + 'Id'], row.currency, row[index + 'Balance'], profit);
            } else {
                amount = profit;
            }

            await _handleBet(row.currency, row[index + 'Id'], amount, status + '_' + row._id);
            const keyProfit = index + 'Profit';
            const keyStatus = index + 'Status';
            await BetRooms.updateOne({ _id: row._id }, { [keyProfit]: amount, [keyStatus]: status });

            if (status === 'WIN' || status === 'HALF_WIN') {
                await Lankfunc(row.user1Id, 0, amount, row.currency);
            } else if (status === 'LOST' || status === 'HALF_LOST') {
                if (status === 'LOST') amount = row[index + 'Balance'] * row[index + 'Odds'] * -1;
                else amount = -1 * amount;
                await Lankfunc(row.user1Id, 1, amount, row.currency);
            } else if (status === 'REFUND') {
                await Lankfunc(row.user1Id, 2, amount, row.currency);
            }
        }

    }

};

export const endsMatch = async () => {
    const result = await BetRooms.aggregate([
        { $match: { finished: false } },
        // { $group: { _id: '$eventId' } },
        {
            $lookup: {
                from: 'sports_end_matchs',
                localField: 'eventId',
                foreignField: 'id',
                as: 'matchs'
            }
        },
        {
            $unwind: '$matchs'
        },
        {
            $match: {
                'matchs.time_status': 3
            }
        }
    ]);

    result.map(async (row: any, ind) => {
        if (TabLabels[row.type].users === 3 && row.user1Id && row.user2Id && row.user3Id) {
            let bet = {
                oddType: '',
                SportId: Number(row.matchs.sport_id),
                marketId: TabLabels[row.type].key,
                stake: 0,
                odd: 0
            };
            if (row.user1Id) {
                await getResult(bet, row, 'user1');
            }
            if (row.user2Id) {
                await getResult(bet, row, 'user2');
            }
            if (row.user3Id) {
                await getResult(bet, row, 'user3');
            }
        } else if (TabLabels[row.type].users === 2 && row.user1Id && row.user3Id) {
            let bet = {
                oddType: '',
                SportId: Number(row.matchs.sport_id),
                marketId: TabLabels[row.type].key,
                stake: 0,
                odd: 0,
                handicap: row.type !== 1 ? row.handicap : 0
            };
            if (row.user1Id) {
                await getResult(bet, row, 'user1');
            }
            if (row.user3Id) {
                await getResult(bet, row, 'user3');
            }
        } else {
            const info = 'Bet not placed ' + row._id;
            if (row.user1Id) {
                await _handleBet(row.currency, row.user1Id, row.user1Balance, info);
                await Lankfunc(row.user1Id, 3);
            }
            if (row.user2Id) {
                await _handleBet(row.currency, row.user2Id, row.user2Balance, info);
                await Lankfunc(row.user2Id, 3);
            }
            if (row.user3Id) {
                await _handleBet(row.currency, row.user3Id, row.user3Balance, info);
                await Lankfunc(row.user3Id, 3);
            }
        }
        await BetRooms.updateOne({ _id: row._id }, { finished: true });
    });
};

export const getLanking = async (req: Request, res: Response) => {
    const results = await Lankings.aggregate([
        {
            $sort: {
                Wprofit: -1
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $project: {
                user: { username: 1, email: 1, avatar: 1 },
                won: 1,
                draw: 1,
                lost: 1,
                not: 1,
                Wprofit: 1,
                Lprofit: 1
            }
        },
        { $limit: 10 }
    ]);
    res.json({ status: 200, data: results });
};

const formatBalance = (amount: number, odd1: number, odd2: number) => {
    return NumberFix((amount * odd1) / odd2, 5);
};

const formatBalanceFee = async (userId: string, currency: string, balance: string, profit: number) => {
    const fee = ((profit - Number(balance)) / 100) * 10;
    const user: any = await Users.findById(userId);
    if (user.rReferral) {
        const referralUser: any = await Users.findOne({ iReferral: user.rReferral });
        const info = 'referral_user_win_' + referralUser.email;
        await _handleBet(currency, referralUser._id, fee / 2, info);
        return toFixed(profit - fee, 3);
    } else {
        return toFixed(profit - fee, 3);
    }
};

const _handleBet = async (currency: string, userId: string, amount: number, info: string) => {
    await handleBet({
        req: undefined,
        currency: currency,
        userId: userId,
        amount: amount,
        type: 'finish-bet',
        info: info
    });
};

const toFixed = (num: number, fixed: number) => {
    fixed = fixed || 0;
    fixed = Math.pow(10, fixed);
    return Math.floor(num * fixed) / fixed;
};

const getResultL = async (bet: any, row: any, index: String) => {
    let oddType = '';
    const data = row.matchs;
    if (TabLabels[row.type].type === 'ha') {
        if (index === 'user1') {
            oddType = 'home';
        } else if (index === 'user2') {
            oddType = 'draw';
        } else if (index === 'user3') {
            oddType = 'away';
        }
    } else {
        if (index === 'user1') {
            oddType = 'over';
        } else if (index === 'user3') {
            oddType = 'under';
        }
    }
    bet.oddType = oddType;
    bet.stake = row[index + 'Balance'];
    bet.odd = row[index + 'Odds'];
    const { profit, status, scores, state } = await bettingSettled({ bet, data });
    if (state) {
        let amount = 0;
        if (profit !== 0) {
            amount = await formatBalanceFee(row[index + 'Id'], row.currency, row[index + 'Balance'], profit);
        } else {
            amount = profit;
        }
        if (status === 'WIN' || status === 'HALF_WIN') {
            await Lankfunc(row.user1Id, 0, amount, row.currency);
        } else if (status === 'LOST' || status === 'HALF_LOST') {
            if (status === 'LOST') amount = row[index + 'Balance'] * row[index + 'Odds'] * -1;
            else amount = -1 * amount;
            await Lankfunc(row.user1Id, 1, amount, row.currency);
        } else if (status === 'REFUND') {
            await Lankfunc(row.user1Id, 2, amount, row.currency);
        }
    }
};

const Lankfunc = async (userId: any, type: number, amount: number = 0, currencyId: any | undefined = undefined) => {
    const userLank: any = await Lankings.findOne({ userId });

    if (!userLank) {
        let data: any = new Lankings();
        data.userId = userId;
        data[LankType[type]] = 1;
        if (type === 0 || type === 1) {
            const currency: any = await Currencies.findById(currencyId);
            let _amount = amount * currency.price;
            const key = currency.symbol.toLocaleLowerCase();
            if (type === 0) {
                data[LankType[4]][key] = amount;
                data[LankType[4]]['total'] = _amount;
            } else if (type === 1) {
                data[LankType[5]][key] = amount;
                data[LankType[5]]['total'] = _amount;
            }
        }
        await data.save();
    } else {
        let query = { [LankType[type]]: userLank[LankType[type]] + 1 };
        if (type === 0 || type === 1) {
            const currency: any = await Currencies.findById(currencyId);
            let _amount = amount * currency.price;
            const key = currency.symbol.toLocaleLowerCase();
            if (type === 0) {
                query[LankType[4]] = {};
                query[LankType[4]][key] = userLank[LankType[4]][key] + amount;
                query[LankType[4]]['total'] = userLank[LankType[4]]['total'] + _amount;
            } else if (type === 1) {
                query[LankType[5]] = {};
                query[LankType[5]][key] = userLank[LankType[5]][key] + amount;
                query[LankType[5]]['total'] = userLank[LankType[5]]['total'] + _amount;
            }
        }
        await Lankings.updateOne({ userId }, query);
    }
};

