import * as moment from "moment";
import { Request, Response } from "express";
import { getProfit, ObjectId, toNumber } from "../base";
import {
  Users,
  Permissions,
  SportsBets,
  Payments,
  Sessions,
  Balances,
  LoginHistories,
  Currencies,
  SportsBetting,
  Games,
  BalanceHistories,
  CasinoBetHistory,
  SportsBetsV2,
  PokerBetHistory,
} from "../../models";
import { DashboardSettings } from "../../models/settings/dashboard";

const filter = (data: any) => (data ? data : 0);

const addDays = (days: number, dates: Date) => {
  let date = new Date(dates.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

const getDates = (startDate: any, stopDate: any) => {
  var dateArray = new Array();
  var currentDate = startDate;
  while (currentDate <= stopDate) {
    dateArray.push(new Date(currentDate));
    currentDate = addDays(1, currentDate);
  }
  return dateArray;
};

export const getChartData = async (req: Request, res: Response) => {
  const { date } = req.body;
  const query = [
    {
      $match: {
        createdAt: {
          $gte: new Date(date[0]),
          $lte: new Date(date[1]),
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$_id" },
          month: { $month: "$_id" },
          day: { $dayOfMonth: "$_id" },
        },
        Total: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        Total: 1,
        name: {
          $concat: [
            { $convert: { input: "$_id.year", to: "string" } },
            "-",
            { $convert: { input: "$_id.month", to: "string" } },
            "-",
            { $convert: { input: "$_id.day", to: "string" } },
          ],
        },
      },
    },
  ];
  const cUsers = await Users.aggregate(query);
  const cSportsBets = await SportsBets.aggregate(query);
  const cBets = await Games.aggregate(query);
  const cPayments = await Payments.aggregate([
    { $match: { $and: [{ status: { $ne: 0 } }, { status: { $ne: -1 } }] } },
    ...query,
  ]);
  const cLoginHistories = await LoginHistories.aggregate(query);
  const cData = [
    {
      count: cBets.length,
      value: cBets,
    },
    {
      count: cUsers.length,
      value: cUsers,
    },
    {
      count: cSportsBets.length,
      value: cSportsBets,
    },
    {
      count: cPayments.length,
      value: cPayments,
    },
    {
      count: cLoginHistories.length,
      value: cLoginHistories,
    },
  ].sort((a, b) => b.count - a.count)[0];
  const dates = cData.value.map((item) => item.name);
  const charts = [] as any;
  for (const i in dates) {
    const user = cUsers.find((e) => e.name === dates[i])?.Total;
    const bet1 = cSportsBets.find((e) => e.name === dates[i])?.Total;
    const bet2 = cBets.find((e) => e.name === dates[i])?.Total;
    const payment = cPayments.find((e) => e.name === dates[i])?.Total;
    const login = cLoginHistories.find((e) => e.name === dates[i])?.Total;
    const result = {
      user: filter(user),
      bet: filter(bet1) + filter(bet2),
      payment: filter(payment),
      login: filter(login),
      name: dates[i],
    };
    charts.push(result);
  }
  charts.sort(
    (a: any, b: any) => new Date(a.name).valueOf() - new Date(b.name).valueOf()
  );
  return res.json(charts);
};

export const getPlayerData = async (req: Request, res: Response) => {
  const { date } = req.body;
  const permission = await Permissions.findOne({ title: "player" });
  const players = await Users.countDocuments({
    permissionId: permission._id,
    createdAt: { $gte: new Date(date[0]), $lte: new Date(date[1]) },
  });
  const login = await LoginHistories.countDocuments({
    createdAt: { $gte: new Date(date[0]), $lte: new Date(date[1]) },
  });
  const logined = await Sessions.countDocuments({
    createdAt: { $gte: new Date(date[0]), $lte: new Date(date[1]) },
  });
  const bets = await SportsBets.countDocuments({
    createdAt: { $gte: new Date(date[0]), $lte: new Date(date[1]) },
  });
  const games = await Games.countDocuments({
    createdAt: { $gte: new Date(date[0]), $lte: new Date(date[1]) },
  });
  return res.json({ players, login, logined, bets, games });
};

export const getSportsBetData = async (req: Request, res: Response) => {
  const { date, userId } = req.body;
  let query: any = {}
  if (userId) {
    query.userId = ObjectId(userId)
  }
  const sportsBets = await SportsBets.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(date[0]),
          $lte: new Date(date[1]),
        },
        ...query
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
      $group: {
        _id: {
          status: "$status",
          currency: "$currency",
        },
        stake: { $sum: "$stake" },
        profit: { $sum: "$profit" },
        stake_usd: { $sum: { $multiply: ["$stake", "$price"] } },
        profit_usd: { $sum: { $multiply: ["$profit", "$price"] } },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        stake: 1,
        profit: 1,
        stake_usd: 1,
        profit_usd: 1,
        count: 1,
        revenue: { $subtract: ["$profit", "$stake"] },
        revenue_usd: { $subtract: ["$profit_usd", "$stake_usd"] },
        _id: 0,
        currency: "$_id.currency.symbol",
        order: "$_id.currency.order",
        status: "$_id.status",
      },
    },
    {
      $sort: {
        order: 1,
      },
    },
  ]);
  const currencies = await Currencies.aggregate([
    {
      $match: { status: true },
    },
    {
      $project: {
        _id: 0,
        order: "$order",
        currency: "$symbol",
        icon: "$icon",
        price: "$price",
      },
    },
  ]);
  const data = [] as any;
  for (const i in currencies) {
    const sportsbet = sportsBets.filter(
      (e) => e.currency === currencies[i].currency
    );

    let win = 0;
    let winstake = 0;
    let lost = 0;
    let refund = 0;
    let profit = 0;
    let bet = 0;
    let activebet = 0;
    let win_usd = 0;
    let winstake_usd = 0;
    let lost_usd = 0;
    let refund_usd = 0;
    let profit_usd = 0;
    let bet_usd = 0;
    let activebet_usd = 0;
    let count = 0;
    for (const j in sportsbet) {
      const status = sportsbet[j].status;
      if (status === "WIN" || status === "HALF_WIN") {
        win += sportsbet[j].profit;
        winstake += sportsbet[j].stake;
        win_usd += sportsbet[j].profit_usd;
        winstake_usd += sportsbet[j].stake_usd;
      } else if (status === "LOST" || status === "HALF_LOST") {
        lost += sportsbet[j].profit * -1;
        lost_usd += sportsbet[j].profit_usd * -1;
      } else if (status === "REFUND" || status === "CANCEL") {
        refund += sportsbet[j].stake;
        refund_usd += sportsbet[j].stake_usd;
      } else if (status === "BET") {
        activebet += sportsbet[j].stake;
        activebet_usd += sportsbet[j].stake_usd;
      }
      bet += sportsbet[j].stake;
      bet_usd += sportsbet[j].stake_usd;
      count += sportsbet[j].count;
    }
    profit = lost - (win - winstake);
    profit_usd = lost_usd - (win_usd - winstake_usd);
    if (win || lost || refund || profit || bet || activebet || count) {
      data.push({
        icon: currencies[i].icon,
        order: currencies[i].order,
        currency: currencies[i].currency,
        price: currencies[i].price,
        count,
        win,
        lost,
        profit,
        bet,
        activebet,
        refund,
        win_usd,
        lost_usd,
        profit_usd,
        bet_usd,
        activebet_usd,
        refund_usd,
      });
    }
  }
  data.sort((a: any, b: any) => a.order - b.order);
  return res.json(data);
};

export const getBalanceData = async (req: Request, res: Response) => {
  const { date, userId } = req.body;
  let query: any = {};
  if (userId) {
    query.userId = ObjectId(userId)
  }
  const balances = await Balances.aggregate([
    {
      $match: query
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
      $group: {
        _id: {
          currency: "$currency",
        },
        balance: { $sum: "$balance" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        balance: 1,
        count: 1,
        _id: 0,
        currency: "$_id.currency.symbol",
        order: "$_id.currency.order",
        usd: {
          $multiply: ["$balance", "$_id.currency.price"],
        },
      },
    },
    {
      $sort: {
        order: 1,
      },
    },
  ]);
  const payments = await Payments.aggregate([
    {
      $match: {
        $and: [
          { status: { $ne: 0 } },
          { status: { $ne: -1 } },
          {
            createdAt: {
              $gte: new Date(date[0]),
              $lte: new Date(date[1]),
            },
          },
        ],
        ...query
      },
    },
    {
      $lookup: {
        from: "balances",
        localField: "balanceId",
        foreignField: "_id",
        as: "balance",
      },
    },
    {
      $unwind: "$balance",
    },
    {
      $lookup: {
        from: "currencies",
        localField: "balance.currency",
        foreignField: "_id",
        as: "currency",
      },
    },
    {
      $unwind: "$currency",
    },
    {
      $group: {
        _id: {
          status: "$ipn_type",
          currency: "$currency",
        },
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        amount: 1,
        usd: { $multiply: ["$amount", "$_id.currency.price"] },
        count: 1,
        _id: 0,
        currency: "$_id.currency.symbol",
        order: "$_id.currency.order",
        status: "$_id.status",
      },
    },
    {
      $sort: {
        order: 1,
        status: 1,
      },
    },
  ]);
  const currencies = await Currencies.aggregate([
    {
      $match: { status: true },
    },
    {
      $project: {
        _id: 0,
        order: "$order",
        currency: "$symbol",
        icon: "$icon",
        price: "$price",
      },
    },
  ]);
  const data = [] as any;
  for (const i in currencies) {
    const balance = balances.find((e) => e.currency === currencies[i].currency);
    const deposit = payments.find(
      (e) => e.currency === currencies[i].currency && e.status === "deposit"
    );
    const withdrawal = payments.find(
      (e) => e.currency === currencies[i].currency && e.status === "withdrawal"
    );

    if (balance || deposit || withdrawal) {
      data.push({
        icon: currencies[i].icon,
        order: currencies[i].order,
        currency: currencies[i].currency,
        price: currencies[i].price,
        balance: filter(balance?.balance),
        deposit: filter(deposit?.amount),
        withdrawal: filter(withdrawal?.amount),
      });
    }

  }
  data.sort((a: any, b: any) => a.order - b.order);
  return res.json(data);
};

export const getCasinoBetData = async (req: Request, res: Response) => {
  const { date, type, userId } = req.body;
  let subquery: any = {};
  if (userId) {
    subquery.USERID = ObjectId(userId)
  }
  const query: any = [
    {
      $match: {
        createdAt: {
          $gte: new Date(date[0]),
          $lte: new Date(date[1]),
        },
        ...subquery
      },
    },
    {
      $lookup: {
        from: "currencies",
        localField: "betting.origin_currency",
        foreignField: "symbol",
        as: "currency",
      },
    },
    {
      $unwind: "$currency",
    },
    {
      $group: {
        _id: {
          currency: "$currency"
        },
        bet: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: "$betting.origin_bet_amount",
              else: 0
            }
          }
        },
        bet_usd: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: "$AMOUNT",
              else: 0
            }
          }
        },
        win: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "WIN"] },
              then: "$betting.origin_bet_amount",
              else: 0
            }
          }
        },
        win_usd: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "WIN"] },
              then: "$AMOUNT",
              else: 0
            }
          }
        },
        profit: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "WIN"] },
              then: { $multiply: ["$betting.origin_bet_amount", -1] },
              else: "$betting.origin_bet_amount"
            }
          }
        },
        profit_usd: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "WIN"] },
              then: { $multiply: ["$AMOUNT", -1] },
              else: "$AMOUNT"
            }
          }
        },
        count: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: 1,
              else: 0
            }
          }
        },
      },
    },
    {
      $project: {
        bet: 1,
        bet_usd: 1,
        win: 1,
        win_usd: 1,
        profit: 1,
        profit_usd: 1,
        count: 1,
        _id: 0,
        currency: "$_id.currency.symbol",
        icon: "$_id.currency.icon",
        order: "$_id.currency.order",
        price: "$_id.currency.price",
        status: "$_id.status",
      },
    },
    {
      $sort: {
        order: 1,
      },
    },
  ];


  let data;
  switch (type) {
    case 'casino':
      data = await CasinoBetHistory.aggregate(query);
      break;

    case 'exchange':
      data = await SportsBetsV2.aggregate(query);
      break;

    case 'poker':
      data = await PokerBetHistory.aggregate(query);
      break;

    default:
      break;
  }
  return res.json(data);
};

export const getGamesBetData = async (req: Request, res: Response) => {
  const { date, userId } = req.body;
  let query: any = {};
  if (userId) {
    query.userId = ObjectId(userId)
  }
  const games = await Games.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(date[0]),
          $lte: new Date(date[1]),
        },
        ...query
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
      $group: {
        _id: {
          status: "$status",
          currency: "$currency",
        },
        amount: { $sum: "$amount" },
        profit: { $sum: "$profit" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        amount: 1,
        profit: 1,
        count: 1,
        revenue: { $subtract: ["$amount", "$profit"] },
        _id: 0,
        currency: "$_id.currency.symbol",
        order: "$_id.currency.order",
        status: "$_id.status",
      },
    },
    {
      $sort: {
        order: 1,
      },
    },
  ]);
  const currencies = await Currencies.aggregate([
    {
      $match: { status: true },
    },
    {
      $project: {
        order: "$order",
        currency: "$symbol",
        icon: "$icon",
        price: "$price",
      },
    },
  ]);
  const data = [] as any;
  for (const i in currencies) {
    const sportsbet = games.filter(
      (e) => e.currency === currencies[i].currency
    );
    let win = 0;
    let lost = 0;
    let refund = 0;
    let profit = 0;
    let bet = 0;
    let activebet = 0;
    let count = 0;
    for (const j in sportsbet) {
      profit += sportsbet[j].revenue;
      const status = sportsbet[j].status;
      if (status === "WIN") {
        win += sportsbet[j].profit;
      } else if (status === "LOST") {
        lost += sportsbet[j].amount - sportsbet[j].profit;
      } else if (status === "DRAW") {
        refund += sportsbet[j].amount;
      } else if (status === "BET") {
        activebet += sportsbet[j].amount;
      }
      bet += sportsbet[j].amount;
      count += sportsbet[j].count;
    }
    if (count) {
      const profits = await getProfit(currencies[i]._id, date);
      data.push({
        icon: currencies[i].icon,
        currency: currencies[i].currency,
        order: currencies[i].order,
        price: currencies[i].price,
        rtp: profits.percent ? profits.percent : 0,
        count,
        win,
        lost,
        profit,
        bet,
        activebet,
        refund,
      });
    }
  }
  data.sort((a: any, b: any) => a.order - b.order);
  return res.json(data);
};

export const getUserProfit = async (req: Request, res: Response) => {
  const userId = ObjectId(req.body.userId);
  const createdAt = {
    $gte: new Date(req.body.date[0]),
    $lte: new Date(req.body.date[1]),
  };
  const logined = await LoginHistories.countDocuments({ userId, createdAt });

  const query = [
    {
      $match: {
        userId,
        createdAt,
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$_id" },
          month: { $month: "$_id" },
          day: { $dayOfMonth: "$_id" },
        },
        Total: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        Total: 1,
        name: {
          $concat: [
            { $convert: { input: "$_id.year", to: "string" } },
            "-",
            { $convert: { input: "$_id.month", to: "string" } },
            "-",
            { $convert: { input: "$_id.day", to: "string" } },
          ],
        },
      },
    },
  ];
  const cSportsBets = await SportsBets.aggregate(query);
  // const cCasinoBets = await CasinoBetHistory.aggregate(query);
  const cPayments = await Payments.aggregate([
    { $match: { $and: [{ status: { $ne: 0 } }, { status: { $ne: -1 } }] } },
    ...query,
  ]);
  const cLoginHistories = await LoginHistories.aggregate(query);
  const cData = [
    {
      count: cSportsBets.length,
      value: cSportsBets,
    },
    // {
    //   count: cCasinoBets.length,
    //   value: cCasinoBets,
    // },
    {
      count: cPayments.length,
      value: cPayments,
    },
    {
      count: cLoginHistories.length,
      value: cLoginHistories,
    },
  ].sort((a: any, b: any) => b.count - a.count)[0];
  const date = cData.value.map((item) => item.name);
  const charts = [] as any;
  for (const i in date) {
    const bet1 = cSportsBets.find((e) => e.name === date[i])?.Total;
    // const bet2 = cCasinoBets.find((e) => e.name === date[i])?.Total;
    const payment = cPayments.find((e) => e.name === date[i])?.Total;
    const login = cLoginHistories.find((e) => e.name === date[i])?.Total;
    const result = {
      // bet: filter(bet1) + filter(bet2),
      bet: filter(bet1),
      payment: filter(payment),
      login: filter(login),
      name: date[i],
    };
    charts.push(result);
  }
  charts.sort(
    (a: any, b: any) => new Date(a.name).valueOf() - new Date(b.name).valueOf()
  );
  const user = await Users.findById(userId);

  return res.json({ logined, charts, user });
};

export const removeTest = async (req: Request, res: Response) => {
  const userId = ObjectId(req.body.userId);
  await LoginHistories.deleteMany({ userId });
  await BalanceHistories.deleteMany({ userId });
  await Payments.deleteMany({ userId });
  await Games.deleteMany({ userId });
  const sportsbets = await SportsBets.find({ userId });
  for (const i in sportsbets) {
    await SportsBets.deleteOne({ _id: sportsbets[i]._id });
    await SportsBetting.deleteMany({ betId: sportsbets[i]._id });
  }
  return res.json({ status: true });
};

export const removeSports = async (req: Request, res: Response) => {
  const userId = ObjectId(req.body.userId);
  const sportsbets = await SportsBets.find({ userId });
  for (const i in sportsbets) {
    await SportsBets.deleteOne({ _id: sportsbets[i]._id });
    await SportsBetting.deleteMany({ betId: sportsbets[i]._id });
  }
  return res.json({ status: true });
};

export const getCProfit = async (req: Request, res: Response) => {
  const { date, type } = req.body;
  const createdAt = {
    $gte: new Date(date[0]),
    $lte: new Date(date[1]),
  };

  const tbl: any = { casino: CasinoBetHistory, poker: PokerBetHistory, exchange: SportsBetsV2 };

  let _result = [];
  switch (type) {
    case 'sports':
      _result = await SportsBets.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$_id" },
              month: { $month: "$_id" },
              day: { $dayOfMonth: "$_id" },
            },
            profit: {
              $sum: {
                $cond: {
                  if: { $lte: ["$profit", 0] },
                  then: {
                    $sum: {
                      $multiply: ["$profit", "$price", -1],
                    },
                  },
                  else: {
                    $sum: {
                      $subtract: [
                        { $multiply: ["$stake", "$price"] },
                        { $multiply: ["$profit", "$price"] },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            profit: 1,
            name: {
              $concat: [
                { $convert: { input: "$_id.year", to: "string" } },
                "-",
                { $convert: { input: "$_id.month", to: "string" } },
                "-",
                { $convert: { input: "$_id.day", to: "string" } },
              ],
            },
          },
        },
      ])
      break;

    case 'original':
      _result = await Games.aggregate([
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
          $group: {
            _id: {
              year: { $year: "$_id" },
              month: { $month: "$_id" },
              day: { $dayOfMonth: "$_id" },
            },
            profit: {
              $sum: {
                $cond: {
                  if: { $eq: ["$status", 'LOST'] },
                  then: {
                    $sum: {
                      $multiply: ["$amount", "$currency.price"],
                    },
                  },
                  else: {
                    $sum: {
                      $subtract: [
                        { $multiply: ["$amount", "$currency.price"] },
                        { $multiply: ["$profit", "$currency.price"] },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            profit: 1,
            name: {
              $concat: [
                { $convert: { input: "$_id.year", to: "string" } },
                "-",
                { $convert: { input: "$_id.month", to: "string" } },
                "-",
                { $convert: { input: "$_id.day", to: "string" } },
              ],
            },
          },
        },
      ])
      break;

    default:
      _result = await tbl[type]?.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$_id" },
              month: { $month: "$_id" },
              day: { $dayOfMonth: "$_id" },
            },
            profit: {
              $sum: {
                $cond: {
                  if: { $eq: ["$TYPE", "BET"] },
                  then: {
                    $sum: "$AMOUNT",
                  },
                  else: {
                    $sum: { $multiply: [-1, "$AMOUNT"] },
                  },
                },
              }
            },
          },
        },
        {
          $project: {
            _id: 0,
            profit: 1,
            name: {
              $concat: [
                { $convert: { input: "$_id.year", to: "string" } },
                "-",
                { $convert: { input: "$_id.month", to: "string" } },
                "-",
                { $convert: { input: "$_id.day", to: "string" } },
              ],
            },
          },
        },
      ]);
      break;
  }
  const dates = getDates(createdAt.$gte, createdAt.$lte);
  const result = [] as any;
  for (const key in dates) {
    const date = moment(dates[key]).format("YYYY-M-D");
    const profit = _result?.find((e: any) => e.name === date)?.profit;
    if (profit) {
      result.push({ profit, date });
    }
  }
  return res.json(result);
}

// all sportsbetting volume, win, lost
export const getAllSportsProfit = async (req: Request, res: Response) => {
  const result = await SportsBets.aggregate([
    {
      $group: {
        _id: null,
        volume: {
          $sum: {
            $multiply: ["$stake", "$price"],
          },
        },
        win: {
          $sum: {
            $cond: {
              if: { $gte: ["$profit", 0] },
              then: {
                $sum: {
                  $multiply: ["$profit", "$price"],
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        profit: {
          $sum: {
            $cond: {
              if: { $lte: ["$profit", 0] },
              then: {
                $sum: {
                  $multiply: ["$stake", "$price"],
                },
              },
              else: {
                $sum: {
                  $subtract: [
                    { $multiply: ["$stake", "$price"] },
                    { $multiply: ["$profit", "$price"] },
                  ],
                },
              },
            },
          },
        },
      },
    },
  ]);
  return res.json(result);
};

// all casino volume, win, lost
export const getAllCasinosProfit = async (req: Request, res: Response) => {
  const createdAt = {
    $gte: new Date(req.body.date[0]),
  };
  const result = await CasinoBetHistory.aggregate([
    {
      $match: {
        createdAt,
      },
    },
    {
      $group: {
        _id: null,
        win: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "WIN"] },
              then: {
                $sum: "$AMOUNT",
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        profit: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: {
                $sum: "$AMOUNT",
              },
              else: {
                $sum: {
                  $multiply: ["$AMOUNT", -1],
                },
              },
            },
          },
        },
        volume: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: {
                $sum: "$AMOUNT",
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
      },
    },
  ]);

  return res.json(result);
};

// all v2 sports betting volume, win, lost
export const getAllV2SportsProfit = async (req: Request, res: Response) => {
  const result = await SportsBetsV2.aggregate([
    {
      $group: {
        _id: null,
        win: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "WIN"] },
              then: {
                $sum: "$AMOUNT",
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        profit: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: {
                $sum: "$AMOUNT",
              },
              else: {
                $sum: {
                  $multiply: ["$AMOUNT", -1],
                },
              },
            },
          },
        },
        volume: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: {
                $sum: "$AMOUNT",
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
      },
    },
  ]);

  return res.json(result);
};

// user dashboard v1 sports chart
export const getSportsProfit = async (req: Request, res: Response) => {
  const createdAt = {
    $gte: new Date(req.body.date[0]),
    $lte: new Date(req.body.date[1]),
  };

  const usdtTokens = [
    ObjectId("61d45a9c72e5042aaffea2af"),
    ObjectId("63eebe6934ab300b8c66a408"),
    ObjectId("63ef9b6f267b54cee00c8c10"),
    ObjectId("642e5e7e702f7211263da4da"),
    ObjectId("642e5f01702f7211263dac21"),
  ];

  const ethTokens = [
    ObjectId("61d45c629156b1347cc035a4"),
    ObjectId("642e5cf8e089b6ab5932ce72"),
    ObjectId("63eec12134ab300b8c66a95c"),
    ObjectId("63ef9a08267b54cee00c888c"),
  ];

  const result = await SportsBets.aggregate([
    {
      $match: { createdAt },
    },
    {
      $group: {
        _id: {
          year: { $year: "$_id" },
          month: { $month: "$_id" },
          day: { $dayOfMonth: "$_id" },
        },
        profit: {
          $sum: {
            $cond: {
              if: { $lte: ["$profit", 0] },
              then: {
                $sum: {
                  $multiply: ["$profit", "$price", -1],
                },
              },
              else: {
                $sum: {
                  $subtract: [
                    { $multiply: ["$profit", "$price", -1] },
                    { $multiply: ["$stake", "$price", -1] },
                  ],
                },
              },
            },
          },
        },
        volume: {
          $sum: {
            $multiply: ["$stake", "$price"],
          },
        },
        usdtProfit: {
          $sum: {
            $cond: {
              if: { $in: ["$currency", usdtTokens] },
              then: {
                $cond: {
                  if: { $lte: ["$profit", 0] },
                  then: {
                    $sum: { $multiply: ["$profit", -1] },
                  },
                  else: {
                    $sum: {
                      $subtract: [
                        { $multiply: ["$profit", -1] },
                        { $multiply: ["$stake", -1] },
                      ],
                    },
                  },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        usdtVolume: {
          $sum: {
            $cond: {
              if: { $in: ["$currency", usdtTokens] },
              then: {
                $sum: "$stake",
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        bcbProfit: {
          $sum: {
            $cond: {
              if: { $eq: ["$currency", ObjectId("63a54429697c3d576763bd25")] },
              then: {
                $cond: {
                  if: { $lte: ["$profit", 0] },
                  then: {
                    $sum: { $multiply: ["$profit", -1] },
                  },
                  else: {
                    $sum: {
                      $subtract: [
                        { $multiply: ["$profit", -1] },
                        { $multiply: ["$stake", -1] },
                      ],
                    },
                  },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        bcbVolume: {
          $sum: {
            $cond: {
              if: { $eq: ["$currency", ObjectId("63a54429697c3d576763bd25")] },
              then: {
                $sum: "$stake",
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        ethProfit: {
          $sum: {
            $cond: {
              if: { $in: ["$currency", ethTokens] },
              then: {
                $cond: {
                  if: { $lte: ["$profit", 0] },
                  then: {
                    $sum: { $multiply: ["$profit", -1] },
                  },
                  else: {
                    $sum: {
                      $subtract: [
                        { $multiply: ["$profit", -1] },
                        { $multiply: ["$stake", -1] },
                      ],
                    },
                  },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        ethVolume: {
          $sum: {
            $cond: {
              if: { $in: ["$currency", ethTokens] },
              then: {
                $sum: "$stake",
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        bets: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        bets: 1,
        volume: 1,
        profit: 1,
        usdtProfit: 1,
        usdtVolume: 1,
        ethProfit: 1,
        ethVolume: 1,
        bcbProfit: 1,
        bcbVolume: 1,
        date: {
          $concat: [
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.month" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.month" }] },
                else: { $toString: "$_id.month" },
              },
            },
            "-",
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.day" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.day" }] },
                else: { $toString: "$_id.day" },
              },
            },
          ],
        },
        fulldate: {
          $concat: [
            { $toString: "$_id.year" },
            "-"
            ,
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.month" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.month" }] },
                else: { $toString: "$_id.month" },
              },
            },
            "-",
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.day" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.day" }] },
                else: { $toString: "$_id.day" },
              },
            },

          ],
        },
      },
    },
    {
      $sort: {
        fulldate: 1,
      },
    },
  ]);

  return res.json(result);
};

// user dashboard v2 sports chart
export const getV2SportsProfit = async (req: Request, res: Response) => {
  const createdAt = {
    $gte: new Date(req.body.date[0]),
    $lte: new Date(req.body.date[1]),
  };

  const usdtTokens = ["USDT", "USDT.a", "USDT.b", "USDT.v", "USDT.p"];
  const ethTokens = ["ETH", "ETH.a", "ETH.b", "WETH"];

  const result = await SportsBetsV2.aggregate([
    {
      $match: { createdAt },
    },
    {
      $group: {
        _id: {
          year: { $year: "$_id" },
          month: { $month: "$_id" },
          day: { $dayOfMonth: "$_id" },
        },
        profit: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: {
                $sum: "$AMOUNT",
              },
              else: {
                $sum: {
                  $multiply: ["$AMOUNT", -1],
                },
              },
            },
          },
        },
        volume: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: {
                $sum: "$AMOUNT",
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        usdtProfit: {
          $sum: {
            $cond: {
              if: { $in: ["$betting.origin_currency", usdtTokens] },
              then: {
                $cond: {
                  if: { $eq: ["$TYPE", "BET"] },
                  then: {
                    $sum: "$betting.origin_bet_amount",
                  },
                  else: {
                    $sum: { $multiply: ["$betting.origin_bet_amount", -1] },
                  },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        usdtVolume: {
          $sum: {
            $cond: {
              if: { $in: ["$betting.origin_currency", usdtTokens] },
              then: {
                $cond: {
                  if: { $eq: ["$TYPE", "BET"] },
                  then: {
                    $sum: "$betting.origin_bet_amount",
                  },
                  else: { $sum: 0 },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        ethProfit: {
          $sum: {
            $cond: {
              if: { $in: ["$betting.origin_currency", ethTokens] },
              then: {
                $cond: {
                  if: { $eq: ["$TYPE", "BET"] },
                  then: {
                    $sum: "$betting.origin_bet_amount",
                  },
                  else: {
                    $sum: { $multiply: ["$betting.origin_bet_amount", -1] },
                  },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        ethVolume: {
          $sum: {
            $cond: {
              if: { $in: ["$betting.origin_currency", ethTokens] },
              then: {
                $cond: {
                  if: { $eq: ["$TYPE", "BET"] },
                  then: {
                    $sum: "$betting.origin_bet_amount",
                  },
                  else: { $sum: 0 },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        bcbProfit: {
          $sum: {
            $cond: {
              if: { $eq: ["$betting.origin_currency", "BCB"] },
              then: {
                $cond: {
                  if: { $eq: ["$TYPE", "BET"] },
                  then: {
                    $sum: "$betting.origin_bet_amount",
                  },
                  else: {
                    $sum: { $multiply: ["$betting.origin_bet_amount", -1] },
                  },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        bcbVolume: {
          $sum: {
            $cond: {
              if: { $eq: ["$betting.origin_currency", "BCB"] },
              then: {
                $cond: {
                  if: { $eq: ["$TYPE", "BET"] },
                  then: {
                    $sum: "$betting.origin_bet_amount",
                  },
                  else: { $sum: 0 },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        bets: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: {
                $sum: 1,
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        bets: 1,
        volume: 1,
        profit: 1,
        usdtProfit: 1,
        usdtVolume: 1,
        ethProfit: 1,
        ethVolume: 1,
        bcbProfit: 1,
        bcbVolume: 1,
        date: {
          $concat: [
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.month" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.month" }] },
                else: { $toString: "$_id.month" },
              },
            },
            "-",
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.day" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.day" }] },
                else: { $toString: "$_id.day" },
              },
            },
          ],
        },
        fulldate: {
          $concat: [
            { $toString: "$_id.year" },
            "-"
            ,
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.month" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.month" }] },
                else: { $toString: "$_id.month" },
              },
            },
            "-",
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.day" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.day" }] },
                else: { $toString: "$_id.day" },
              },
            },

          ],
        },
      },
    },
    {
      $sort: {
        fulldate: 1,
      },
    },
  ]);

  return res.json(result);
};

//user dashboard casino chart
export const getCasinosProfit = async (req: Request, res: Response) => {
  const createdAt = {
    $gte: new Date(req.body.date[0]),
    $lte: new Date(req.body.date[1]),
  };

  const usdtTokens = ["USDT", "USDT.a", "USDT.b", "USDT.v", "USDT.p"];
  const ethTokens = ["ETH", "ETH.a", "ETH.b", "WETH"];

  const result = await CasinoBetHistory.aggregate([
    {
      $match: { createdAt },
    },
    {
      $group: {
        _id: {
          year: { $year: "$_id" },
          month: { $month: "$_id" },
          day: { $dayOfMonth: "$_id" },
        },
        profit: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: {
                $sum: "$AMOUNT",
              },
              else: {
                $sum: {
                  $multiply: ["$AMOUNT", -1],
                },
              },
            },
          },
        },
        volume: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: {
                $sum: "$AMOUNT",
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        usdtProfit: {
          $sum: {
            $cond: {
              if: { $in: ["$betting.origin_currency", usdtTokens] },
              then: {
                $cond: {
                  if: { $eq: ["$TYPE", "BET"] },
                  then: {
                    $sum: "$betting.origin_bet_amount",
                  },
                  else: {
                    $sum: { $multiply: ["$betting.origin_bet_amount", -1] },
                  },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        usdtVolume: {
          $sum: {
            $cond: {
              if: { $in: ["$betting.origin_currency", usdtTokens] },
              then: {
                $cond: {
                  if: { $eq: ["$TYPE", "BET"] },
                  then: {
                    $sum: "$betting.origin_bet_amount",
                  },
                  else: { $sum: 0 },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        ethProfit: {
          $sum: {
            $cond: {
              if: { $in: ["$betting.origin_currency", ethTokens] },
              then: {
                $cond: {
                  if: { $eq: ["$TYPE", "BET"] },
                  then: {
                    $sum: "$betting.origin_bet_amount",
                  },
                  else: {
                    $sum: { $multiply: ["$betting.origin_bet_amount", -1] },
                  },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        ethVolume: {
          $sum: {
            $cond: {
              if: { $in: ["$betting.origin_currency", ethTokens] },
              then: {
                $cond: {
                  if: { $eq: ["$TYPE", "BET"] },
                  then: {
                    $sum: "$betting.origin_bet_amount",
                  },
                  else: { $sum: 0 },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        bets: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: {
                $sum: 1,
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        bets: 1,
        volume: 1,
        profit: 1,
        usdtProfit: 1,
        usdtVolume: 1,
        ethProfit: 1,
        ethVolume: 1,
        bcbProfit: 1,
        bcbVolume: 1,
        date: {
          $concat: [
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.month" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.month" }] },
                else: { $toString: "$_id.month" },
              },
            },
            "-",
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.day" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.day" }] },
                else: { $toString: "$_id.day" },
              },
            },
          ],
        },
        fulldate: {
          $concat: [
            { $toString: "$_id.year" },
            "-"
            ,
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.month" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.month" }] },
                else: { $toString: "$_id.month" },
              },
            },
            "-",
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.day" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.day" }] },
                else: { $toString: "$_id.day" },
              },
            },

          ],
        },
      },
    },
    {
      $sort: {
        fulldate: 1,
      },
    },
  ]);

  return res.json(result);
};

// user dashboard original chart
export const getOriginalProfit = async (req: Request, res: Response) => {
  const createdAt = {
    $gte: new Date(req.body.date[0]),
    $lte: new Date(req.body.date[1]),
  };

  const usdtTokens = [
    ObjectId("61d45a9c72e5042aaffea2af"),
    ObjectId("63eebe6934ab300b8c66a408"),
    ObjectId("63ef9b6f267b54cee00c8c10"),
    ObjectId("642e5e7e702f7211263da4da"),
    ObjectId("642e5f01702f7211263dac21"),
  ];

  const ethTokens = [
    ObjectId("61d45c629156b1347cc035a4"),
    ObjectId("642e5cf8e089b6ab5932ce72"),
    ObjectId("63eec12134ab300b8c66a95c"),
    ObjectId("63ef9a08267b54cee00c888c"),
  ];

  const result = await Games.aggregate([
    {
      $match: { createdAt },
    },
    {
      $group: {
        _id: {
          year: { $year: "$_id" },
          month: { $month: "$_id" },
          day: { $dayOfMonth: "$_id" },
        },
        profit: {
          $sum: {
            $subtract: [
              { $multiply: ["$amount", "$price"] },
              { $multiply: ["$profit", "$price"] },
            ]
          },
        },
        volume: {
          $sum: {
            $multiply: ["$amount", "$price"],
          },
        },
        usdtProfit: {
          $sum: {
            $cond: {
              if: { $in: ["$currency", usdtTokens] },
              then: {
                $sum: {
                  $subtract: ["$amount", "$profit"],
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        usdtVolume: {
          $sum: {
            $cond: {
              if: { $in: ["$currency", usdtTokens] },
              then: {
                $sum: "$amount",
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        bcbProfit: {
          $sum: {
            $cond: {
              if: { $eq: ["$currency", ObjectId("63a54429697c3d576763bd25")] },
              then: {
                $sum: {
                  $subtract: ["$amount", "$profit"],
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        bcbVolume: {
          $sum: {
            $cond: {
              if: { $eq: ["$currency", ObjectId("63a54429697c3d576763bd25")] },
              then: {
                $sum: "$amount",
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        ethProfit: {
          $sum: {
            $cond: {
              if: { $in: ["$currency", ethTokens] },
              then: {
                $sum: {
                  $subtract: ["$amount", "$profit"],
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        ethVolume: {
          $sum: {
            $cond: {
              if: { $in: ["$currency", ethTokens] },
              then: {
                $sum: "$amount",
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        bets: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        bets: 1,
        volume: 1,
        profit: 1,
        usdtProfit: 1,
        usdtVolume: 1,
        ethProfit: 1,
        ethVolume: 1,
        bcbProfit: 1,
        bcbVolume: 1,
        date: {
          $concat: [
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.month" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.month" }] },
                else: { $toString: "$_id.month" },
              },
            },
            "-",
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.day" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.day" }] },
                else: { $toString: "$_id.day" },
              },
            },
          ],
        },
        fulldate: {
          $concat: [
            { $toString: "$_id.year" },
            "-"
            ,
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.month" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.month" }] },
                else: { $toString: "$_id.month" },
              },
            },
            "-",
            {
              $cond: {
                if: { $lte: [{ $strLenCP: { $toString: "$_id.day" } }, 1] },
                then: { $concat: ["0", { $toString: "$_id.day" }] },
                else: { $toString: "$_id.day" },
              },
            },

          ],
        },
      },
    },
    {
      $sort: {
        fulldate: 1,
      },
    },
  ]);

  return res.json(result);
};

export const getUserSportsProfit = async (req: Request, res: Response) => {
  const createdAt = {
    $gte: new Date(req.body.date[0]),
    $lte: new Date(req.body.date[1]),
  };

  const userId = req.body.userId;

  const result = await SportsBets.aggregate([
    {
      $match: {
        userId: ObjectId(userId),
        createdAt,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
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
      $group: {
        _id: {
          user: "$user",
        },
        profit: {
          $sum: {
            $cond: {
              if: { $lte: ["$profit", 0] },
              then: {
                $sum: {
                  $multiply: ["$profit", "$price"],
                },
              },
              else: {
                $sum: {
                  $subtract: [
                    { $multiply: ["$profit", "$price"] },
                    { $multiply: ["$stake", "$price"] },
                  ],
                },
              },
            },
          },
        },
        volume: {
          $sum: {
            $multiply: ["$stake", "$price"],
          },
        },
        bets: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0,
        profit: 1,
        volume: 1,
        bets: 1,
      },
    },
  ]);

  return res.json(result);
};

export const getUserCasinosProfit = async (req: Request, res: Response) => {
  const createdAt = {
    $gte: new Date(req.body.date[0]),
    $lte: new Date(req.body.date[1]),
  };

  const userId = req.body.userId;

  const result = await CasinoBetHistory.aggregate([
    {
      $match: { createdAt, USERID: ObjectId(userId) },
    },
    {
      $group: {
        _id: {
          userId: "$USERID",
        },
        profit: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: {
                $sum: {
                  $multiply: ["$AMOUNT", -1],
                },
              },
              else: {
                $sum: "$AMOUNT",
              },
            },
          },
        },
        volume: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: {
                $sum: "$AMOUNT",
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
        bets: {
          $sum: {
            $cond: {
              if: { $eq: ["$TYPE", "BET"] },
              then: {
                $sum: 1,
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        bets: 1,
        volume: 1,
        profit: 1,
      },
    },
  ]);

  return res.json(result);
};

export const getAllSportsProfitByCurrency = async (
  req: Request,
  res: Response
) => {
  let createdAt: any = {
    $gte: new Date(req.body.date[0]),
    $lte: new Date(req.body.date[1]),
  };

  const currency = req.body.currency;
  const setting = await DashboardSettings.findOne({ type: currency });
  let overAmount = 0;
  if (setting) {
    overAmount = setting.amount;
    if (setting.time) {
      createdAt = {
        $gte: new Date(setting.time),
      };
    }
  }

  const usdtTokens = [
    ObjectId("61d45a9c72e5042aaffea2af"),
    ObjectId("63eebe6934ab300b8c66a408"),
    ObjectId("63ef9b6f267b54cee00c8c10"),
    ObjectId("642e5e7e702f7211263da4da"),
    ObjectId("642e5f01702f7211263dac21"),
  ];

  const ethTokens = [
    ObjectId("61d45c629156b1347cc035a4"),
    ObjectId("642e5cf8e089b6ab5932ce72"),
    ObjectId("63eec12134ab300b8c66a95c"),
    ObjectId("63ef9a08267b54cee00c888c"),
  ];

  const bcbToken = [ObjectId("63a54429697c3d576763bd25")];

  const tokens =
    currency === "USDT"
      ? usdtTokens
      : currency === "BCB"
        ? bcbToken
        : ethTokens;

  const result = await SportsBets.aggregate([
    {
      $match: { createdAt },
    },
    {
      $group: {
        _id: null,
        profit: {
          $sum: {
            $cond: {
              if: { $in: ["$currency", tokens] },
              then: {
                $cond: {
                  if: { $lte: ["$profit", 0] },
                  then: {
                    $sum: { $multiply: ["$profit", -1] },
                  },
                  else: {
                    $sum: {
                      $subtract: [
                        { $multiply: ["$profit", -1] },
                        { $multiply: ["$stake", -1] },
                      ],
                    },
                  },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ]);

  console.log(result, "result--->")

  return res.json({ result, overAmount });
};

export const getAllV2SportsProfitByCurrency = async (
  req: Request,
  res: Response
) => {
  let createdAt: any = {
    $gte: new Date(req.body.date[0]),
    $lte: new Date(req.body.date[1]),
  };
  const currency = req.body.currency;
  const setting = await DashboardSettings.findOne({ type: currency });
  if (setting && setting.time) {
    createdAt = {
      $gte: new Date(setting.time),
    };
  }

  const usdtTokens = ["USDT", "USDT.a", "USDT.b", "USDT.v", "USDT.p"];
  const ethTokens = ["ETH", "ETH.a", "ETH.b"];
  const bcbToken = ["BCB"];
  const tokens =
    currency === "USDT"
      ? usdtTokens
      : currency === "BCB"
        ? bcbToken
        : ethTokens;

  const result = await SportsBetsV2.aggregate([
    {
      $match: { createdAt },
    },
    {
      $group: {
        _id: null,
        profit: {
          $sum: {
            $cond: {
              if: { $in: ["$betting.origin_currency", tokens] },
              then: {
                $cond: {
                  if: { $eq: ["$TYPE", "BET"] },
                  then: {
                    $sum: "$betting.origin_bet_amount",
                  },
                  else: {
                    $sum: { $multiply: ["$betting.origin_bet_amount", -1] },
                  },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ]);

  return res.json(result);
};

export const getAllCasinoProfitByCurrency = async (
  req: Request,
  res: Response
) => {
  let createdAt: any = {
    $gte: new Date(req.body.date[0]),
    $lte: new Date(req.body.date[1]),
  };

  const currency = req.body.currency;
  const setting = await DashboardSettings.findOne({ type: currency });
  if (setting && setting.time) {
    createdAt = {
      $gte: new Date(setting.time),
    };
  }
  const usdtTokens = ["USDT", "USDT.a", "USDT.b", "USDT.v", "USDT.p"];
  const ethTokens = ["ETH", "ETH.a", "ETH.b"];
  const bcbToken = ["BCB"];
  const tokens =
    currency === "USDT"
      ? usdtTokens
      : currency === "BCB"
        ? bcbToken
        : ethTokens;

  const result = await CasinoBetHistory.aggregate([
    {
      $match: { createdAt },
    },
    {
      $group: {
        _id: null,
        profit: {
          $sum: {
            $cond: {
              if: { $in: ["$betting.origin_currency", tokens] },
              then: {
                $cond: {
                  if: { $eq: ["$TYPE", "BET"] },
                  then: {
                    $sum: "$betting.origin_bet_amount",
                  },
                  else: {
                    $sum: { $multiply: ["$betting.origin_bet_amount", -1] },
                  },
                },
              },
              else: {
                $sum: 0,
              },
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ]);

  return res.json(result);
};

export const getAllUsersBalance = async (req: Request, res: Response) => {
  // const data = await Balances.aggregate([
  //     {
  //         $match: {
  //             balance: {
  //                 $gte: 0.0000001
  //             },
  //             currency: ObjectId('61d45a9c72e5042aaffea2af')
  //         }
  //     }, {
  //         $project: {
  //             balance: 1,
  //             userId: 1
  //         }
  //     }, {
  //         $sort: {
  //             balance: -1
  //         }
  //     }
  // ])
  const data = await Balances.aggregate([
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
      $group: {
        _id: {
          currency: "$currency",
        },
        amount: { $sum: "$balance" },
      },
    },
    {
      $project: {
        amount: 1,
        _id: 0,
        currency: "$_id.currency.symbol",
      },
    },
  ]);
  return res.json(data);
};
