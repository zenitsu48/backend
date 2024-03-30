import { Request, Response } from 'express';
import axios from 'axios';
import {
    BOGameLists,
    Balances,
    CasinoBetHistory,
    CasinoCategories,
    ProviderList,
    Currencies,
    Sessions,
    Users
} from '../../../models';
import { balanceUpdate, ObjectId } from '../../base';

const CryptoJS = require("crypto-js");

interface GameFilter {
    gameType?: string;
    gameName?: string;
    provider?: any;
    page: number;
    perPage: number;
}

// BlueOcean callback endpoint
export const boCallback = async (req: Request, res: Response) => {
    if (req.query.action == "balance") {
        const sem = require("semaphore")(1);
        sem.take(async function () {
            const {
                callerPrefix,
                remote_id,
                username,
                session_id,
                currency
            } = req.query;
            console.log("balance", req.query);
            let queryList = <any>[];
            Object.keys(req.query).map((key) => {
                if (key != "key") {
                    queryList.push(`${key}=${req.query[key]}`);
                }
            });

            const queryString = queryList.join("&");

            if (req.query.key != CryptoJS.SHA1(process.env.BO_SALTKEY + queryString).toString()) {
                sem.leave();
                return res
                    .status(200)
                    .json({ status: "403", msg: "INCORRECT_KEY_VALIDATION" });
            } else {
                const session = await Sessions.findOne({ "gameProfile.id": remote_id });
                if (session == null) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "500", msg: "remote_id doesn't match" });
                } else if (session.gameProfile.username != callerPrefix as string + username) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "500", msg: "username doesn't match" });
                } else if (session.gameProfile.sessionid != session_id) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "500", msg: "username doesn't match" });
                } else {
                    const user = await Users.findOne({ _id: ObjectId(session.userId) });
                    const balance = await Balances.findOne({
                        userId: user._id,
                        currency: ObjectId("61d45a9c72e5042aaffea2af")
                    })

                    if (user == null) {
                        sem.leave();
                        return res
                            .status(200)
                            .json({ status: "500", msg: "user can't find" });
                    } else if (!balance) {
                        sem.leave();
                        return res.
                            status(200).
                            json({ status: "500", msg: "invalid currency!" });
                    }
                    else {
                        sem.leave();
                        return res
                            .status(200)
                            .json({ status: "200", balance: balance.balance });
                    }
                }
            }
        })
    } else if (req.query.action == "debit") {
        const sem = require("semaphore")(1);
        sem.take(async function () {
            const {
                callerPrefix,
                remote_id,
                username,
                session_id,
                currency,
                amount,
                game_id,
                transaction_id,
            } = req.query;

            console.log("debit---", req.query);

            const session = await Sessions.findOne({ "gameProfile.id": remote_id });
            const user = await Users.findOne({ _id: ObjectId(session.userId) });
            const bData = await Balances.findOne({
                userId: user._id,
                status: true
            });

            let queryList = <any>[];
            Object.keys(req.query).map((key) => {
                if (key != "key") queryList.push(`${key}=${req.query[key]}`);
            });
            const queryString = queryList.join("&");

            if (req.query.key != CryptoJS.SHA1(process.env.BO_SALTKEY + queryString).toString()) {
                sem.leave();
                return res
                    .status(200)
                    .json({ status: "403", msg: "INCORRECT_KEY_VALIDATION" });
            } else {
                if (session == null) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "500", msg: "remote_id doesn't match" });
                } else if (session.gameProfile.username != callerPrefix as string + username) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "500", msg: "username doesn't match" });
                } else if (session.gameProfile.sessionid != session_id) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "500", msg: "username doesn't match" });
                } else if (parseFloat(amount as string) < 0) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "403", msg: "Amount is negative" });
                } else {
                    if (user == null) {
                        sem.leave();
                        return res
                            .status(200)
                            .json({ status: "500", msg: "user can't find" });
                    }
                    else if (parseFloat(bData.balance) < parseFloat(amount as string)) {
                        sem.leave();
                        return res
                            .status(200)
                            .json({ status: "403", msg: "Insufficient funds" });
                    } else {
                        try {
                            const bdata = await Balances.findOne({ userId: user._id, status: true })
                            const cdata = await Currencies.findOne({ _id: bdata.currency });

                            const transaction = await CasinoBetHistory.findOne(
                                {
                                    transactionId: transaction_id,
                                    USERID: user._id
                                }
                            );

                            if (transaction == null) {
                                const bhistory = {
                                    req: req,
                                    balanceId: bdata._id,
                                    amount: -1 * Number(amount),
                                    type: 'blueocean-casino-bet'
                                }
                                const afterBal = await balanceUpdate(bhistory);
                                const afterBalance = afterBal.balance
                                const sdata = {
                                    GAMEID: game_id,
                                    USERID: user._id,
                                    LAUNCHURL: 2,
                                    AMOUNT: amount,
                                    TYPE: "BET",
                                    currency: currency,
                                    transactionId: transaction_id,
                                    currencyId: cdata._id,
                                    lastbalance: bdata.balance,
                                    updatedbalance: afterBalance,
                                    betting: {
                                        transaction_id,
                                        amount,
                                        origin_currency: cdata.symbol,
                                        origin_bet_amount: Math.abs(Number(amount))
                                    }
                                }
                                await new CasinoBetHistory(sdata).save();

                                sem.leave();
                                return res.status(200).json({ status: "200", balance: afterBalance })
                            } else {
                                if (
                                    transaction.USERID.toString() == user._id.toString() &&
                                    transaction.TYPE == "BET" &&
                                    transaction.GAMEID == game_id &&
                                    transaction.currency == currency &&
                                    transaction.AMOUNT == amount
                                ) {
                                    sem.leave();
                                    return res
                                        .status(200)
                                        .json({ status: "200", balance: transaction.updatedbalance });
                                } else {
                                    sem.leave();
                                    return res
                                        .status(200)
                                        .json({
                                            status: "500",
                                            msg: "Transaction already exist but has different content",
                                        })
                                }
                            }
                        } catch (error) {
                            sem.leave();
                            console.log(error, "Debit Error")
                        }
                    }
                }
            }
        })
    } else if (req.query.action == "credit") {
        const sem = require("semaphore")(1);
        sem.take(async function () {
            const {
                callerPrefix,
                remote_id,
                username,
                session_id,
                currency,
                amount,
                game_id,
                transaction_id,
            } = req.query;

            console.log("credit", req.query);

            const session = await Sessions.findOne({ "gameProfile.id": remote_id });
            const user = await Users.findOne({ _id: session.userId });

            let queryList = <any>[];
            Object.keys(req.query).map((key) => {
                if (key != "key") queryList.push(`${key}=${req.query[key]}`);
            });
            const queryString = queryList.join("&");

            if (req.query.key != CryptoJS.SHA1(process.env.BO_SALTKEY + queryString).toString()) {
                sem.leave();
                return res
                    .status(200)
                    .json({ status: "403", msg: "INCORRECT_KEY_VALIDATION" });
            } else {
                if (session == null) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "500", msg: "remote_id doesn't match" });
                } else if (session.gameProfile.username != callerPrefix as string + username) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "500", msg: "username doesn't match" });
                } else if (session.gameProfile.sessionid != session_id) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "500", msg: "username doesn't match" });
                } else if (parseFloat(amount as string) < 0) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "403", msg: "Amount is negative" });
                } else {
                    if (user == null) {
                        sem.leave();
                        return res
                            .status(200)
                            .json({ status: "500", msg: "user can't find" });
                    }
                    else {
                        try {
                            const transaction = await CasinoBetHistory.findOne({
                                transactionId: transaction_id,
                                USERID: user._id,
                            });

                            let bdata = await Balances.findOne({ userId: user._id, status: true })
                            let cdata = await Currencies.findOne({ _id: bdata.currency });

                            if (transaction == null) {
                                if (Number(amount) > 0) {

                                    const bhistory = {
                                        req: req,
                                        balanceId: bdata._id,
                                        amount: Number(amount),
                                        type: 'blueocean-casino-bet-settled'
                                    }

                                    const afterBal = await balanceUpdate(bhistory);
                                    const afterBalance = afterBal.balance;

                                    const sdata = {
                                        GAMEID: game_id,
                                        USERID: user._id,
                                        LAUNCHURL: 2,
                                        AMOUNT: amount,
                                        TYPE: 'WIN',
                                        currency: currency,
                                        currencyId: cdata._id,
                                        transactionId: transaction_id,
                                        lastbalance: bdata.balance,
                                        updatedbalance: afterBalance,
                                        betting: {
                                            transaction_id,
                                            amount,
                                            origin_currency: cdata.symbol,
                                            origin_bet_amount: Math.abs(Number(amount))
                                        }
                                    }
                                    await new CasinoBetHistory(sdata).save();

                                    sem.leave();
                                    return res
                                        .status(200)
                                        .json({ status: "200", balance: afterBalance })

                                } else {
                                    sem.leave();
                                    return res
                                        .status(200)
                                        .json({ status: "200", balance: bdata.balance })
                                }

                            } else {
                                if (
                                    transaction.USERID.toString() == user._id.toString() &&
                                    transaction.TYPE == "WIN" &&
                                    transaction.GAMEID == game_id &&
                                    transaction.currency == currency &&
                                    transaction.AMOUNT == amount
                                ) {
                                    sem.leave();
                                    return res
                                        .status(200)
                                        .json({ status: "200", balance: transaction.updatedbalance })
                                } else {
                                    sem.leave();
                                    return res
                                        .status(200)
                                        .json({
                                            status: "500",
                                            msg: "Transaction already exist but has different content",
                                        })
                                }
                            }
                        } catch (error) {
                            sem.leave();
                            console.log(error, "Credit Error!")
                        }
                    }
                }
            }
        })
    } else if (req.query.action == "rollback") {
        const sem = require("semaphore")(1);
        sem.take(async function () {
            const {
                callerPrefix,
                remote_id,
                username,
                session_id,
                currency,
                amount,
                game_id,
                transaction_id,
                round_id
            } = req.query;

            console.log("rollback", req.query);

            let byTransId = !game_id ||
                game_id == "" ||
                amount == "" ||
                !amount ||
                round_id == "" ||
                !round_id;

            let queryList = <any>[];
            Object.keys(req.query).map((key) => {
                if (key != "key") queryList.push(`${key}=${req.query[key]}`);
            });
            const queryString = queryList.join("&");

            if (req.query.key != CryptoJS.SHA1(process.env.BO_SALTKEY + queryString).toString()) {
                sem.leave();
                return res
                    .status(200)
                    .json({ status: "403", msg: "INCORRECT_KEY_VALIDATION" });
            } else {
                const session = await Sessions.findOne({
                    "gameProfile.id": remote_id,
                });
                if (session == null) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "500", msg: "remote_id doesn't match" });
                } else if (session.gameProfile.username != callerPrefix as string + username) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "500", msg: "username doesn't match" });
                } else if (session.gameProfile.sessionid != session_id) {
                    sem.leave();
                    return res
                        .status(200)
                        .json({ status: "500", msg: "username doesn't match" });
                } else {
                    const user = await Users.findOne({ _id: session.userId });
                    if (user == null) {
                        sem.leave();
                        return res
                            .status(200)
                            .json({ status: "500", msg: "user can't find" });
                    }
                    else {
                        const transaction = await CasinoBetHistory.findOne({
                            transactionId: transaction_id,
                            USERID: user._id,
                        });
                        if (transaction == null) {
                            sem.leave();
                            return res
                                .status(200)
                                .json({ status: "404", msg: "Transaction not found" });
                        } else {
                            if (transaction.result == "Canceled") {
                                sem.leave();
                                return res
                                    .status(200)
                                    .json({
                                        status: "200",
                                        balance: transaction.lastbalance,
                                        msg: "Rollback already processed"
                                    });
                            } else {
                                try {
                                    let bdata = await Balances.findOne({ userId: user._id, status: true })
                                    let cdata = await Currencies.findOne({ _id: bdata.currency });

                                    const bhistory = {
                                        req: req,
                                        balanceId: bdata._id,
                                        amount: transaction.TYPE === "WIN"
                                            ? (byTransId ? -1 * transaction.AMOUNT : -1 * Number(amount))
                                            : (byTransId ? transaction.AMOUNT : Number(amount)),
                                        type: 'blueocean-rollback'
                                    }

                                    const afterBal = await balanceUpdate(bhistory);
                                    const afterBalance = afterBal.balance;
                                    await CasinoBetHistory.findOneAndUpdate(
                                        { transactionId: transaction_id },
                                        { result: "Canceled" },
                                        { upsert: true }
                                    );

                                    const sdata = {
                                        GAMEID: game_id || transaction.GAMEID,
                                        USERID: user._id,
                                        LAUNCHURL: 2,
                                        AMOUNT: amount || transaction.AMOUNT,
                                        TYPE: 'WIN',
                                        currency: currency,
                                        currencyId: cdata._id,
                                        transactionId: transaction_id,
                                        lastbalance: bdata.balance,
                                        updatedbalance: afterBalance,
                                        betting: {
                                            transaction_id,
                                            amount,
                                            origin_currency: cdata.symbol,
                                            origin_bet_amount: Math.abs(Number(amount))
                                        }
                                    }
                                    await new CasinoBetHistory(sdata).save()

                                    sem.leave();
                                    return res
                                        .status(200)
                                        .json({ status: "200", balance: afterBalance });
                                } catch (error) {
                                    sem.leave();
                                    return res
                                        .status(200)
                                        .json({ status: "500", msg: "Transaction rollback failed." });
                                }
                            }
                        }
                    }
                }
            }
        })
    }
};

// Open a demo game
export const openDemoGame = async (req: Request, res: Response) => {
    try {
        const { slug } = req.body;

        if (slug) {
            const game = await BOGameLists.findOne({ slug: slug });
            let boResponse = <any>{};

            if (game.gameType == "sportsbook") {
                boResponse = await axios({
                    method: "POST",
                    url: process.env.BO_ENDPOINT,
                    data: {
                        api_login: process.env.BO_API_USERNAME,
                        api_password: process.env.BO_API_PASSWORD,
                        method: "getGameDemo",
                        lang: "en",
                        homeurl: "https://bcb.club/app/casino/all-games",
                        gameid: game.gameId,
                        currency: "EUR",
                    }
                })
            } else {
                boResponse = await axios({
                    method: "POST",
                    url: process.env.BO_ENDPOINT,
                    data: {
                        api_login: process.env.BO_API_USERNAME,
                        api_password: process.env.BO_API_PASSWORD,
                        method: "getGame",
                        lang: "en",
                        gameid: game.gameId,
                        homeurl: "https://bcb.club/app/casino/all-games",
                        play_for_fun: true,
                        currency: "EUR",
                    }
                })
            }
            console.log(boResponse.data, "bo response===>")
            if (boResponse.data.error == 0) {
                res.json(boResponse.data.response);
            }
        } else {
            return res.status(400).send("Wrong Parameter");
        }
    } catch (error: any) {
        console.error({
            title: "openDemoGame",
            message: error.message,
            date: new Date(),
        });
        return res.json("Server Error");
    }
}

// Open a real game
export const openGame = async (req: Request, res: Response) => {

    try {

        const { slug, userId } = req.body;
        if (slug) {

            const game = await BOGameLists.findOneAndUpdate(
                { slug },
                { $inc: { opens: 1 } },
                { new: true }
            );
            const user = await Users.findOne({ _id: ObjectId(userId) })
            let userBOData = await axios({
                method: "POST",
                url: process.env.BO_ENDPOINT,
                data: {
                    api_login: process.env.BO_API_USERNAME,
                    api_password: process.env.BO_API_PASSWORD,
                    method: "playerExists",
                    user_username: user.username,
                    currency: "EUR",
                },
            });
            if (!userBOData.data.response) {
                userBOData = await axios({
                    method: "POST",
                    url: process.env.BO_ENDPOINT,
                    data: {
                        api_login: process.env.BO_API_USERNAME,
                        api_password: process.env.BO_API_PASSWORD,
                        method: "createPlayer",
                        user_username: user.username,
                        user_nickname: user.username,
                        user_password: user.username,
                        currency: "EUR",
                    },
                });
            }
            await Sessions.findOneAndUpdate(
                { userId: user._id },
                { gameProfile: userBOData.data.response }
            );

            let boResponse = <any>{}

            if (game.gameType == "sportsbook") {
                boResponse = await axios({
                    method: "POST",
                    url: process.env.BO_ENDPOINT,
                    data: {
                        api_login: process.env.BO_API_USERNAME,
                        api_password: process.env.BO_API_PASSWORD,
                        method: "getGameDirect",
                        lang: "en",
                        user_username: user.username,
                        user_password: user.username,
                        gameid: game.gameId,
                        homeurl: "https://bcb.club/app/casino/all-games",
                        play_for_fun: false,
                        currency: "EUR",
                    },
                });
            } else {
                boResponse = await axios({
                    method: "POST",
                    url: process.env.BO_ENDPOINT,
                    data: {
                        api_login: process.env.BO_API_USERNAME,
                        api_password: process.env.BO_API_PASSWORD,
                        method: "getGame",
                        lang: "en",
                        user_username: user.username,
                        user_password: user.username,
                        gameid: game.gameId,
                        homeurl: "https://bcb.club/app/casino/all-games",
                        play_for_fun: false,
                        currency: "EUR",
                    }
                })
            }
            if (boResponse.data.error == 0) {
                res.json(boResponse.data.response)
            } else {
                console.log(boResponse.data.message, "Error Ocurred!")
            }
        }
    } catch (error) {
        console.error({
            title: "openGame",
            message: error,
            date: new Date(),
        });
        return res.status(500).send("Server Error");
    }
};

// Get Blueocean category list
export const boCategoryList = async (req: Request, res: Response) => {
    const gameList = await CasinoCategories.find({ Status: true });
    res.json(gameList);
};

// Get Blueocean game providers by cateogry
export const getProviderList = async (req: Request, res: Response) => {
    const { type } = req.body;
    if (type === "all-games") {
        const data = await ProviderList.find({ status: true }).sort({ providerName: 1 });
        res.json(data);
    } else {
        const data = await ProviderList.find({ status: true, gameType: type }).sort({ providerName: 1 });
        res.json(data);
    }
}

// Get Blueocean games list
export const getGames = async (req: Request, res: Response) => {
    try {
        const { gameType, page, perPage, provider, gameName } = req.body as GameFilter;

        console.log(req.body, "req data===>")

        const match: { $and: any[] } = {
            $and: [{ gameName: { $regex: gameName ? gameName : "", $options: "i" } }],
        };

        if (provider !== "All") {
            match["$and"].push({ provider: provider });
        }

        if (gameType === "all-games") {
            match["$and"].push({ gameType: { $ne: "category" } });
        } else if (gameType === "new") {
            match["$and"].push({ isNew: true });
        } else if (gameType === "popular") {
            match["$and"].push({ isFeatured: true })
        } else {
            match["$and"].push({ gameType: gameType })
        }

        const count = await BOGameLists.aggregate([
            {
                $match: match,
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                },
            },
        ]);

        let data: any[];
        if (gameType === "top") {
            data = await BOGameLists.find(match).sort({ opens: -1 }).skip(page * perPage).limit(perPage);
        } else {
            data = await BOGameLists.find(match).skip(page * perPage).limit(perPage);
        }
        return res
            .status(200)
            .json({ data, length: data.length, count: count.length ? count[0].count : 0 });
    } catch (error: any) {
        console.error({
            title: "getGames",
            message: error.message,
            date: new Date(),
            error,
        });
        return res.status(500).send("Server Error");
    }
};

// Get BlueOcean Live winners
export const getLiveWinners = async (req: Request, res: Response) => {
    let getWinnersData = await axios({
        method: "POST",
        url: process.env.BO_ENDPOINT,
        data: {
            api_login: process.env.BO_API_USERNAME,
            api_password: process.env.BO_API_PASSWORD,
            method: "getLatestWinners",
            device: "desktop",
            custom_style: false,
            render: "json",
            currency: "USD"
        },
    });

    if (getWinnersData.data.error == 0) {
        res.json(getWinnersData.data.response)
    } else {
        console.log(getWinnersData.data.message, "Error Ocurred!")
    }
}
