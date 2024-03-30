import * as md5 from 'md5';
import * as moment from 'moment';
import * as request from 'request';
import { Request, Response } from 'express';
import { Sessions, Users, Balances, Currencies, SportsBetsV3 } from '../../../models';
import { ObjectId, balanceUpdate, getSessionTime } from "../../base";
import { sessionSchema, userSchema } from '../../../redis/session'
import { Entity, Schema, Repository, Client } from 'redis-om'


const getRandomDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

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
        const startDate = new Date('2020-01-01');
        const endDate = new Date('2023-12-31');
        const randomDate = getRandomDate(startDate, endDate);
        const randomISOTime = randomDate.toISOString();

        const demoClientInfo: any = {
            "399fcd9dc5dd27b40ca2753991731c56": "65fb8f6f09b5bc3582acf1a4",
            "fd6612fd4a0847200d380f36efb65cf6": "6603ace64a27f4e101bf19f1",
            "9e6ed1ec5965a1111028021ffe5b2924": "660424f89aab75e3b6781a3a",
            "514b8da8a6d994adb2e3f58ca19b8bd9": "6604258b9aab75e3b6781e4c",
            "88b1e56b8bc640ee7b9c2bb50e0a3505": "660477624b8eb52a3464d4ce",
            "81b611d45044940ffce7aab6a60ae3ec": "660534313245cd1769f0e05d",
            "410394ee02dedd6be83bb90834b9bbb6": "660534983245cd1769f0e362",
            "d8b2fba18b9253bb36788cb617b3e9a4": "6605353b3245cd1769f0e852",
            "483fddb04908f2c6949e9d4d0196f311": "6605359a3245cd1769f0ebb6",
            "9a93a04553d27158510568729cf6e90f": "66060e52866562afc6685840",
            "63594c1966ed15b13670d4be440ed548": "66060efb866562afc6685c1f",
            "312ba44fe5d9f8eb2e9aff17ebff1031": "66060fb6866562afc6686134",
            "f622b5b0e11de0d9d1b4d3d41495f7d1": "6606102c866562afc66864c5",
            "b19e1b67fbd7c8eecbc53a0cbb94b121": "6606106a866562afc66866e2",
            "52ea2793f20b35f6a65b75b636c836af": "660610b1866562afc668695d",
        }

        const expiration = getSessionTime();
        const updateToken = md5(demoClientInfo[Token] + expiration);

        return res.json({
            ResponseCode: 0,
            Description: "Success",
            TimeStamp: timestamp,
            Token: updateToken,
            ClientId: demoClientInfo[Token],
            CurrencyId: "USDT",
            FirstName: "firstName",
            LastName: "lastName",
            Gender: 1,
            BirthDate: randomISOTime,
            Signature: md5(
                `methodGetUserInfo` +
                `ResponseCode0` +
                `DescriptionSuccess` +
                `TimeStamp${timestamp}` +
                `Token${updateToken}` +
                `ClientId${demoClientInfo[Token]}` +
                `CurrencyIdUSDT` +
                `FirstNamefirstName` +
                `LastNamelastName` +
                `Gender1` +
                `BirthDate${randomISOTime}` +
                `${dgSecretKey}`
            )
        })
    } catch (error: any) {
        console.error(
            error?.message,
            "Error ocurred in Digitain GetUserInfo"
        )
    }
}

export const getBalance = async (req: Request, res: Response) => {
    try {
        // console.log(req.body, "getBalance requests===>")
        console.log(Date.now(), "firstTime")
        const { PartnerId, TimeStamp, Token, ClientId, CurrencyId, Signature } = req.body;
        // const partner_signature = md5(
        //     `methodGetBalance` +
        //     `PartnerId${PartnerId}` +
        //     `TimeStamp${TimeStamp}` +
        //     `Token${Token}` +
        //     `ClientId${ClientId}` +
        //     `CurrencyId${CurrencyId}` +
        //     `${process.env.DG_SECRETKEY}`
        // )
        const timestamp = new Date().valueOf()

        md5(
            `methodGetBalance` +
            `ResponseCode0` +
            `DescriptionSuccess` +
            `TimeStamp${timestamp}` +
            `Token${Token}` +
            `AvailableBalance250` +
            `CurrencyId${CurrencyId}` +
            `${process.env.DG_SECRETKEY}`
        )

        
       
        // let balance = Math.floor(Math.random() * (50000 - 40000) + 40000);
        console.log(Date.now(), "SecondTime")
        return res.json({
            ResponseCode: 0,
            Description: "Success",
            TimeStamp: timestamp,
            Token: Token,
            AvailableBalance: 250,
            CurrencyId: CurrencyId,
            Signature: md5(
                `methodGetBalance` +
                `ResponseCode0` +
                `DescriptionSuccess` +
                `TimeStamp${timestamp}` +
                `Token${Token}` +
                `AvailableBalance250` +
                `CurrencyId${CurrencyId}` +
                `${process.env.DG_SECRETKEY}`
            )
        })
        // }
    } catch (error: any) {
        console.error(
            error?.message,
            "Error ocurred in Digitain GetBalance"
        );
    }
}

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
    const transactionId = new Date().valueOf()
    let balance = Math.floor(Math.random() * (50000 - 40000) + 40000);
    let time = Math.floor(Math.random() * (100 - 0) + 0);

    setTimeout(() => {
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
                Balance: balance,
                CurrentLimit: 0,
                CurrencyId: CurrencyId
            }
        })
    }, time);
    // }
}

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
        console.log(req.body, "creditbetbybatch requests===>")

        const partner_signature = md5(
            `methodCreditBetByBatch` +
            `PartnerId${PartnerId}` +
            `TimeStamp${TimeStamp}` +
            `ClientId${ClientId}` +
            `MainOrderNumber${MainOrderNumber}` +
            `${process.env.DG_SECRETKEY}`
        )

        const timestamp = new Date().valueOf()

        // const accessToken = await Sessions.findOne({
        //     accessToken: Token,
        // })
        // const clientId = await Sessions.findOne({
        //     userId: ObjectId(ClientId)
        // })
        // const clientToken = await Sessions.findOne({
        //     userId: ObjectId(ClientId),
        //     accessToken: Token
        // })
        // const currencySymbol = await Currencies.findOne({
        //     symbol: CurrencyId
        // })
        // const balanceData = await Balances.findOne({
        //     userId: ObjectId(ClientId),
        //     currency: ObjectId('61d45a9c72e5042aaffea2af')
        // })

        // let totalAmount = 0;
        // for (const i in BetItems) {
        //     totalAmount += BetItems[i].Amount
        // }

        // if (partner_signature !== Signature) {
        //     return res.json({
        //         ResponseCode: 1016,
        //         Description: "InvalidSignature",
        //         TimeStamp: timestamp,
        //         Signature: md5(
        //             `methodCreditBetByBatch` +
        //             `ResponseCode1016` +
        //             `DescriptionInvalidSignature` +
        //             `TimeStamp${timestamp}` +
        //             `${process.env.DG_SECRETKEY}`
        //         )
        //     })
        // } else if (PartnerId !== Number(process.env.DG_PARTNERID)) {
        //     return res.json({
        //         ResponseCode: 70,
        //         Description: "PartnerNotFound",
        //         TimeStamp: timestamp,
        //         Signature: md5(
        //             `methodCreditBetByBatch` +
        //             `ResponseCode70` +
        //             `DescriptionPartnerNotFound` +
        //             `TimeStamp${timestamp}` +
        //             `${process.env.DG_SECRETKEY}`
        //         )
        //     })
        // } else if (!accessToken) {
        //     return res.json({
        //         ResponseCode: 37,
        //         Description: "WrongToken",
        //         TimeStamp: timestamp,
        //         Signature: md5(
        //             `methodCreditBetByBatch` +
        //             `ResponseCode37` +
        //             `DescriptionWrongToken` +
        //             `TimeStamp${timestamp}` +
        //             `${process.env.DG_SECRETKEY}`
        //         )
        //     })
        // } else if (!clientId) {
        //     return res.json({
        //         ResponseCode: 22,
        //         Description: "ClientNotFound",
        //         TimeStamp: timestamp,
        //         Signature: md5(
        //             `methodCreditBetByBatch` +
        //             `ResponseCode22` +
        //             `DescriptionClientNotFound` +
        //             `TimeStamp${timestamp}` +
        //             `${process.env.DG_SECRETKEY}`
        //         )
        //     })
        // } else if (!clientToken) {
        //     return res.json({
        //         ResponseCode: 37,
        //         Description: "WrongToken",
        //         TimeStamp: timestamp,
        //         Signature: md5(
        //             `methodCreditBetByBatch` +
        //             `ResponseCode37` +
        //             `DescriptionWrongToken` +
        //             `TimeStamp${timestamp}` +
        //             `${process.env.DG_SECRETKEY}`
        //         )
        //     })
        // } else if (!balanceData || !currencySymbol) {
        //     return res.json({
        //         ResponseCode: 20,
        //         Description: "CurrencyNotExists",
        //         TimeStamp: timestamp,
        //         Signature: md5(
        //             `methodCreditBetByBatch` +
        //             `ResponseCode20` +
        //             `DescriptionCurrencyNotExists` +
        //             `TimeStamp${timestamp}` +
        //             `${process.env.DG_SECRETKEY}`
        //         )
        //     })
        // } else if (clientId?.status === false) {
        //     return res.json({
        //         ResponseCode: 13,
        //         Description: "ClientBlocked",
        //         TimeStamp: timestamp,
        //         Signature: md5(
        //             `methodCreditBetByBatch` +
        //             `ResponseCode13` +
        //             `DescriptionClientBlocked` +
        //             `TimeStamp${timestamp}` +
        //             `${process.env.DG_SECRETKEY}`
        //         )
        //     })
        // } else if (balanceData.balance < totalAmount) {
        //     if (balanceData?.balance === 0) {
        //         return res.json({
        //             ResponseCode: 1021,
        //             Description: "InvalidAmount",
        //             TimeStamp: timestamp,
        //             Signature: md5(
        //                 `methodCreditBetByBatch` +
        //                 `ResponseCode1021` +
        //                 `DescriptionInvalidAmound` +
        //                 `TimeStamp${timestamp}` +
        //                 `${process.env.DG_SECRETKEY}`
        //             )
        //         })
        //     } else {
        //         return res.json({
        //             ResponseCode: 71,
        //             Description: "LowBalance",
        //             TimeStamp: timestamp,
        //             Signature: md5(
        //                 `methodCreditBetByBatch` +
        //                 `ResponseCode71` +
        //                 `DescriptionLowBalance` +
        //                 `TimeStamp${timestamp}` +
        //                 `${process.env.DG_SECRETKEY}`
        //             )
        //         })
        //     }
        // }

        // for (const i in BetItems) {
        //     const betItem = BetItems[i]
        //     const isOrderNum = await SportsBetsV3.findOne({
        //         OrderNumber: betItem.RoundId
        //     })
        //     const isTransactionId = await SportsBetsV3.findOne({
        //         TransactionId: betItem.TransactionId
        //     })
        //     if (isOrderNum) {
        //         return res.json({
        //             ResponseCode: 68,
        //             Description: "NotAllowed",
        //             TimeStamp: timestamp,
        //             Signature: md5(
        //                 `methodCreditBetByBatch` +
        //                 `ResponseCode68` +
        //                 `DescriptionNotAllowed` +
        //                 `TimeStamp${timestamp}` +
        //                 `${process.env.DG_SECRETKEY}`
        //             )
        //         })
        //     } else if (isTransactionId) {
        //         return res.json({
        //             ResponseCode: 46,
        //             Description: "TransactionAlreadyExists",
        //             TimeStamp: timestamp,
        //             Signature: md5(
        //                 `methodCreditBetByBatch` +
        //                 `ResponseCode46` +
        //                 `DescriptionTransactionAlreadyExists` +
        //                 `TimeStamp${timestamp}` +
        //                 `${process.env.DG_SECRETKEY}`
        //             )
        //         })
        //     } else {
        //         let bData = await Balances.findOne({
        //             userId: ObjectId(ClientId),
        //             currency: ObjectId('61d45a9c72e5042aaffea2af')
        //         })
        //         let realAmount = Number(Number(betItem.Amount / currencySymbol.price).toFixed(6));
        //         let lastBalance = Number(Number(bData?.balance * currencySymbol.price).toFixed(6));

        //         const bhistory = {
        //             req: req,
        //             balanceId: balanceData._id,
        //             amount: -realAmount,
        //             type: 'v3-sports-batch-bet-settled'
        //         }

        //         const afterBal = await balanceUpdate(bhistory)
        //         const afterBalance = afterBal.balance

        //         const updateBalance = Number(Number(afterBalance * currencySymbol.price).toFixed(6))
        //         const saveData = {
        //             OrderNumber: betItem.RoundId,
        //             UserId: ClientId,
        //             BetAmount: betItem.Amount,
        //             WinAmount: betItem.OrderDetails.Bets[0].MaxWinAmount,
        //             TransactionId: betItem.TransactionId,
        //             LastBalance: lastBalance,
        //             UpdatedBalance: updateBalance,
        //             Currency: CurrencyId,
        //             BetType: 'V3-Batch-Bet',
        //             Status: "Bet",
        //             IpAddress: IpAddress || "127.0.0.1"
        //         }

        //         await new SportsBetsV3(saveData).save()
        //     }
        // }

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

export const rollBackByBatch = async (req: Request, res: Response) => {
    try {
        const {
            PartnerId,
            TimeStamp,
            Items,
            Signature
        } = req.body
        console.log(req.body, Items, "rollbackbybatch request")

        const timestamp = new Date().valueOf()
        let resItems = <any>[]
        
        for (let i in Items) {
            resItems.push({
                TransactionId: Items[i].TransactionId,
                Description: "Success",
                ResponseCode: 0,
            })
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
        // }


    } catch (error: any) {
        console.error(error, "Error ocurred in RollBackByBatch!")
    }
}

export const debitByBatch = async (req: Request, res: Response) => {
    try {
        const firstTime = Date.now();
        console.log('firstTime', firstTime)

        const {
            PartnerId,
            TimeStamp,
            Items,
            Signature
        } = req.body
        // console.log(req.body, "debitByBatch request===>")
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

        // for (const i in Items) {
        // const Item = Items[0]
        // const isClientId = await Users.findOne({ _id: ObjectId(Item.ClientId) })
        // const isCurrencyId = await Currencies.findOne({ symbol: Item.CurrencyId })
        // const isUserCurrency = await Balances.findOne({
        //     userId: ObjectId(Item.ClientId),
        //     currency: isCurrencyId ? isCurrencyId._id : ObjectId("")
        // })
        // const isOrderNum = await SportsBetsV3.findOne({ OrderNumber: Item.OrderNumber })
        // const isTransactionId = await SportsBetsV3.findOne({ TransactionId: Item.TransactionId })
        // if (!isClientId) {
        //     if (wrong_order_list.includes(Item.OrderNumber)) {
        //         resItems.push({
        //             OrderNumber: Item.OrderNumber,
        //             TransactionId: Item.TransactionId,
        //             ClientId: Item.ClientId,
        //             ResponseCode: 68,
        //             Description: "NotAllowed"
        //         })
        //     } else {
        //         resItems.push({
        //             OrderNumber: Item.OrderNumber,
        //             TransactionId: Item.TransactionId,
        //             ClientId: Item.ClientId,
        //             ResponseCode: 22,
        //             Description: "ClientNotFound",
        //         })
        //         wrong_order_list.push(Item.OrderNumber)
        //     }
        // } else if (!isOrderNum) {
        //     if (wrong_order_list.includes(Item.OrderNumber)) {
        //         resItems.push({
        //             OrderNumber: Item.OrderNumber,
        //             TransactionId: Item.TransactionId,
        //             ClientId: Item.ClientId,
        //             ResponseCode: 68,
        //             Description: "NotAllowed"
        //         })
        //     } else {
        //         resItems.push({
        //             OrderNumber: Item.OrderNumber,
        //             TransactionId: Item.TransactionId,
        //             ClientId: Item.ClientId,
        //             ResponseCode: 28,
        //             Description: "DocumentNotFound",
        //         })
        //         wrong_order_list.push(Item.OrderNumber)
        //     }
        // } else if (!isCurrencyId || !isUserCurrency) {
        //     if (wrong_order_list.includes(Item.OrderNumber)) {
        //         resItems.push({
        //             OrderNumber: Item.OrderNumber,
        //             TransactionId: Item.TransactionId,
        //             ClientId: Item.ClientId,
        //             ResponseCode: 68,
        //             Description: "NotAllowed"
        //         })
        //     } else {
        //         resItems.push({
        //             OrderNumber: Item.OrderNumber,
        //             TransactionId: Item.TransactionId,
        //             ClientId: Item.ClientId,
        //             ResponseCode: 20,
        //             Description: "CurrencyNotExists",
        //         })
        //         wrong_order_list.push(Item.OrderNumber)
        //     }
        // } else if (!transactionTypeIdList.includes(Item.TransactionTypeId)) {
        //     if (wrong_order_list.includes(Item.OrderNumber)) {
        //         resItems.push({
        //             OrderNumber: Item.OrderNumber,
        //             TransactionId: Item.TransactionId,
        //             ClientId: Item.ClientId,
        //             ResponseCode: 68,
        //             Description: "NotAllowed"
        //         })
        //     } else {
        //         resItems.push({
        //             OrderNumber: Item.OrderNumber,
        //             TransactionId: Item.TransactionId,
        //             ClientId: Item.ClientId,
        //             ResponseCode: 1013,
        //             Description: "InvalidInputParameters",
        //         })
        //         wrong_order_list.push(Item.OrderNumber)
        //     }
        // } else if (isTransactionId) {
        //     if (wrong_order_list.includes(Item.OrderNumber)) {
        //         resItems.push({
        //             OrderNumber: Item.OrderNumber,
        //             TransactionId: Item.TransactionId,
        //             ClientId: Item.ClientId,
        //             ResponseCode: 68,
        //             Description: "NotAllowed",
        //         })
        //     } else {
        //         resItems.push({
        //             OrderNumber: Item.OrderNumber,
        //             TransactionId: Item.TransactionId,
        //             ClientId: Item.ClientId,
        //             ResponseCode: 46,
        //             Description: "TransactionAlreadyExists",
        //         })
        //     }
        // } else if ((Item.TransactionTypeId === 3) && (Item.Amount > isUserCurrency.balance)) {
        //     if (wrong_order_list.includes(Item.OrderNumber)) {
        //         resItems.push({
        //             OrderNumber: Item.OrderNumber,
        //             TransactionId: Item.TransactionId,
        //             ClientId: Item.ClientId,
        //             ResponseCode: 68,
        //             Description: "NotAllowed"
        //         })
        //     } else {
        //         resItems.push({
        //             OrderNumber: Item.OrderNumber,
        //             TransactionId: Item.TransactionId,
        //             ClientId: Item.ClientId,
        //             ResponseCode: 71,
        //             Description: "LowBalance",
        //         })
        //         wrong_order_list.push(Item.OrderNumber)
        //     }
        // } else {
        //     let realAmount = Number(Number(Item.Amount / isCurrencyId.price).toFixed(6));
        //     let lastBalance = Number(Number(isUserCurrency?.balance * isCurrencyId.price).toFixed(6));
        //     let transactionType = "Win"
        //     switch (Item.TransactionTypeId) {
        //         case 2:
        //             transactionType = "Win"
        //             break;
        //         case 3:
        //             transactionType = "DebitDecrease"
        //             break;
        //         case 4:
        //             transactionType = "DebitIncrease"
        //             break;
        //         case 5:
        //             transactionType = "BoreDrawMoneyBackWin"
        //             break;
        //         case 6:
        //             transactionType = "BoreDrawMoneyBackDecrease"
        //         default:
        //             break;
        //     }
        //     if (decreaseList.includes(Item.TransactionTypeId)) {
        //         if (wrong_order_list.includes(Item.OrderNumber)) {
        //             resItems.push({
        //                 OrderNumber: Item.OrderNumber,
        //                 TransactionId: Item.TransactionId,
        //                 ClientId: Item.ClientId,
        //                 ResponseCode: 68,
        //                 Description: "NotAllowed",
        //             })
        //         } else {
        //             const bhistory = {
        //                 req: req,
        //                 balanceId: isUserCurrency._id,
        //                 amount: -realAmount,
        //                 type: `v3-sports-${transactionType}-settled`
        //             }

        //             const afterBal = await balanceUpdate(bhistory)
        //             const afterBalance = afterBal.balance
        //             const updateBalance = Number(Number(afterBalance * isCurrencyId.price).toFixed(6))
        //             const newData = {
        //                 UserId: ObjectId(Item.ClientId),
        //                 OrderNumber: Item.OrderNumber,
        //                 BetAmount: isOrderNum.BetAmount,
        //                 WinAmount: -Item.Amount,
        //                 TransactionId: Item.TransactionId,
        //                 LastBalance: lastBalance,
        //                 UpdatedBalance: updateBalance,
        //                 Currency: Item.CurrencyId,
        //                 BetType: `V3-${transactionType}-Settle`,
        //                 Status: transactionType,
        //                 IpAddress: "DG 127.0.0.1"
        //             }
        //             new SportsBetsV3(newData).save()
        //             resItems.push({
        //                 OrderNumber: Item.OrderNumber,
        //                 TransactionId: Item.TransactionId,
        //                 ClientId: Item.ClientId,
        //                 ResponseCode: 0,
        //                 Description: "Success",
        //             })
        //         }
        //     } else if (increaseList.includes(Item.TransactionTypeId)) {
        //         if (wrong_order_list.includes(Item.OrderNumber)) {
        //             resItems.push({
        //                 OrderNumber: Item.OrderNumber,
        //                 TransactionId: Item.TransactionId,
        //                 ClientId: Item.ClientId,
        //                 ResponseCode: 68,
        //                 Description: "NotAllowed",
        //             })
        //         } else {
        //             const bhistory = {
        //                 req: req,
        //                 balanceId: isUserCurrency._id,
        //                 amount: realAmount,
        //                 type: `v3-sports-${transactionType}-settled`
        //             }
        //             const afterBal = await balanceUpdate(bhistory)
        //             const afterBalance = afterBal.balance
        //             const updateBalance = Number(Number(afterBalance * isCurrencyId.price).toFixed(6))
        //             const newData = {
        //                 UserId: ObjectId(Item.ClientId),
        //                 OrderNumber: Item.OrderNumber,
        //                 BetAmount: isOrderNum.BetAmount,
        //                 WinAmount: Item.Amount,
        //                 TransactionId: Item.TransactionId,
        //                 LastBalance: lastBalance,
        //                 UpdatedBalance: updateBalance,
        //                 Currency: Item.CurrencyId,
        //                 BetType: `V3-${transactionType}-Settle`,
        //                 Status: transactionType,
        //                 IpAddress: "DG 127.0.0.1"
        //             }
        //             await new SportsBetsV3(newData).save()
        //         }
        //     }
        // }
        // }

        for (const i in Items) {
            let Item = Items[i];

            resItems.push({
                OrderNumber: Item.OrderNumber,
                TransactionId: Item.TransactionId,
                ClientId: Item.ClientId,
                ResponseCode: 0,
                Description: "Success",
            })
        }

        const currentTime = Date.now();

        console.log("execution time", currentTime - firstTime);

        setTimeout(() => {
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
        }, 200);

    } catch (error: any) {
        console.error(error, "Error ocurred in DebitByBatch!")
    }
}

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
        // const isTransactionId = await SportsBetsV3.findOne({
        //     TransactionId: TransactionId
        // })
        // const isOrderNum = await SportsBetsV3.findOne({
        //     OrderNumber: OrderNumber
        // })
        // if (partner_signature !== Signature) {
        //     return res.json({
        //         ResponseCode: 1016,
        //         Description: "InvalidSignature",
        //         TimeStamp: timestamp,
        //         TransactionId: TransactionId,
        //         Signature: md5(
        //             `methodChequeRedact` +
        //             `ResponseCode1016` +
        //             `DescriptionInvalidSignature` +
        //             `TimeStamp${timestamp}` +
        //             `TransactionId${TransactionId}` +
        //             `${process.env.DG_SECRETKEY}`
        //         )
        //     })
        // } else if (PartnerId !== Number(process.env.DG_PARTNERID)) {
        //     return res.json({
        //         ResponseCode: 70,
        //         Description: "PartnerNotFound",
        //         TimeStamp: timestamp,
        //         TransactionId: TransactionId,
        //         Signature: md5(
        //             `methodChequeRedact` +
        //             `ResponseCode70` +
        //             `DescriptionPartnerNotFound` +
        //             `TimeStamp${timestamp}` +
        //             `TransactionId${TransactionId}` +
        //             `${process.env.DG_SECRETKEY}`
        //         )
        //     })
        // } else if (isTransactionId) {
        //     return res.json({
        //         ResponseCode: 46,
        //         Description: "TransactionAlreadyExists",
        //         TimeStamp: timestamp,
        //         TransactionId: TransactionId,
        //         Signature: md5(
        //             `methodChequeRedact` +
        //             `ResponseCode46` +
        //             `DescriptionTransactionAlreadyExists` +
        //             `TimeStamp${timestamp}` +
        //             `TransactionId${TransactionId}` +
        //             `${process.env.DG_SECRETKEY}`
        //         )
        //     })
        // } else if (!isOrderNum || isOrderNum.Status === "RollBack") {
        //     return res.json({
        //         ResponseCode: 28,
        //         Description: "DocumentNotFound ",
        //         TimeStamp: timestamp,
        //         TransactionId: TransactionId,
        //         Signature: md5(
        //             `methodChequeRedact` +
        //             `ResponseCode28` +
        //             `DescriptionDocumentNotFound ` +
        //             `TimeStamp${timestamp}` +
        //             `TransactionId${TransactionId}` +
        //             `${process.env.DG_SECRETKEY}`
        //         )
        //     })
        // } else if (
        //     isOrderNum?.Status === "Win" ||
        //     isOrderNum?.Status === "DebitIncrease" ||
        //     isOrderNum?.Status === "DebitDecrease"
        // ) {
        //     return res.json({
        //         ResponseCode: 68,
        //         Description: "NotAllowed",
        //         TimeStamp: timestamp,
        //         TransactionId: TransactionId,
        //         Signature: md5(
        //             `methodChequeRedact` +
        //             `ResponseCode68` +
        //             `DescriptionNotAllowed` +
        //             `TimeStamp${timestamp}` +
        //             `TransactionId${TransactionId}` +
        //             `${process.env.DG_SECRETKEY}`
        //         )
        //     })
        // } else {
        //     await SportsBetsV3.findOneAndUpdate(
        //         { OrderNumber: OrderNumber },
        //         {
        //             WinAmount: PossibleWin,
        //             TransactionId: TransactionId
        //         }
        //     )
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
        // }
    } catch (error: any) {
        console.error(error, "Error ocurred in ChequeRedact!")
    }
}