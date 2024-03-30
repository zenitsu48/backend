import * as md5 from 'md5';
import * as moment from 'moment';
import * as request from 'request';
import { Request, Response } from 'express';
import { Sessions, Users, Balances, Currencies, SportsBetsV3 } from '../../../models';
import { ObjectId, balanceUpdate, getSessionTime } from "../../base";
import { sessionSchema, userSchema } from '../../../redis/session'
import { Entity, Schema, Repository, Client } from 'redis-om'

// Digitain Callback GetUserInfo Endpoint
export const getUserInfo = async (req: Request, res: Response) => {
    try {
        const { PartnerId, TimeStamp, Token, Signature } = req.body;
        const dgPartnerId = 456;
        const dgSecretKey = "79198bb7-f30c-4b03-b88f-97af1a614566"
        const partner_signature = md5(
            `methodGetUserInfo` +
            `PartnerId${dgPartnerId}` +
            `TimeStamp${TimeStamp}` +
            `Token${Token}` +
            `${dgSecretKey}`
        )
        const timestamp = new Date().valueOf();

        // let client = await new Client().open("redis://localhost:6379");
        // let sessionRepository : Repository = new Repository(sessionSchema, client);
        // let userRepository : Repository = new Repository(userSchema, client);

        const accessToken = await Sessions.findOne({ accessToken: Token });
        // const accessToken : any = await sessionRepository.search().where('accessToken').equal(Token).return.first();

        const birthDate = new Date().toISOString();
        if (partner_signature !== Signature) {
            return res.json({
                ResponseCode: 1016,
                Description: "InvalidSignature",
                TimeStamp: timestamp,
                Token: Token,
                ClientId: Token,
                CurrencyId: "USDT",
                FirstName: "Daniel",
                LastName: "Edward",
                Gender: 1,
                BirthDate: birthDate,
                Signature: md5(
                    `methodGetUserInfo` +
                    `ResponseCode1016` +
                    `DescriptionInvalidSignature` +
                    `TimeStamp${timestamp}` +
                    `Token${Token}` +
                    `ClientId${Token}` +
                    `CurrencyIdUSDT` +
                    `FirstNameDaniel` +
                    `LastNameEdward` +
                    `Gender1` +
                    `BirthDate${birthDate}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (PartnerId !== Number(process.env.DG_PARTNERID)) {
            return res.json({
                ResponseCode: 70,
                Description: "PartnerNotFound",
                TimeStamp: timestamp,
                Token: Token,
                ClientId: Token,
                CurrencyId: "USDT",
                FirstName: "Daniel",
                LastName: "Edward",
                Gender: 1,
                BirthDate: birthDate,
                Signature: md5(
                    `methodGetUserInfo` +
                    `ResponseCode70` +
                    `DescriptionPartnerNotFound` +
                    `TimeStamp${timestamp}` +
                    `Token${Token}` +
                    `ClientId${Token}` +
                    `CurrencyIdUSDT` +
                    `FirstNameDaniel` +
                    `LastNameEdward` +
                    `Gender1` +
                    `BirthDate${birthDate}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (!accessToken) {
            return res.json({
                ResponseCode: 37,
                Description: "WrongToken",
                TimeStamp: timestamp,
                Token: Token,
                ClientId: Token,
                CurrencyId: "USDT",
                FirstName: "Daniel",
                LastName: "Edward",
                Gender: 1,
                BirthDate: birthDate,
                Signature: md5(
                    `methodGetUserInfo` +
                    `ResponseCode37` +
                    `DescriptionWrongToken` +
                    `TimeStamp${timestamp}` +
                    `Token${Token}` +
                    `ClientId${Token}` +
                    `CurrencyIdUSDT` +
                    `FirstNameDaniel` +
                    `LastNameEdward` +
                    `Gender1` +
                    `BirthDate${birthDate}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else {

            // const user: any = await userRepository.search().where('_id').equal(accessToken.userId).return.first();

            const user = await Users.findOne({ _id: accessToken.userId })
            const clientId = user?._id.toString()
            const firstName = user?.firstname === "" ? "firstname" : user?.firstname
            const lastName = user?.lastname === "" ? "lastname" : user?.lastname
            const birth = user?.createdAt

            // Creating a new token
            const expiration = getSessionTime();
            const updateToken = md5(user?._id.toString() + expiration);

            // await Sessions.findOneAndUpdate(
            //     { accessToken: Token },
            //     {
            //         accessToken: updateToken,
            //         refreshToken: updateToken
            //     }
            // )
            // req.app.get('io').to(accessToken.socketId).emit('updateToken', { token: updateToken })
            return res.json({
                ResponseCode: 0,
                Description: "Success",
                TimeStamp: timestamp,
                Token: Token,
                ClientId: clientId,
                CurrencyId: "USDT",
                FirstName: firstName,
                LastName: lastName,
                Gender: 1,
                BirthDate: birth,
                Signature: md5(
                    `methodGetUserInfo` +
                    `ResponseCode0` +
                    `DescriptionSuccess` +
                    `TimeStamp${timestamp}` +
                    `Token${Token}` +
                    `ClientId${clientId}` +
                    `CurrencyIdUSDT` +
                    `FirstName${firstName}` +
                    `LastName${lastName}` +
                    `Gender1` +
                    `BirthDate${birth}` +
                    `${dgSecretKey}`
                )
            })
        }
    } catch (error: any) {
        console.error(
            error?.message,
            "Error ocurred in Digitain GetUserInfo"
        )
    }
}

// Digitain Callback GetBalance Endpoint
export const getBalance = async (req: Request, res: Response) => {
    try {
        const { PartnerId, TimeStamp, Token, ClientId, CurrencyId, Signature } = req.body;
        const partner_signature = md5(
            `methodGetBalance` +
            `PartnerId${PartnerId}` +
            `TimeStamp${TimeStamp}` +
            `Token${Token}` +
            `ClientId${ClientId}` +
            `CurrencyId${CurrencyId}` +
            `${process.env.DG_SECRETKEY}`
        )
        const timestamp = new Date().valueOf()
        const accessToken = await Sessions.findOne({
            accessToken: Token
        })
        const clientId = await Users.findOne({ _id: ObjectId(ClientId) })
        const clientToken = await Sessions.findOne({
            userId: ObjectId(ClientId),
            accessToken: Token
        })
        const currencySymbol = await Currencies.findOne({ symbol: CurrencyId })
        const currencyId = await Balances.findOne({
            userId: ObjectId(ClientId),
            currency: ObjectId('61d45a9c72e5042aaffea2af')
        })
        if (partner_signature !== Signature) {
            return res.json({
                ResponseCode: 1016,
                Description: "InvalidSignature",
                TimeStamp: timestamp,
                Token: Token,
                AvailableBalance: 0,
                CurrencyId: CurrencyId,
                Signature: md5(
                    `methodGetBalance` +
                    `ResponseCode1016` +
                    `DescriptionInvalidSignature` +
                    `TimeStamp${timestamp}` +
                    `Token${Token}` +
                    `AvailableBalance0` +
                    `CurrencyId${CurrencyId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (PartnerId !== Number(process.env.DG_PARTNERID)) {
            return res.json({
                ResponseCode: 70,
                Description: "PartnerNotFound",
                TimeStamp: timestamp,
                Token: Token,
                AvailableBalance: 0,
                CurrencyId: CurrencyId,
                Signature: md5(
                    `methodGetBalance` +
                    `ResponseCode70` +
                    `DescriptionPartnerNotFound` +
                    `TimeStamp${timestamp}` +
                    `Token${Token}` +
                    `AvailableBalance0` +
                    `CurrencyId${CurrencyId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (!accessToken) {
            return res.json({
                ResponseCode: 37,
                Description: "WrongToken",
                TimeStamp: timestamp,
                Token: Token,
                AvailableBalance: 0,
                CurrencyId: CurrencyId,
                Signature: md5(
                    `methodGetBalance` +
                    `ResponseCode37` +
                    `DescriptionWrongToken` +
                    `TimeStamp${timestamp}` +
                    `Token${Token}` +
                    `AvailableBalance0` +
                    `CurrencyId${CurrencyId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (!clientId) {
            return res.json({
                ResponseCode: 22,
                Description: "ClientNotFound",
                TimeStamp: timestamp,
                Token: Token,
                AvailableBalance: 0,
                CurrencyId: CurrencyId,
                Signature: md5(
                    `methodGetBalance` +
                    `ResponseCode22` +
                    `DescriptionClientNotFound` +
                    `TimeStamp${timestamp}` +
                    `Token${Token}` +
                    `AvailableBalance0` +
                    `CurrencyId${CurrencyId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (!clientToken) {
            return res.json({
                ResponseCode: 37,
                Description: "WrongToken",
                TimeStamp: timestamp,
                Token: Token,
                AvailableBalance: 0,
                CurrencyId: CurrencyId,
                Signature: md5(
                    `methodGetBalance` +
                    `ResponseCode37` +
                    `DescriptionWrongToken` +
                    `TimeStamp${timestamp}` +
                    `Token${Token}` +
                    `AvailableBalance0` +
                    `CurrencyId${CurrencyId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (!currencySymbol || !currencyId) {
            return res.json({
                ResponseCode: 20,
                Description: "CurrencyNotExists",
                TimeStamp: timestamp,
                Token: Token,
                AvailableBalance: 0,
                CurrencyId: CurrencyId,
                Signature: md5(
                    `methodGetBalance` +
                    `ResponseCode20` +
                    `DescriptionCurrencyNotExists` +
                    `TimeStamp${timestamp}` +
                    `Token${Token}` +
                    `AvailableBalance0` +
                    `CurrencyId${CurrencyId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else {
            const balance = currencyId.balance
            return res.json({
                ResponseCode: 0,
                Description: "Success",
                TimeStamp: timestamp,
                Token: Token,
                AvailableBalance: balance,
                CurrencyId: CurrencyId,
                Signature: md5(
                    `methodGetBalance` +
                    `ResponseCode0` +
                    `DescriptionSuccess` +
                    `TimeStamp${timestamp}` +
                    `Token${Token}` +
                    `AvailableBalance${balance}` +
                    `CurrencyId${CurrencyId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        }
    } catch (error: any) {
        console.error(
            error?.message,
            "Error ocurred in Digitain GetBalance"
        );
    }
}

// Digitain Callback CreditBet Endpoint
export const creditBet = async (req: Request, res: Response) => {
    const {
        PartnerId,
        TimeStamp,
        Token,
        CurrencyId,
        OrderNumber,
        GameId,
        TransactionId,
        Info,
        DeviceTypeId,
        TypeId,
        BetState,
        PossibleWin,
        OperationItems,
        Signature,
        IpAddress,
        Order
    } = req.body
    const partner_signature = md5(
        `methodCreditBet` +
        `PartnerId${PartnerId}` +
        `TimeStamp${TimeStamp}` +
        `Token${Token}` +
        `CurrencyId${CurrencyId}` +
        `OrderNumber${OrderNumber}` +
        `GameId${GameId}` +
        `TransactionId${TransactionId}` +
        `Info${Info}` +
        `DeviceTypeId${DeviceTypeId}` +
        `TypeId${TypeId}` +
        `BetState${BetState}` +
        `PossibleWin${PossibleWin}` +
        `${process.env.DG_SECRETKEY}`
    )
    const timestamp = new Date().valueOf()

    const accessToken = await Sessions.findOne({
        accessToken: Token
    })
    const clientId = await Users.findOne({
        _id: ObjectId(OperationItems[0]?.ClientId)
    })
    const clientToken = await Sessions.findOne({
        userId: ObjectId(OperationItems[0]?.ClientId),
        accessToken: Token
    })
    const currencySymbol = await Currencies.findOne({
        symbol: CurrencyId
    })
    const currencyId = await Balances.findOne({
        userId: ObjectId(OperationItems[0]?.ClientId),
        currency: ObjectId('61d45a9c72e5042aaffea2af')
    })
    const isOrderNum = await SportsBetsV3.findOne({
        OrderNumber: OrderNumber
    })
    const isTransactionId = await SportsBetsV3.findOne({
        TransactionId: TransactionId
    })
    const balanceData = await Balances.findOne({
        userId: ObjectId(OperationItems[0]?.ClientId),
        currency: ObjectId('61d45a9c72e5042aaffea2af')
    })

    if (partner_signature !== Signature) {
        return res.json({
            ResponseCode: 1016,
            Description: "InvalidSignature",
            TimeStamp: timestamp,
            TransactionId: TransactionId,
            Signature: md5(
                `methodCreditBet` +
                `ResponseCode1016` +
                `DescriptionInvalidSignature` +
                `TimeStamp${timestamp}` +
                `TransactionId${TransactionId}` +
                `${process.env.DG_SECRETKEY}`
            )
        })
    } else if (PartnerId !== Number(process.env.DG_PARTNERID)) {
        return res.json({
            ResponseCode: 70,
            Description: "PartnerNotFound",
            TimeStamp: timestamp,
            TransactionId: TransactionId,
            Signature: md5(
                `methodCreditBet` +
                `ResponseCode70` +
                `DescriptionPartnerNotFound` +
                `TimeStamp${timestamp}` +
                `TransactionId${TransactionId}` +
                `${process.env.DG_SECRETKEY}`
            )
        })
    } else if (!accessToken) {
        return res.json({
            ResponseCode: 37,
            Description: "WrongToken",
            TimeStamp: timestamp,
            TransactionId: TransactionId,
            Signature: md5(
                `methodCreditBet` +
                `ResponseCode37` +
                `DescriptionWrongToken` +
                `TimeStamp${timestamp}` +
                `TransactionId${TransactionId}` +
                `${process.env.DG_SECRETKEY}`
            )
        })
    } else if (!clientId) {
        return res.json({
            ResponseCode: 22,
            Description: "ClientNotFound",
            TimeStamp: timestamp,
            TransactionId: TransactionId,
            Signature: md5(
                `methodCreditBet` +
                `ResponseCode22` +
                `DescriptionClientNotFound` +
                `TimeStamp${timestamp}` +
                `TransactionId${TransactionId}` +
                `${process.env.DG_SECRETKEY}`
            )
        })
    } else if (!clientToken) {
        return res.json({
            ResponseCode: 37,
            Description: "WrongToken",
            TimeStamp: timestamp,
            TransactionId: TransactionId,
            Signature: md5(
                `methodCreditBet` +
                `ResponseCode37` +
                `DescriptionWrongToken` +
                `TimeStamp${timestamp}` +
                `TransactionId${TransactionId}` +
                `${process.env.DG_SECRETKEY}`
            )
        })
    } else if (!currencyId || !currencySymbol) {
        return res.json({
            ResponseCode: 20,
            Description: "CurrencyNotExists",
            TimeStamp: timestamp,
            TransactionId: TransactionId,
            Signature: md5(
                `methodCreditBet` +
                `ResponseCode20` +
                `DescriptionCurrencyNotExists` +
                `TimeStamp${timestamp}` +
                `TransactionId${TransactionId}` +
                `${process.env.DG_SECRETKEY}`
            )
        })
    } else if (isOrderNum) {
        return res.json({
            ResponseCode: 68,
            Description: "NotAllowed",
            TimeStamp: timestamp,
            TransactionId: TransactionId,
            Signature: md5(
                `methodCreditBet` +
                `ResponseCode68` +
                `DescriptionNotAllowed` +
                `TimeStamp${timestamp}` +
                `TransactionId${TransactionId}` +
                `${process.env.DG_SECRETKEY}`
            )
        })
    } else if (isTransactionId) {
        return res.json({
            ResponseCode: 46,
            Description: "TransactionAlreadyExists",
            TimeStamp: timestamp,
            TransactionId: TransactionId,
            Signature: md5(
                `methodCreditBet` +
                `ResponseCode46` +
                `DescriptionTransactionAlreadyExists` +
                `TimeStamp${timestamp}` +
                `TransactionId${TransactionId}` +
                `${process.env.DG_SECRETKEY}`
            )
        })
    } else if (balanceData?.balance < OperationItems[0].Amount) {
        if (balanceData?.balance === 0) {
            return res.json({
                ResponseCode: 1021,
                Description: "InvalidAmount",
                TimeStamp: timestamp,
                TransactionId: TransactionId,
                Signature: md5(
                    `methodCreditBet` +
                    `ResponseCode1021` +
                    `DescriptionInvalidAmound` +
                    `TimeStamp${timestamp}` +
                    `TransactionId${TransactionId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else {
            return res.json({
                ResponseCode: 71,
                Description: "LowBalance",
                TimeStamp: timestamp,
                TransactionId: TransactionId,
                Signature: md5(
                    `methodCreditBet` +
                    `ResponseCode71` +
                    `DescriptionLowBalance` +
                    `TimeStamp${timestamp}` +
                    `TransactionId${TransactionId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        }
    } else if (clientId?.status === false) {
        return res.json({
            ResponseCode: 13,
            Description: "ClientBlocked",
            TimeStamp: timestamp,
            TransactionId: TransactionId,
            Signature: md5(
                `methodCreditBet` +
                `ResponseCode13` +
                `DescriptionClientBlocked` +
                `TimeStamp${timestamp}` +
                `TransactionId${TransactionId}` +
                `${process.env.DG_SECRETKEY}`
            )
        })
    } else {
        let realAmount = Number(Number(OperationItems[0]?.Amount / currencySymbol.price).toFixed(6));
        let lastBalance = Number(Number(balanceData?.balance * currencySymbol.price).toFixed(6));

        const bhistory = {
            req: req,
            balanceId: balanceData._id,
            amount: -realAmount,
            type: Order.Bets[0].BetStakes.length > 1 ?
                'v3-sports-multi-bet-settled' :
                'v3-sports-single-bet-settled'
        }

        const afterBal = await balanceUpdate(bhistory)
        const afterBalance = afterBal.balance

        const updateBalance = Number(Number(afterBalance * currencySymbol.price).toFixed(6))
        const transactionId = new Date().valueOf()
        const saveData = {
            OrderNumber: OrderNumber,
            UserId: OperationItems[0].ClientId,
            BetAmount: OperationItems[0].Amount,
            WinAmount: Order.Bets[0].MaxWinAmount,
            TransactionId: TransactionId,
            LastBalance: lastBalance,
            UpdatedBalance: updateBalance,
            Currency: CurrencyId,
            BetType: Order.Bets[0].BetStakes.length > 1 ?
                "V3-Multi-Bet" : "V3-Single-Bet",
            Status: "Bet",
            IpAddress: IpAddress
        }

        await new SportsBetsV3(saveData).save()

        return res.json({
            ResponseCode: 0,
            Description: "Success",
            TimeStamp: timestamp,
            TransactionId: transactionId,
            Signature: md5(
                `methodCreditBet` +
                `ResponseCode0` +
                `DescriptionSuccess` +
                `TimeStamp${timestamp}` +
                `TransactionId${transactionId}` +
                `${process.env.DG_SECRETKEY}`
            ),
            OperationItems: {
                ClientId: OperationItems[0]?.ClientId,
                Balance: balanceData.balance,
                CurrentLimit: 0,
                CurrencyId: CurrencyId
            }
        })
    }
}

// Digitain Callback CreditBetByBatch Endpoint
export const creditBetByBatch = async (req: Request, res: Response) => {
    try {
        const {
            PartnerId,
            TimeStamp,
            ClientId,
            MainOrderNumber,
            Token,
            CurrencyId,
            Signature,
            BetItems,
            IpAddress
        } = req.body

        const partner_signature = md5(
            `methodCreditBetByBatch` +
            `PartnerId${PartnerId}` +
            `TimeStamp${TimeStamp}` +
            `ClientId${ClientId}` +
            `MainOrderNumber${MainOrderNumber}` +
            `${process.env.DG_SECRETKEY}`
        )

        const timestamp = new Date().valueOf()

        const accessToken = await Sessions.findOne({
            accessToken: Token,
        })
        const clientId = await Sessions.findOne({
            userId: ObjectId(ClientId)
        })
        const clientToken = await Sessions.findOne({
            userId: ObjectId(ClientId),
            accessToken: Token
        })
        const currencySymbol = await Currencies.findOne({
            symbol: CurrencyId
        })
        const balanceData = await Balances.findOne({
            userId: ObjectId(ClientId),
            currency: ObjectId('61d45a9c72e5042aaffea2af')
        })

        let totalAmount = 0;
        for (const i in BetItems) {
            totalAmount += BetItems[i].Amount
        }

        if (partner_signature !== Signature) {
            return res.json({
                ResponseCode: 1016,
                Description: "InvalidSignature",
                TimeStamp: timestamp,
                Signature: md5(
                    `methodCreditBetByBatch` +
                    `ResponseCode1016` +
                    `DescriptionInvalidSignature` +
                    `TimeStamp${timestamp}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (PartnerId !== Number(process.env.DG_PARTNERID)) {
            return res.json({
                ResponseCode: 70,
                Description: "PartnerNotFound",
                TimeStamp: timestamp,
                Signature: md5(
                    `methodCreditBetByBatch` +
                    `ResponseCode70` +
                    `DescriptionPartnerNotFound` +
                    `TimeStamp${timestamp}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (!accessToken) {
            return res.json({
                ResponseCode: 37,
                Description: "WrongToken",
                TimeStamp: timestamp,
                Signature: md5(
                    `methodCreditBetByBatch` +
                    `ResponseCode37` +
                    `DescriptionWrongToken` +
                    `TimeStamp${timestamp}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (!clientId) {
            return res.json({
                ResponseCode: 22,
                Description: "ClientNotFound",
                TimeStamp: timestamp,
                Signature: md5(
                    `methodCreditBetByBatch` +
                    `ResponseCode22` +
                    `DescriptionClientNotFound` +
                    `TimeStamp${timestamp}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (!clientToken) {
            return res.json({
                ResponseCode: 37,
                Description: "WrongToken",
                TimeStamp: timestamp,
                Signature: md5(
                    `methodCreditBetByBatch` +
                    `ResponseCode37` +
                    `DescriptionWrongToken` +
                    `TimeStamp${timestamp}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (!balanceData || !currencySymbol) {
            return res.json({
                ResponseCode: 20,
                Description: "CurrencyNotExists",
                TimeStamp: timestamp,
                Signature: md5(
                    `methodCreditBetByBatch` +
                    `ResponseCode20` +
                    `DescriptionCurrencyNotExists` +
                    `TimeStamp${timestamp}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (clientId?.status === false) {
            return res.json({
                ResponseCode: 13,
                Description: "ClientBlocked",
                TimeStamp: timestamp,
                Signature: md5(
                    `methodCreditBetByBatch` +
                    `ResponseCode13` +
                    `DescriptionClientBlocked` +
                    `TimeStamp${timestamp}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (balanceData.balance < totalAmount) {
            if (balanceData?.balance === 0) {
                return res.json({
                    ResponseCode: 1021,
                    Description: "InvalidAmount",
                    TimeStamp: timestamp,
                    Signature: md5(
                        `methodCreditBetByBatch` +
                        `ResponseCode1021` +
                        `DescriptionInvalidAmound` +
                        `TimeStamp${timestamp}` +
                        `${process.env.DG_SECRETKEY}`
                    )
                })
            } else {
                return res.json({
                    ResponseCode: 71,
                    Description: "LowBalance",
                    TimeStamp: timestamp,
                    Signature: md5(
                        `methodCreditBetByBatch` +
                        `ResponseCode71` +
                        `DescriptionLowBalance` +
                        `TimeStamp${timestamp}` +
                        `${process.env.DG_SECRETKEY}`
                    )
                })
            }
        }

        for (const i in BetItems) {
            const betItem = BetItems[i]
            const isOrderNum = await SportsBetsV3.findOne({
                OrderNumber: betItem.RoundId
            })
            const isTransactionId = await SportsBetsV3.findOne({
                TransactionId: betItem.TransactionId
            })
            if (isOrderNum) {
                return res.json({
                    ResponseCode: 68,
                    Description: "NotAllowed",
                    TimeStamp: timestamp,
                    Signature: md5(
                        `methodCreditBetByBatch` +
                        `ResponseCode68` +
                        `DescriptionNotAllowed` +
                        `TimeStamp${timestamp}` +
                        `${process.env.DG_SECRETKEY}`
                    )
                })
            } else if (isTransactionId) {
                return res.json({
                    ResponseCode: 46,
                    Description: "TransactionAlreadyExists",
                    TimeStamp: timestamp,
                    Signature: md5(
                        `methodCreditBetByBatch` +
                        `ResponseCode46` +
                        `DescriptionTransactionAlreadyExists` +
                        `TimeStamp${timestamp}` +
                        `${process.env.DG_SECRETKEY}`
                    )
                })
            } else {
                let bData = await Balances.findOne({
                    userId: ObjectId(ClientId),
                    currency: ObjectId('61d45a9c72e5042aaffea2af')
                })
                let realAmount = Number(Number(betItem.Amount / currencySymbol.price).toFixed(6));
                let lastBalance = Number(Number(bData?.balance * currencySymbol.price).toFixed(6));

                const bhistory = {
                    req: req,
                    balanceId: balanceData._id,
                    amount: -realAmount,
                    type: 'v3-sports-batch-bet-settled'
                }

                const afterBal = await balanceUpdate(bhistory)
                const afterBalance = afterBal.balance

                const updateBalance = Number(Number(afterBalance * currencySymbol.price).toFixed(6))
                const saveData = {
                    OrderNumber: betItem.RoundId,
                    UserId: ClientId,
                    BetAmount: betItem.Amount,
                    WinAmount: betItem.OrderDetails.Bets[0].MaxWinAmount,
                    TransactionId: betItem.TransactionId,
                    LastBalance: lastBalance,
                    UpdatedBalance: updateBalance,
                    Currency: CurrencyId,
                    BetType: 'V3-Batch-Bet',
                    Status: "Bet",
                    IpAddress: IpAddress || "127.0.0.1"
                }

                await new SportsBetsV3(saveData).save()
            }
        }

        return res.json({
            ResponseCode: 0,
            Description: "Success",
            TimeStamp: timestamp,
            MainOrderNumber: MainOrderNumber,
            ClientId: ClientId,
            CurrentLimit: 0,
            Signature: md5(
                `methodCreditBetByBatch` +
                `ResponseCode0` +
                `DescriptionSuccess` +
                `TimeStamp${timestamp}` +
                `${process.env.DG_SECRETKEY}`
            ),
        })

    } catch (error: any) {
        console.error(error, "Error Ocurred in CreditBetByBatch")
    }
}

// Digitain Callback RollBackByBatch Endpoint
export const rollBackByBatch = async (req: Request, res: Response) => {
    try {
        const {
            PartnerId,
            TimeStamp,
            Items,
            Signature
        } = req.body

        const timestamp = new Date().valueOf()

        const partner_signature = md5(
            `methodRollBackByBatch` +
            `PartnerId${PartnerId}` +
            `TimeStamp${TimeStamp}` +
            `${process.env.DG_SECRETKEY}`
        )
        if (partner_signature !== Signature) {
            return res.json({
                ResponseCode: 1016,
                Description: "InvalidSignature",
                TimeStamp: timestamp,
                Items: [],
                Signature: md5(
                    `methodRollBackByBatch` +
                    `ResponseCode1016` +
                    `DescriptionInvalidSignature` +
                    `TimeStamp${timestamp}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (PartnerId !== Number(process.env.DG_PARTNERID)) {
            return res.json({
                ResponseCode: 70,
                Description: "PartnerNotFound",
                TimeStamp: timestamp,
                Items: [],
                Signature: md5(
                    `methodRollBackByBatch` +
                    `ResponseCode70` +
                    `DescriptionPartnerNotFound` +
                    `TimeStamp${timestamp}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else {
            let resItems = <any>[]
            for (const i in Items) {
                const Item = Items[i]
                const isTransaction = await SportsBetsV3.findOne({ OrderNumber: Item.OrderNumber })
                if (!isTransaction) {
                    resItems.push({
                        TransactionId: Item.TransactionId,
                        Description: "DocumentNotFound",
                        ResponseCode: 28
                    })
                } else if (isTransaction.Status === "RollBack") {
                    resItems.push({
                        TransactionId: Item.TransactionId,
                        Description: "DocumentAlreadyRollbacked",
                        ResponseCode: 58,
                    })
                } else {
                    try {
                        const betData = await SportsBetsV3.findOne({ OrderNumber: Item.OrderNumber })
                        const currencyData = await Currencies.findOne({ symbol: betData.Currency })
                        const balanceData = await Balances.findOne({ userId: betData.UserId, currency: currencyData._id })
                        let realAmount = Number(Number(isTransaction.BetAmount / currencyData.price).toFixed(6));
                        let lastBalance = Number(Number(balanceData?.balance * currencyData.price).toFixed(6));

                        const bhistory = {
                            req: req,
                            balanceId: balanceData._id,
                            amount: realAmount,
                            type: 'v3-sports-rollback-settled'
                        }

                        await balanceUpdate(bhistory)

                        await SportsBetsV3.findOneAndUpdate(
                            { OrderNumber: Item.OrderNumber },
                            { Status: "RollBack" }
                        )
                        resItems.push({
                            TransactionId: Item.TransactionId,
                            Description: "Success",
                            ResponseCode: 0,
                        })

                    } catch (error: any) {
                        console.error(error, 'Error ocurred in RollBackByBatch')
                        return res.json({
                            ResponseCode: 500,
                            Description: "InternalServerError",
                            TimeStamp: timestamp,
                            Items: [],
                            Signature: md5(
                                `methodRollBackByBatch` +
                                `ResponseCode500` +
                                `DescriptionInternalServerError` +
                                `TimeStamp${timestamp}` +
                                `${process.env.DG_SECRETKEY}`
                            )
                        })
                    }
                }
            }
            return res.json({
                ResponseCode: 0,
                Description: "Success",
                TimeStamp: timestamp,
                Items: resItems,
                Signature: md5(
                    `methodRollBackByBatch` +
                    `ResponseCode0` +
                    `DescriptionSuccess` +
                    `TimeStamp${timestamp}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        }


    } catch (error: any) {
        console.error(error, "Error ocurred in RollBackByBatch!")
    }
}

// Digitain Callback DebitByBatchTest Endpoint
export const debitByBatch = async (req: Request, res: Response) => {
    try {
        const firstTime = Date.now();

        const {
            PartnerId,
            TimeStamp,
            Items,
            Signature
        } = req.body

        const timestamp = new Date().valueOf()
        const partner_signature = md5(
            `methodDebitByBatch` +
            `PartnerId${PartnerId}` +
            `TimeStamp${TimeStamp}` +
            `${process.env.DG_SECRETKEY}`
        )
        if (partner_signature !== Signature) {
            return res.json({
                ResponseCode: 1016,
                Description: "InvalidSignature",
                TimeStamp: timestamp,
                Items: [],
                Signature: md5(
                    `methodDebitByBatch` +
                    `ResponseCode1016` +
                    `DescriptionInvalidSignature` +
                    `TimeStamp${timestamp}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        }

        if (PartnerId !== Number(process.env.DG_PARTNERID)) {
            return res.json({
                ResponseCode: 70,
                Description: "PartnerNotFound",
                TimeStamp: timestamp,
                Items: [],
                Signature: md5(
                    `methodDebitByBatch` +
                    `ResponseCode70` +
                    `DescriptionPartnerNotFound` +
                    `TimeStamp${timestamp}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        }

        let resItems = <any>[]
        let wrong_order_list = <any>[]
        const transactionTypeIdList = [2, 3, 4, 5, 6]
        const decreaseList = [3, 6]
        const increaseList = [2, 4, 5]

        for (const i in Items) {
            const Item = Items[i]
            const isClientId = await Users.findOne({ _id: ObjectId(Item.ClientId) })
            const isCurrencyId = await Currencies.findOne({ symbol: Item.CurrencyId })
            const isUserCurrency = await Balances.findOne({
                userId: ObjectId(Item.ClientId),
                currency: isCurrencyId ? isCurrencyId._id : ObjectId("")
            })
            const isOrderNum = await SportsBetsV3.findOne({ OrderNumber: Item.OrderNumber })
            const isTransactionId = await SportsBetsV3.findOne({ TransactionId: Item.TransactionId })
            if (!isClientId) {
                if (wrong_order_list.includes(Item.OrderNumber)) {
                    resItems.push({
                        OrderNumber: Item.OrderNumber,
                        TransactionId: Item.TransactionId,
                        ClientId: Item.ClientId,
                        ResponseCode: 68,
                        Description: "NotAllowed"
                    })
                } else {
                    resItems.push({
                        OrderNumber: Item.OrderNumber,
                        TransactionId: Item.TransactionId,
                        ClientId: Item.ClientId,
                        ResponseCode: 22,
                        Description: "ClientNotFound",
                    })
                    wrong_order_list.push(Item.OrderNumber)
                }
            } else if (!isOrderNum) {
                if (wrong_order_list.includes(Item.OrderNumber)) {
                    resItems.push({
                        OrderNumber: Item.OrderNumber,
                        TransactionId: Item.TransactionId,
                        ClientId: Item.ClientId,
                        ResponseCode: 68,
                        Description: "NotAllowed"
                    })
                } else {
                    resItems.push({
                        OrderNumber: Item.OrderNumber,
                        TransactionId: Item.TransactionId,
                        ClientId: Item.ClientId,
                        ResponseCode: 28,
                        Description: "DocumentNotFound",
                    })
                    wrong_order_list.push(Item.OrderNumber)
                }
            } else if (!isCurrencyId || !isUserCurrency) {
                if (wrong_order_list.includes(Item.OrderNumber)) {
                    resItems.push({
                        OrderNumber: Item.OrderNumber,
                        TransactionId: Item.TransactionId,
                        ClientId: Item.ClientId,
                        ResponseCode: 68,
                        Description: "NotAllowed"
                    })
                } else {
                    resItems.push({
                        OrderNumber: Item.OrderNumber,
                        TransactionId: Item.TransactionId,
                        ClientId: Item.ClientId,
                        ResponseCode: 20,
                        Description: "CurrencyNotExists",
                    })
                    wrong_order_list.push(Item.OrderNumber)
                }
            } else if (!transactionTypeIdList.includes(Item.TransactionTypeId)) {
                if (wrong_order_list.includes(Item.OrderNumber)) {
                    resItems.push({
                        OrderNumber: Item.OrderNumber,
                        TransactionId: Item.TransactionId,
                        ClientId: Item.ClientId,
                        ResponseCode: 68,
                        Description: "NotAllowed"
                    })
                } else {
                    resItems.push({
                        OrderNumber: Item.OrderNumber,
                        TransactionId: Item.TransactionId,
                        ClientId: Item.ClientId,
                        ResponseCode: 1013,
                        Description: "InvalidInputParameters",
                    })
                    wrong_order_list.push(Item.OrderNumber)
                }
            } else if (isTransactionId) {
                if (wrong_order_list.includes(Item.OrderNumber)) {
                    resItems.push({
                        OrderNumber: Item.OrderNumber,
                        TransactionId: Item.TransactionId,
                        ClientId: Item.ClientId,
                        ResponseCode: 68,
                        Description: "NotAllowed",
                    })
                } else {
                    resItems.push({
                        OrderNumber: Item.OrderNumber,
                        TransactionId: Item.TransactionId,
                        ClientId: Item.ClientId,
                        ResponseCode: 46,
                        Description: "TransactionAlreadyExists",
                    })
                }
            } else if ((Item.TransactionTypeId === 3) && (Item.Amount > isUserCurrency.balance)) {
                if (wrong_order_list.includes(Item.OrderNumber)) {
                    resItems.push({
                        OrderNumber: Item.OrderNumber,
                        TransactionId: Item.TransactionId,
                        ClientId: Item.ClientId,
                        ResponseCode: 68,
                        Description: "NotAllowed"
                    })
                } else {
                    resItems.push({
                        OrderNumber: Item.OrderNumber,
                        TransactionId: Item.TransactionId,
                        ClientId: Item.ClientId,
                        ResponseCode: 71,
                        Description: "LowBalance",
                    })
                    wrong_order_list.push(Item.OrderNumber)
                }
            } else {
                let realAmount = Number(Number(Item.Amount / isCurrencyId.price).toFixed(6));
                let lastBalance = Number(Number(isUserCurrency?.balance * isCurrencyId.price).toFixed(6));
                let transactionType = "Win"
                switch (Item.TransactionTypeId) {
                    case 2:
                        transactionType = "Win"
                        break;
                    case 3:
                        transactionType = "DebitDecrease"
                        break;
                    case 4:
                        transactionType = "DebitIncrease"
                        break;
                    case 5:
                        transactionType = "BoreDrawMoneyBackWin"
                        break;
                    case 6:
                        transactionType = "BoreDrawMoneyBackDecrease"
                    default:
                        break;
                }
                if (decreaseList.includes(Item.TransactionTypeId)) {
                    if (wrong_order_list.includes(Item.OrderNumber)) {
                        resItems.push({
                            OrderNumber: Item.OrderNumber,
                            TransactionId: Item.TransactionId,
                            ClientId: Item.ClientId,
                            ResponseCode: 68,
                            Description: "NotAllowed",
                        })
                    } else {
                        const bhistory = {
                            req: req,
                            balanceId: isUserCurrency._id,
                            amount: -realAmount,
                            type: `v3-sports-${transactionType}-settled`
                        }

                        const afterBal = await balanceUpdate(bhistory)
                        const afterBalance = afterBal.balance
                        const updateBalance = Number(Number(afterBalance * isCurrencyId.price).toFixed(6))
                        const newData = {
                            UserId: ObjectId(Item.ClientId),
                            OrderNumber: Item.OrderNumber,
                            BetAmount: isOrderNum.BetAmount,
                            WinAmount: -Item.Amount,
                            TransactionId: Item.TransactionId,
                            LastBalance: lastBalance,
                            UpdatedBalance: updateBalance,
                            Currency: Item.CurrencyId,
                            BetType: `V3-${transactionType}-Settle`,
                            Status: transactionType,
                            IpAddress: "DG 127.0.0.1"
                        }
                        new SportsBetsV3(newData).save()
                        resItems.push({
                            OrderNumber: Item.OrderNumber,
                            TransactionId: Item.TransactionId,
                            ClientId: Item.ClientId,
                            ResponseCode: 0,
                            Description: "Success",
                        })
                    }
                } else if (increaseList.includes(Item.TransactionTypeId)) {
                    if (wrong_order_list.includes(Item.OrderNumber)) {
                        resItems.push({
                            OrderNumber: Item.OrderNumber,
                            TransactionId: Item.TransactionId,
                            ClientId: Item.ClientId,
                            ResponseCode: 68,
                            Description: "NotAllowed",
                        })
                    } else {
                        const bhistory = {
                            req: req,
                            balanceId: isUserCurrency._id,
                            amount: realAmount,
                            type: `v3-sports-${transactionType}-settled`
                        }
                        const afterBal = await balanceUpdate(bhistory)
                        const afterBalance = afterBal.balance
                        const updateBalance = Number(Number(afterBalance * isCurrencyId.price).toFixed(6))
                        const newData = {
                            UserId: ObjectId(Item.ClientId),
                            OrderNumber: Item.OrderNumber,
                            BetAmount: isOrderNum.BetAmount,
                            WinAmount: Item.Amount,
                            TransactionId: Item.TransactionId,
                            LastBalance: lastBalance,
                            UpdatedBalance: updateBalance,
                            Currency: Item.CurrencyId,
                            BetType: `V3-${transactionType}-Settle`,
                            Status: transactionType,
                            IpAddress: "DG 127.0.0.1"
                        }
                        await new SportsBetsV3(newData).save()
                        resItems.push({
                            OrderNumber: Item.OrderNumber,
                            TransactionId: Item.TransactionId,
                            ClientId: Item.ClientId,
                            ResponseCode: 0,
                            Description: "Success",
                        })
                    }
                }
            }
        }

        const currentTime = Date.now();

        return res.json({
            ResponseCode: 0,
            Description: "Success",
            TimeStamp: timestamp,
            Items: resItems,
            Signature: md5(
                `methodDebitByBatch` +
                `ResponseCode0` +
                `DescriptionSuccess` +
                `TimeStamp${timestamp}` +
                `${process.env.DG_SECRETKEY}`
            )
        })

    } catch (error: any) {
        console.error(error, "Error ocurred in DebitByBatch!")
    }
}

// Digitain Callback CheckRedact Endpoint
export const chequeRedact = async (req: Request, res: Response) => {
    try {
        const {
            PartnerId,
            TimeStamp,
            OrderNumber,
            TransactionId,
            Info,
            PossibleWin,
            Order,
            Signature
        } = req.body
        const partner_signature = md5(
            `methodChequeRedact` +
            `PartnerId${PartnerId}` +
            `TimeStamp${TimeStamp}` +
            `OrderNumber${OrderNumber}` +
            `TransactionId${TransactionId}` +
            `Info${Info}` +
            `PossibleWin${PossibleWin}` +
            `${process.env.DG_SECRETKEY}`
        )
        const timestamp = new Date().valueOf()
        const isTransactionId = await SportsBetsV3.findOne({
            TransactionId: TransactionId
        })
        const isOrderNum = await SportsBetsV3.findOne({
            OrderNumber: OrderNumber
        })
        if (partner_signature !== Signature) {
            return res.json({
                ResponseCode: 1016,
                Description: "InvalidSignature",
                TimeStamp: timestamp,
                TransactionId: TransactionId,
                Signature: md5(
                    `methodChequeRedact` +
                    `ResponseCode1016` +
                    `DescriptionInvalidSignature` +
                    `TimeStamp${timestamp}` +
                    `TransactionId${TransactionId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (PartnerId !== Number(process.env.DG_PARTNERID)) {
            return res.json({
                ResponseCode: 70,
                Description: "PartnerNotFound",
                TimeStamp: timestamp,
                TransactionId: TransactionId,
                Signature: md5(
                    `methodChequeRedact` +
                    `ResponseCode70` +
                    `DescriptionPartnerNotFound` +
                    `TimeStamp${timestamp}` +
                    `TransactionId${TransactionId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (isTransactionId) {
            return res.json({
                ResponseCode: 46,
                Description: "TransactionAlreadyExists",
                TimeStamp: timestamp,
                TransactionId: TransactionId,
                Signature: md5(
                    `methodChequeRedact` +
                    `ResponseCode46` +
                    `DescriptionTransactionAlreadyExists` +
                    `TimeStamp${timestamp}` +
                    `TransactionId${TransactionId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (!isOrderNum || isOrderNum.Status === "RollBack") {
            return res.json({
                ResponseCode: 28,
                Description: "DocumentNotFound ",
                TimeStamp: timestamp,
                TransactionId: TransactionId,
                Signature: md5(
                    `methodChequeRedact` +
                    `ResponseCode28` +
                    `DescriptionDocumentNotFound ` +
                    `TimeStamp${timestamp}` +
                    `TransactionId${TransactionId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else if (
            isOrderNum?.Status === "Win" ||
            isOrderNum?.Status === "DebitIncrease" ||
            isOrderNum?.Status === "DebitDecrease"
        ) {
            return res.json({
                ResponseCode: 68,
                Description: "NotAllowed",
                TimeStamp: timestamp,
                TransactionId: TransactionId,
                Signature: md5(
                    `methodChequeRedact` +
                    `ResponseCode68` +
                    `DescriptionNotAllowed` +
                    `TimeStamp${timestamp}` +
                    `TransactionId${TransactionId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        } else {
            await SportsBetsV3.findOneAndUpdate(
                { OrderNumber: OrderNumber },
                {
                    WinAmount: PossibleWin,
                    TransactionId: TransactionId
                }
            )
            return res.json({
                ResponseCode: 0,
                Description: "Success",
                TimeStamp: timestamp,
                TransactionId: TransactionId,
                Signature: md5(
                    `methodChequeRedact` +
                    `ResponseCode0` +
                    `DescriptionSuccess` +
                    `TimeStamp${timestamp}` +
                    `TransactionId${TransactionId}` +
                    `${process.env.DG_SECRETKEY}`
                )
            })
        }
    } catch (error: any) {
        console.error(error, "Error ocurred in ChequeRedact!")
    }
}
