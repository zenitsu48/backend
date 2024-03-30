
import 'dotenv/config';
import 'regenerator-runtime';
import * as request from 'request';
import md5 = require("md5")
import { Balances, CasinoBetHistory, CasinoCategories, CasinoGameLists, CasinoProviders, Currencies, PokerBetHistory, SportsBetsV2, Users } from '../../models';
import { Request, Response } from 'express';
import { CronJob } from 'cron';
import { balanceUpdate, getIPAddress, softGamHmac } from '../base';
import moment = require('moment-timezone');

const RtFixed = (num: any) => {
    const changeNum = num
    const re = new RegExp('^-?\\d+(?:\.\\d{0,' + (2 || -1) + '})?')
    const ree = changeNum.toString().match(re)[0]
    const reee = Number(ree).toFixed(2)
    return reee
}

export const PlayerPing = async (req: Request, res: Response) => {
    return res.json({ status: "OK", hmac: await softGamHmac("OK") })
}

export const PlayerGetBalance = async (req: Request, res: Response) => {
    let { userid, currency } = req.body
    // userid = userid.split("_")[1]
    if (userid.split("_")[1]) {
        userid = userid.split("_")[1]
    }
    if (!userid || !currency) {
        return res.json({ error: "parameter mismatch", hmac: await softGamHmac("parameter mismatch") })
    }

    if (currency != 'USD') {
        return res.json({ error: "parameter mismatch", hmac: await softGamHmac("parameter mismatch") })
    }

    const rdata = await Users.findOne({ _id: userid })
    if (rdata) {
        try {
            const bdata = await Balances.findOne({ userId: userid, status: true })
            const cdata = await Currencies.findOne({ _id: bdata.currency });
            if (bdata?.balance || bdata?.balance == 0) {
                const userBalance = Number(bdata.balance * cdata.price).toFixed(2);
                return res.json({
                    status: "OK",
                    balance: userBalance,
                    hmac: await softGamHmac(`${userBalance}OK`)
                })
            } else {
                console.log("issue balance")
                return res.json({
                    error: "Invalid balance",
                    hmac: await softGamHmac("Invalid balance")
                })
            }
        } catch (e) {
            return res.json({
                error: "Invalid balance",
                hmac: await softGamHmac("Invalid balance")
            })
        }

    } else {
        return res.json({
            error: "Invalid userid",
            hmac: await softGamHmac("Invalid userid")
        })
    }
}

export const PlayerDebit = async (req: Request, res: Response) => {
    try {

        let { userid, tid, amount, i_gameid, i_gamedesc, i_actionid, currency } = req.body

        if (userid.split("_")[1]) {
            userid = userid.split("_")[1]
        }

        if (!userid || !tid || !amount || !i_gameid || !i_gamedesc || !i_actionid || !currency) {
            return res.json({
                error: "parameter mismatch",
                hmac: await softGamHmac("parameter mismatch")
            })
        }

        const player = await Users.findOne({ _id: userid })
        const transactionId = new Date().valueOf()

        if (!player) {
            return res.json({
                error: "Invalid userid",
                hmac: await softGamHmac("Invalid userid")
            })
        }

        const bdata = await Balances.findOne({ userId: userid, status: true })
        const cdata = await Currencies.findOne({ _id: bdata.currency });

        const realAmount = Number(Number(amount / cdata.price).toFixed(6));
        const lastBalance = Number(Number(bdata.balance * cdata.price).toFixed(6));

        if (bdata.balance <= 0) {
            return res.json({
                error: "NEGATIVE_BALANCE",
                hmac: await softGamHmac("NEGATIVE_BALANCE")
            })
        }

        if (realAmount > bdata.balance) {
            return res.json({
                error: "INSUFFICIENT_FUNDS",
                hmac: await softGamHmac("INSUFFICIENT_FUNDS")
            })
        }

        const GAMEID = i_gamedesc.split(":")[0];

        let tidVerify;
        switch (GAMEID) {
            case '972':
                tidVerify = await SportsBetsV2.findOne({ "betting.tid": tid })
                break;
            case '965':
                tidVerify = await PokerBetHistory.findOne({ "betting.tid": tid })
                break;
            default:
                tidVerify = await CasinoBetHistory.findOne({ "betting.tid": tid })
                break;
        }

        if (tidVerify) {
            if (tidVerify.AMOUNT == amount && tidVerify.TYPE == "BET" && tidVerify.USERID == userid && currency == 'USD') {
                return res.json({
                    status: "OK",
                    tid,
                    balance: RtFixed(lastBalance),
                    hmac: await softGamHmac(`${RtFixed(lastBalance)}OK${tid}`)
                })
            } else {
                return res.json({
                    error: `Transaction Failed`,
                    balance: RtFixed(lastBalance),
                    hmac: await softGamHmac(`${RtFixed(lastBalance)}Transaction Failed`)
                })
            }
        }

        let gaVerify;
        switch (GAMEID) {
            case '972':
                gaVerify = await SportsBetsV2.findOne({ "betting.i_gameid": i_gameid, "betting.i_actionid": i_actionid })
                break;
            case '965':
                gaVerify = await PokerBetHistory.findOne({ "betting.i_gameid": i_gameid, "betting.i_actionid": i_actionid })
                break;
            default:
                gaVerify = await CasinoBetHistory.findOne({ "betting.i_gameid": i_gameid, "betting.i_actionid": i_actionid })
                break;
        }

        if (gaVerify) {
            return res.json({
                error: `Transaction Failed`,
                balance: RtFixed(lastBalance),
                hmac: await softGamHmac(`${RtFixed(lastBalance)}Transaction Failed`)
            })
        }

        const bhistory = {
            req: req,
            balanceId: bdata._id,
            amount: -realAmount,
            type: GAMEID === '972' ? 'v2-sports-bet' : (GAMEID === '965' ? 'poker-bet' : 'casino-bet')
        }

        const afterBal = await balanceUpdate(bhistory);

        const afterBalance = afterBal.balance

        const updateBalance = Number(Number(afterBalance * cdata.price).toFixed(6));

        const sdata = {
            GAMEID,
            USERID: player._id,
            LAUNCHURL: 1,
            AMOUNT: amount,
            TYPE: "BET",
            currency: currency,
            transactionId,
            currencyId: cdata._id,
            lastbalance: lastBalance,
            updatedbalance: updateBalance,
            betting: {
                tid, amount, i_gameid, i_actionid,
                origin_currency: cdata.symbol,
                origin_bet_amount: Math.abs(realAmount)
            }
        }

        switch (GAMEID) {
            case '972':
                new SportsBetsV2(sdata).save()
                break;
            case '965':
                new PokerBetHistory(sdata).save()
                break;
            default:
                new CasinoBetHistory(sdata).save()
                break;
        }

        return res.json({
            status: "OK",
            tid,
            balance: RtFixed(updateBalance),
            hmac: await softGamHmac(`${RtFixed(updateBalance)}OK${tid}`)
        })
    } catch (e) {
        console.log(e, 'debit error')
        return res.json({
            error: "parameter mismatch",
            hmac: await softGamHmac("parameter mismatch")
        })
    }
}

export const PlayerCredit = async (req: Request, res: Response) => {
    try {
        let { userid, tid, amount, i_gameid, i_gamedesc, i_actionid, currency } = req.body

        if (userid.split("_")[1]) {
            userid = userid.split("_")[1]
        }
        if (!userid || !tid || !amount || !i_gameid || !i_gamedesc || !i_actionid || !currency) {
            return res.json({
                error: "parameter mismatch",
                hmac: await softGamHmac("parameter mismatch")
            })
        }
        const player = await Users.findOne({ _id: userid })

        if (!player) {
            return res.json({
                error: "Invalid userid",
                hmac: await softGamHmac("Invalid userid")
            })
        }

        if (amount <= 0) {
            return res.json({
                error: "Invalid parameters",
                hmac: await softGamHmac("Invalid parameters")
            })
        }

        const GAMEID = i_gamedesc.split(":")[0];

        let tidVerify;
        switch (GAMEID) {
            case '972':
                tidVerify = await SportsBetsV2.findOne({ "betting.tid": tid })
                break;
            case '965':
                tidVerify = await PokerBetHistory.findOne({ "betting.tid": tid })
                break;
            default:
                tidVerify = await CasinoBetHistory.findOne({ "betting.tid": tid })
                break;
        }

        let bdata = await Balances.findOne({ userId: userid, status: true })
        let cdata = await Currencies.findOne({ _id: bdata.currency });

        let realAmount = Number(Number(amount / cdata.price).toFixed(6));
        let lastBalance = Number(Number(bdata.balance * cdata.price).toFixed(6));


        if (tidVerify) {
            if (tidVerify.AMOUNT == amount && tidVerify.TYPE == 'WIN' && tidVerify.USERID == userid && currency == 'USD') {
                return res.json({
                    status: "OK",
                    tid,
                    balance: RtFixed(lastBalance),
                    hmac: await softGamHmac(`${RtFixed(lastBalance)}OK${tid}`)
                })
            } else {
                return res.json({
                    error: `Transaction Failed`,
                    balance: RtFixed(lastBalance),
                    hmac: await softGamHmac(`${RtFixed(lastBalance)}Transaction Failed`)
                })
            }
        }

        let gaVerify;
        switch (GAMEID) {
            case '972':
                gaVerify = await SportsBetsV2.findOne({ "betting.i_gameid": i_gameid, "betting.i_actionid": i_actionid })
                break;
            case '965':
                gaVerify = await PokerBetHistory.findOne({ "betting.i_gameid": i_gameid, "betting.i_actionid": i_actionid })
                break;
            default:
                gaVerify = await CasinoBetHistory.findOne({ "betting.i_gameid": i_gameid, "betting.i_actionid": i_actionid })
                break;
        }

        if (gaVerify) {
            return res.json({
                error: `Transaction Failed`,
                balance: RtFixed(lastBalance),
                hmac: await softGamHmac(`${RtFixed(lastBalance)}Transaction Failed`)
            })
        }

        let gameVerify;
        switch (GAMEID) {
            case '972':
                gameVerify = await SportsBetsV2.findOne({ "betting.i_gameid": i_gameid })
                cdata = await Currencies.findOne({ symbol: gameVerify.betting.origin_currency })
                bdata = await Balances.findOne({ userId: userid, currency: cdata._id })
                break;
            case '965':
                gameVerify = await PokerBetHistory.findOne({ "betting.i_gameid": i_gameid })
                break;
            default:
                gameVerify = await CasinoBetHistory.findOne({ "betting.i_gameid": i_gameid })
                break;
        }

        realAmount = Number(Number(amount / cdata.price).toFixed(6));
        lastBalance = Number(Number(bdata.balance * cdata.price).toFixed(6));


        const bhistory = {
            req: req,
            balanceId: bdata._id,
            amount: realAmount,
            type: GAMEID === '972' ? 'v2-sports-bet-settled' : (GAMEID === '965' ? 'poker-bet-settled' : 'casino-bet-settled')
        }

        const afterBal = await balanceUpdate(bhistory);
        const afterBalance = afterBal.balance;

        const updateBalance = Number(Number(afterBalance * cdata.price).toFixed(6));
        const transactionId = new Date().valueOf()

        const sdata = {
            GAMEID,
            USERID: player._id,
            LAUNCHURL: 1,
            AMOUNT: amount,
            TYPE: 'WIN',
            currency: currency,
            currencyId: cdata._id,
            transactionId,
            lastbalance: lastBalance,
            updatedbalance: updateBalance,
            betting: {
                tid, amount, i_gameid, i_actionid,
                origin_currency: cdata.symbol,
                origin_bet_amount: Math.abs(realAmount)
            }
        }

        switch (GAMEID) {
            case '972':
                new SportsBetsV2(sdata).save()
                break;
            case '965':
                new PokerBetHistory(sdata).save()
                break;
            default:
                new CasinoBetHistory(sdata).save()
                break;
        }

        return res.json({
            status: "OK",
            tid,
            balance: RtFixed(updateBalance),
            hmac: await softGamHmac(`${RtFixed(updateBalance)}OK${tid}`)
        })
    } catch (e) {
        console.log(e, 'credit error')
        return res.json({
            error: "parameter mismatch",
            hmac: await softGamHmac("parameter mismatch")
        })
    }

}

export const PlayerDebitRollback = async (req: Request, res: Response) => {
    try {
        let { userid, tid, amount, i_gameid, i_gamedesc, i_actionid, i_rollback, currency } = req.body

        if (userid.split("_")[1]) {
            userid = userid.split("_")[1]
        }
        if (!userid || !tid || !amount || !i_gameid || !i_gamedesc || !i_actionid || !currency) {
            return res.json({
                error: "parameter mismatch",
                hmac: await softGamHmac("parameter mismatch")
            })
        }
        const player = await Users.findOne({ _id: userid })

        if (!player) {
            return res.json({
                error: "Invalid userid",
                hmac: await softGamHmac("Invalid userid")
            })
        }
        const bdata = await Balances.findOne({ userId: userid, status: true })
        const cdata = await Currencies.findOne({ _id: bdata.currency });

        const realAmount = Number(Number(amount / cdata.price).toFixed(6));
        const lastBalance = Number(Number(bdata.balance * cdata.price).toFixed(6));

        const GAMEID = i_gamedesc.split(":")[0];
        let tidVerify;

        switch (GAMEID) {
            case '972':
                tidVerify = await SportsBetsV2.findOne({ "betting.tid": tid })
                break;
            case '965':
                tidVerify = await PokerBetHistory.findOne({ "betting.tid": tid })
                break;
            default:
                tidVerify = await CasinoBetHistory.findOne({ "betting.tid": tid })
                break;
        }

        if (tidVerify) {
            return res.json({
                error: `Transaction Failed`,
                balance: RtFixed(lastBalance),
                hmac: await softGamHmac(`${RtFixed(lastBalance)}Transaction Failed`)
            })
        }

        if (i_rollback) {

            let lastVerify;
            switch (GAMEID) {
                case '972':
                    lastVerify = await SportsBetsV2.findOne({ "betting.tid": i_rollback })
                    break;
                case '965':
                    lastVerify = await PokerBetHistory.findOne({ "betting.tid": i_rollback })
                    break;
                default:
                    lastVerify = await CasinoBetHistory.findOne({ "betting.tid": i_rollback })
                    break;
            }
            if (!lastVerify) {
                return res.json({
                    error: `Transaction Failed`,
                    balance: RtFixed(lastBalance),
                    hmac: await softGamHmac(`${RtFixed(lastBalance)}Transaction Failed`)
                })
            }
        }

        const bhistory = {
            req: req,
            balanceId: bdata._id,
            amount: -realAmount,
            type: GAMEID === '972' ? 'v2-sports-bet' : (GAMEID === '965' ? 'poker-bet' : 'casino-bet')
        }

        const afterBal = await balanceUpdate(bhistory);

        const afterBalance = afterBal.balance;
        const updateBalance = Number(Number(afterBalance * cdata.price).toFixed(6));

        const sdata = {
            GAMEID,
            USERID: player._id,
            LAUNCHURL: 1,
            AMOUNT: amount,
            TYPE: 'BET',
            currency: currency,
            currencyId: cdata._id,
            transactionId: new Date().valueOf(),
            lastbalance: lastBalance,
            updatedbalance: updateBalance,
            betting: {
                tid, amount, i_gameid, i_actionid,
                origin_currency: cdata.symbol,
                origin_bet_amount: Math.abs(realAmount)
            }
        }

        switch (GAMEID) {
            case '972':
                new SportsBetsV2(sdata).save()
                break;
            case '965':
                new PokerBetHistory(sdata).save()
                break;
            default:
                new CasinoBetHistory(sdata).save()
                break;
        }

        return res.json({
            status: "OK",
            tid,
            balance: RtFixed(updateBalance),
            hmac: await softGamHmac(`${RtFixed(updateBalance)}OK${tid}`)
        })
    } catch (e) {
        console.log(e, 'credit error')
        return res.json({
            error: "parameter mismatch",
            hmac: await softGamHmac("parameter mismatch")
        })
    }
}

export const PlayerCreditRollback = async (req: Request, res: Response) => {
    try {
        let { userid, tid, amount, i_gameid, i_gamedesc, i_actionid, currency, i_rollback } = req.body
        if (userid.split("_")[1]) {
            userid = userid.split("_")[1]
        }
        if (!userid || !tid || !amount || !i_gameid || !i_gamedesc || !i_actionid || !currency) {
            return res.json({
                error: "parameter mismatch",
                hmac: await softGamHmac("parameter mismatch")
            })
        }
        const player = await Users.findOne({ _id: userid })

        if (!player) {
            return res.json({
                error: "Invalid userid",
                hmac: await softGamHmac("Invalid userid")
            })
        }

        const bdata = await Balances.findOne({ userId: userid, status: true })
        const cdata = await Currencies.findOne({ _id: bdata.currency });

        const realAmount = Number(Number(amount / cdata.price).toFixed(6));
        const lastBalance = Number(Number(bdata.balance * cdata.price).toFixed(6));

        const GAMEID = i_gamedesc.split(":")[0];

        let tidVerify;

        switch (GAMEID) {
            case '972':
                tidVerify = await SportsBetsV2.findOne({ "betting.tid": tid })
                break;
            case '965':
                tidVerify = await PokerBetHistory.findOne({ "betting.tid": tid })
                break;
            default:
                tidVerify = await CasinoBetHistory.findOne({ "betting.tid": tid })
                break;
        }

        if (tidVerify) {
            return res.json({
                error: `Transaction Failed`,
                balance: RtFixed(lastBalance),
                hmac: await softGamHmac(`${RtFixed(lastBalance)}Transaction Failed`)
            })
        }

        if (i_rollback) {
            let lastVerify;
            switch (GAMEID) {
                case '972':
                    lastVerify = await SportsBetsV2.findOne({ "betting.tid": i_rollback })
                    break;
                case '965':
                    lastVerify = await PokerBetHistory.findOne({ "betting.tid": i_rollback })
                    break;
                default:
                    lastVerify = await CasinoBetHistory.findOne({ "betting.tid": i_rollback })
                    break;
            }
            if (!lastVerify) {
                return res.json({
                    error: `Transaction Failed`,
                    balance: RtFixed(lastBalance),
                    hmac: await softGamHmac(`${RtFixed(lastBalance)}Transaction Failed`)
                })
            }
        }

        const bhistory = {
            req: req,
            balanceId: bdata._id,
            amount: realAmount,
            type: GAMEID === '972' ? 'v2-sports-bet-settled' : (GAMEID === '965' ? 'poker-bet-settled' : 'casino-bet-settled')
        }

        const afterBal = await balanceUpdate(bhistory);

        const afterBalance = afterBal.balance;
        const updateBalance = Number(Number(afterBalance * cdata.price).toFixed(6));

        const sdata = {
            GAMEID,
            USERID: player._id,
            LAUNCHURL: 1,
            AMOUNT: amount,
            TYPE: 'WIN',
            currency: currency,
            currencyId: cdata._id,
            transactionId: new Date().valueOf(),
            lastbalance: lastBalance,
            updatedbalance: updateBalance,
            betting: {
                tid, amount, i_gameid, i_actionid,
                origin_currency: cdata.symbol,
                origin_bet_amount: Math.abs(realAmount)
            },
        }

        switch (GAMEID) {
            case '972':
                new SportsBetsV2(sdata).save()
                break;
            case '965':
                new PokerBetHistory(sdata).save()
                break;
            default:
                new CasinoBetHistory(sdata).save()
                break;
        }

        return res.json({
            status: "OK",
            tid,
            balance: RtFixed(updateBalance),
            hmac: await softGamHmac(`${RtFixed(updateBalance)}OK${tid}`)
        })
    } catch (e) {
        console.log('credit rollback error')
        return res.json({
            error: "parameter mismatch",
            hmac: await softGamHmac("parameter mismatch")
        })
    }
}

export const PlayerRound = async (req: Request, res: Response) => {
    let { userid, gameid, actions, i_gamedesc } = req.body
    if (userid.split("_")[1]) {
        userid = userid.split("_")[1]
    }
    if (!userid || !gameid || !actions || !i_gamedesc) {
        return res.json({
            error: "parameter mismatch",
            hmac: await softGamHmac("parameter mismatch")
        })
    } else {
        return res.json({
            status: "OK",
            hmac: await softGamHmac(`OK`)
        })
    }
}

export const getCasinoGamesLists = async (req: Request, res: Response) => {
    const { id, pid, gname, page, pageSize, sort } = req.body;
    let query: any = { status: true }
    if (id) {
        query["detail.Categories"] = id;
    }
    if (pid && pid.length > 0) {
        query["detail.system"] = { $in: pid };
    }
    if (gname) {
        query["gameName"] = { $regex: new RegExp(gname, 'i') };
    }

    let result;
    const count = await CasinoGameLists.countDocuments(query);

    if (id === '4' || id === '35') {
        result = await CasinoGameLists.find(
            {
                "detail.system": '960',
                // $or: [
                //     { "detail.system": '960' },
                //     { "detail.Categories": id }
                // ],
                status: true
            }).sort({ "gameName": sort });
    } else {
        if (!page || !pageSize) {
            result = await CasinoGameLists.aggregate([
                {
                    $match: query,
                },
                {
                    $addFields: {
                        isSystem960: { $eq: ['$detail.system', '960'] },
                    },
                },
                {
                    $sort: {
                        isSystem960: -1,
                        gameName: sort
                    },
                },
            ]);

        } else {
            result = await CasinoGameLists.aggregate([
                {
                    $match: query,
                },
                {
                    $addFields: {
                        isSystem960: { $eq: ['$detail.system', '960'] },
                    },
                },
                {
                    $skip: (page - 1) * pageSize
                },
                {
                    $limit: pageSize
                },
                {
                    $sort: {
                        isSystem960: -1,
                        gameName: sort
                    },
                },
            ]);
        }
    }
    return res.json({ result, count });
}

export const getCasinoGamesListByCategory = async (req: Request, res: Response) => {
    const { id, gname, sort } = req.body;
    let result: any = {};
    for (let i = 0; i < id.length; i++) {
        if (id[i] === '4') {
            result[id[i]] = await CasinoGameLists.find(
                {
                    $and: [
                        { gameName: { $regex: '.*' + gname + '.*', $options: 'i' } },
                        {
                            "detail.system": '960'
                            // $or: [
                            //     { "detail.system": '960' },
                            //     { "detail.Categories": id[i] }
                            // ]
                        },
                        { status: true }
                    ]
                }).sort({ "gameName": sort });
        } else {
            result[id[i]] = await CasinoGameLists.find(
                {
                    $and: [
                        { gameName: { $regex: '.*' + gname + '.*', $options: 'i' } },
                        { "detail.Categories": id[i] },
                        { status: true }
                    ]
                }
            ).sort({ "gameName": sort })
        }
    }

    return res.json(result);
}

export const getCasinoProviders = async (req: Request, res: Response) => {
    let query = { Categories: req.body.id, Status: true }
    const result = await CasinoProviders.aggregate([
        {
            $match: query,
        },
        {
            $addFields: {
                isSystem960: { $eq: ['$System', '960'] },
            },
        },
        {
            $sort: {
                isSystem960: -1,
            },
        },
    ]);
    return res.json(result)
}

export const viewCasinoGame = async (req: Request, res: Response) => {
    const TID = new Date().valueOf();
    let { ip } = getIPAddress(req);
    if (ip == '127.0.0.1' || ip == '::1') {
        ip = '188.43.136.44';
    }
    const Password = "RFC23961";
    const { System, Page, Login, IsMobile, Currency } = req.body;
    if (Login === 'Demo') {
        try {
            let Hash = md5(`User/AuthHTML/${process.env.MY_IP}/${TID}/${process.env.CASINO_APIKEY}/DemoUser/RFC23961/${System}/${process.env.CASINO_APIPASSWORD}`)
            let Url = `${process.env.CASINO_ENDPOINT}System/Api/${process.env.CASINO_APIKEY}/User/AuthHTML?Login=DemoUser&Demo=1&Password=Demo&System=${System}&TID=${TID}&Hash=${Hash}&Page=${Page}&UserIP=${ip}&UserAutoCreate=1&UniversalLaunch=1&Currency=USD&IsMobile=${IsMobile}`;
            const options = {
                method: 'POST',
                url: Url,
                headers: { 'Content-Type': 'application/json' },
                json: true
            };
            request(options, async (error: any, response: any, body: any) => {
                if (error) {
                    console.log(error)
                } else {
                    if (body) {
                        return res.json(body);
                    }
                }
            });
        } catch (e) {
            console.log(e)
        }
    } else {
        const rdata = await Users.findOne({ _id: Login })
        if (rdata) {
            try {
                const bdata = await Balances.findOne({ userId: Login, status: true })
                const cdata = await Currencies.findOne({ _id: bdata.currency });
                const validSymbols = ['USDT', 'ETH', 'USDT.a', 'ETH.a', 'USDT.b', 'ETH.b', 'USDT.p', 'SOL.b', 'SOL'];
                if (validSymbols.includes(cdata?.symbol) || System === '972' || System === '965') {
                    let Hash = md5(`User/AuthHTML/${process.env.MY_IP}/${TID}/${process.env.CASINO_APIKEY}/${Login}/${Password}/${System}/${process.env.CASINO_APIPASSWORD}`)
                    let Url =
                        `${process.env.CASINO_ENDPOINT}System/Api/${process.env.CASINO_APIKEY}/User/AuthHTML?Login=${Login}&Password=${Password}&System=${System}&TID=${TID}&Hash=${Hash}&Page=${Page}&UserIP=${ip}&UserAutoCreate=1&UniversalLaunch=1&Currency=USD&IsMobile=${IsMobile}`;
                    const options = {
                        method: 'POST',
                        url: Url,
                        headers: { 'Content-Type': 'application/json' },
                        json: true
                    };
                    request(options, async (error: any, response: any, body: any) => {
                        if (error) {
                            console.log(error)
                        } else {
                            console.log(body, "body")

                            if (body) {
                                return res.json(body);
                            }
                        }
                    });
                } else {
                    return res.json({
                        error: "Invalid currency",
                    })
                }
            } catch (e) {
                return res.json({
                    error: "Invalid currency",
                })
            }
        } else {
            return res.json({
                error: "Invalid userid",
            })
        }
    }
}

export const getCasinoGamesDetail = async (req: Request, res: Response) => {
    try {
        const { id } = req.body;
        const result = await CasinoGameLists.findOne({ gameId: id, status: true });
        return res.json(result)
    } catch (e) {
        console.log(e)
    }
}   