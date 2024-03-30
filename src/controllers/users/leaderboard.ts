import { Request, Response } from 'express';
import { CasinoBetHistory, SportsBets, SportsBetsV2, Users } from '../../models';
import { ObjectId } from '../base';

export const getUserProfit = async (req: Request, res: Response) => {

}

export const ranking = async (req: Request, res: Response) => {
    const { pageSize = null, userId = null, page = null, filter = null, userName = null } = req.body;
    const createdAt = {
        $gte: new Date(req.body.date[0]),
        $lte: new Date(req.body.date[1])
    };
    const query = { createdAt }
    console.time()
    const sportsData = await SportsBets.aggregate([
        {
            $match: query
        },
        {
            $group: {
                _id: '$userId',
                profit: {
                    $sum: {
                        $cond: {
                            if: { $lte: ['$profit', 0] },
                            then: {
                                $sum: {
                                    $multiply: ['$profit', '$price']
                                }

                            },
                            else: {
                                $sum: {
                                    $subtract: [{ $multiply: ['$profit', '$price'] }, { $multiply: ['$stake', '$price'] }]
                                }
                            }
                        }

                    },
                },
                volume: {
                    $sum: {
                        $multiply: ['$stake', '$price']
                    }
                },
            }
        },
    ]);
    const casinoData = await CasinoBetHistory.aggregate([
        {
            $match: query
        },
        {
            $group: {
                _id: '$USERID',
                profit: {
                    $sum: {
                        $cond: {
                            if: { $eq: ["$TYPE", "BET"] },
                            then: { $multiply: ["$AMOUNT", -1] },
                            else: "$AMOUNT"
                        }
                    }
                },
                volume: {
                    $sum: {
                        $cond: {
                            if: { $eq: ["$TYPE", "BET"] },
                            then: "$AMOUNT",
                            else: 0
                        }
                    }
                },
            }
        },
    ]);
    const exchangeData = await SportsBetsV2.aggregate([
        {
            $match: query
        },
        {
            $group: {
                _id: '$USERID',
                profit: {
                    $sum: {
                        $cond: {
                            if: { $eq: ["$TYPE", "BET"] },
                            then: { $multiply: ["$AMOUNT", -1] },
                            else: "$AMOUNT"
                        }
                    }
                },
                volume: {
                    $sum: {
                        $cond: {
                            if: { $eq: ["$TYPE", "BET"] },
                            then: "$AMOUNT",
                            else: 0
                        }
                    }
                },
            }
        },
    ]);
    const betData = [...sportsData, ...casinoData, ...exchangeData];
    const leaderboardData = betData.reduce((a, { _id, profit, volume }) => (a[_id] = {
        profit: (a[_id]?.profit || 0) + profit,
        volume: (a[_id]?.volume || 0) + volume,
    }, a), {});
    const users = await Users.find({ _id: { $in: Object.keys(leaderboardData) } }).select({ _id: 1, username: 1, permissionId: 0 })
    const result = []
    for (const key in users) {
        const user = users[key]
        result.push({
            ...leaderboardData[user._id],
            userName: user.username
        })
    }
    const data = result.sort((a, b) => b.profit - a.profit);
    const index = data.findIndex((item) => item.userName == userName);
    const userData = data.filter((item) => item.userName == userName)[0];
    const topData = data.slice(0, 20);
    return res.json({ data: topData, index, userData });
}