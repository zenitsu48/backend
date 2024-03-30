import * as request from 'request';
import * as moment from 'moment-timezone';
import * as crypto from 'crypto'
import { Request, Response, query } from 'express';
import { formatUnits } from '@ethersproject/units';
import { balanceUpdate, NumberFix, ObjectId } from '../base';
import { BalanceHistories, Balances, Currencies, Payments, Users } from '../../models';
import { ArbitrumWeb3, AvaxWeb3, BscWeb3, EthereumWeb3, PolygonWeb3, PuppyWeb3, } from './ethereum';
import sendTelegramAlert from '../../sendAlert';
import { getSOLbalance, getTxnSolana } from './solana';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { symbol } from 'joi';

const depositAddress = process.env.E_D_PUBLIC_ADDRESS as string;
const widthrawAddress = process.env.E_W_PUBLIC_ADDRESS as string;
const notificationsKey = process.env.NOWPAY_IPNSEC as string;
const solanaAddress = process.env.S_W_PUBLIC_ADDRESS as string;

//When the user creates the payment in nowpayments
export const createNowpay = async (req: Request, res: Response) => {
    try {
        let { userId, currencyId, currency, amount } = req.body;

        const exchangeRate:any = await getExchangeRate(currency, "usd");

        if (exchangeRate.rate) {
            const priceAmount = amount * exchangeRate.rate;
            const priceCurrency = 'usd'; // Desired currency

            const symbol:any = await getMatchedSymbolFromPayCurrency(currency);

            const params = {
                price_amount: priceAmount,
                price_currency: "usd",
                pay_currency: currency,
                ipn_callback_url: `${process.env.NOWPAY_CALLBACK}`
            };
            const options = {
                method: 'POST',
                url: `${process.env.NOWPAY_ENDPOINT}/v1/payment` as string,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': `${process.env.NOWPAY_APIKEY}`
                },
                json: true,
                body: params
            };
    
            request(options, async (error: any, response: any, body: any) => {      
                console.log(body, "body")
                if (error) {
                    console.log(error)
                    return res.json("error")
                } else {
                    const { payment_id, pay_address, pay_amount } = body;

                    console.log('userId', userId);
                    console.log('currencyId', currencyId);

                    await Balances.updateOne({ userId: ObjectId(userId), currencyId: ObjectId(currencyId) }, { symbol: symbol })
                    const bdata = await Balances.findOne({ userId: ObjectId(userId), currencyId: ObjectId(currencyId) });
                    const payment = await Payments.findOneAndUpdate(
                        { paymentId: payment_id },
                        {
                            userId,
                            balanceId: bdata._id,
                            currencyId,
                            currency,
                            amount: pay_amount,
                            pay_address,
                            status: -3,
                            method: 1,
                            ipn_type: 'deposit',
                            response: 'waiting'
                        },
                        { upsert: true, new: true }
                    );

                    return res.json(payment)
                }
            })
        }
    } catch (e) {
        console.log(e, "createNowpay")
    }
}

//When the user deposits in nowpayments
export const depositNowpay = async (req: Request, res: Response) => {
    try {
        const params = req.body;
        const nowpaymentSig = req.headers['x-nowpayments-sig'];
        const hmac = crypto.createHmac('sha512', notificationsKey);
        hmac.update(JSON.stringify(params, Object.keys(params).sort()));
                const signature = hmac.digest('hex');
        // if (signature == nowpaymentSig) {
            let { payment_id, pay_address, pay_amount, pay_currency, payment_status } = params;

            const payment = await Payments.findOne({ paymentId: payment_id, status_text: payment_status });
            let status = -3;
            if (!payment) {
                switch (payment_status) {
                    case 'finished':
                        status = 3;
                        const symbol = await getMatchedSymbolFromPayCurrency(pay_currency);
                        const balance = await Balances.findOne({ userId: payment.userId, currencyId: payment.currencyId, symbol: symbol })

                        console.log("finished request", req)

                        await balanceUpdate({
                            req,
                            balanceId: balance._id,
                            amount: pay_amount,
                            type: 'deposit-nowpayment'
                        });
                        break;
                    case 'failed':
                        status = -4;
                        break;
                    case 'refunded':
                        status = -5
                        break;
                    case 'expired':
                        status = -6;
                        break;
                    default:
                        break;
                }
                await Payments.updateOne({ paymentId: payment_id }, { status: status, status_text: payment_status });
            }
        // } else {
        //     console.log('depositNowpay signature error!')
        // }
    } catch (e) {
        console.log(e, "error")
    }
}

export const getPaymentCurrencyInfo = async (req: Request, res: Response) => {
    try {
        const { currency } = req.body;
        
        const currencies = await getAvailableCurrencyInfo();
        
        if(currencies) {
            const matchedItem = Array.from(currencies).filter((item : any) => item.currency == currency.payment_currency);
            if(matchedItem[0]) {
                const min_amount = await getMiniumPayAmount(currency.payment_currency);
        
                res.json({'min_amount': min_amount});
            } else {
                return res.json({error : "Coin no supported"});
            }
        } 
    } catch(e) {
        console.log(e, "getMiniumPayAmount")
    }
}

export const getTxResult = async (req: Request, res: Response) => {
    const { network, txn_id } = req.body;
    let EthWeb3: any;

    switch (network) {
        case 'ethereum':
            EthWeb3 = EthereumWeb3;
            break;
        case 'bsc':
            EthWeb3 = BscWeb3;
            break;
        case 'arbitrum':
            EthWeb3 = ArbitrumWeb3;
            break;
        case 'avax':
            EthWeb3 = AvaxWeb3;
            break;
        case 'polygon':
            EthWeb3 = PolygonWeb3;
            break;
        case 'puppy':
            EthWeb3 = PuppyWeb3;

        default:
            break;
    }

    const response = (await EthWeb3.eth.getTransaction(txn_id)) as any;
    console.log(response, "res")
}

//when the user deposits using metamask
export const depositEthereum = async (req: Request, res: Response) => {
    try {
        const { userId, balanceId, currencyId, txn_id, amounti, address, from } = req.body;
        const currency = await Currencies.findById(currencyId);
        console.log(req.body, "req.body")
        let EthWeb3: any;

        switch (currency.network) {
            case 'ethereum':
                EthWeb3 = EthereumWeb3;
                break;
            case 'bsc':
                EthWeb3 = BscWeb3;
                break;
            case 'arbitrum':
                EthWeb3 = ArbitrumWeb3;
                break;
            case 'avax':
                EthWeb3 = AvaxWeb3;
                break;
            case 'polygon':
                EthWeb3 = PolygonWeb3;
                break;
            case 'puppy':
                EthWeb3 = PuppyWeb3;

            default:
                break;
        }

        const balances = await Balances.findOne({
            userId: ObjectId(userId),
            _id: ObjectId(balanceId),
            currency: ObjectId(currencyId)
        });
        if (!balances) {
            return res.status(400).json('Invalid field!');
        }
        const amount = amounti / 10 ** currency.decimals;
        const result = await Payments.findOne({ txn_id });
        if (result) return res.json({});
        const payment = await Payments.findOneAndUpdate(
            { txn_id },
            {
                userId,
                balanceId,
                currencyId: currencyId,
                currency: currency.payment,
                amount,
                address,
                status: 1,
                method: 0,
                ipn_type: 'deposit',
                status_text: 'deposited',
                txn_id
            },
            { upsert: true, new: true }
        );
        res.json(payment);
        let timeout = 0;
        let timer = null as any;
        async function timerfunc() {
            const paymentResult = await Payments.findById(ObjectId(payment._id));
            if (paymentResult.status === 100 || paymentResult.status === -1) {
                return clearTimeout(timer);
            } else {
                const responseReceipt = await EthWeb3.eth.getTransactionReceipt(txn_id);
                console.log(responseReceipt, "responseReceipt")
                if (!responseReceipt) {
                } else if (!responseReceipt.status) {
                    await Payments.updateOne({ _id: payment._id }, { status: -1, status_text: 'canceled' });
                    return clearTimeout(timer);
                } else {
                    const response = (await EthWeb3.eth.getTransaction(txn_id)) as any;
                    console.log(response, "response")
                    console.log(address === 'ether',
                        amounti === response.value,
                        from.toLowerCase() === response.from.toLowerCase(),
                        response.to.toLowerCase() === depositAddress?.toLowerCase())
                    if (response?.input === '0x') {
                        if (
                            address === 'ether' &&
                            amounti === response.value &&
                            from.toLowerCase() === response.from.toLowerCase() &&
                            response.to.toLowerCase() === depositAddress?.toLowerCase()
                        ) {
                            await Payments.findByIdAndUpdate(ObjectId(payment._id), { status: 100, status_text: 'confirmed' }, { new: true });
                            await balanceUpdate({
                                req,
                                balanceId,
                                amount,
                                type: 'deposit-metamask'
                            });
                            return clearTimeout(timer);
                        } else {
                            return clearTimeout(timer);
                        }
                    } else {
                        const erc20TransferABI = [
                            { type: 'address', name: 'receiver' },
                            { type: 'uint256', name: 'amount' }
                        ];
                        const decoded = EthWeb3.eth.abi.decodeParameters(erc20TransferABI, response.input.slice(10));

                        if (
                            amounti === decoded.amount &&
                            from.toLowerCase() === response.from.toLowerCase() &&
                            address.toLowerCase() === response.to.toLowerCase() &&
                            decoded.receiver.toLowerCase() === depositAddress?.toLowerCase()
                        ) {
                            const bcbCurrency = await Currencies.findOne({ _id: ObjectId(currencyId) });
                            const bcbUser = await Users.findOne({ _id: ObjectId(userId) })
                            if (bcbCurrency?.symbol === 'BCB' && bcbUser.rReferral) {
                                const bcbDeposit = await Payments.findOne({ userId, currencyId, ipn_type: 'deposit', status_text: 'confirmed' })
                                if (!bcbDeposit) {
                                    const bonus = (amount / 10) > 1000 ? 1000 : (amount / 10)
                                    await balanceUpdate({
                                        req,
                                        balanceId,
                                        amount: bonus,
                                        type: 'referral-bonus'
                                    });
                                }
                            }

                            await Payments.findByIdAndUpdate(ObjectId(payment._id), { status: 100, status_text: 'confirmed' }, { new: true });
                            await balanceUpdate({
                                req,
                                balanceId,
                                amount,
                                type: 'deposit-metamask'
                            });

                            return clearTimeout(timer);
                        } else {
                            return clearTimeout(timer);
                        }
                    }
                }
            }
            timeout++;
            timer = setTimeout(timerfunc, 10000);
            if (timeout === 360) {
                return clearTimeout(timer);
            }
        }
        timer = setTimeout(timerfunc, 10000);
    } catch (e) {
        console.log(e)
    }
};

export const depositSolana = async (req: Request, res: Response) => {
    const { userId, balanceId, currencyId, txn_id, address, from } = req.body;
    const currency: any = await Currencies.findById(currencyId);
    const balances = await Balances.findOne({
        userId: ObjectId(userId),
        _id: ObjectId(balanceId),
        currency: ObjectId(currencyId)
    });
    if (!balances) {
        return res.status(400).json('Invalid field!');
    }
    const result = await Payments.findOne({ txn_id });
    if (result) return res.json({});
    const payment: any = await Payments.findOneAndUpdate(
        { txn_id },
        {
            userId,
            balanceId,
            currencyId: currencyId,
            currency: currency.payment,
            address,
            status: 1,
            method: 0,
            ipn_type: 'deposit',
            status_text: 'deposited',
            txn_id
        },
        { upsert: true, new: true }
    );
    res.json(payment);
    let timeout = 0;
    let timer = null as any;
    async function timerfunc() {
        const paymentResult: any = await Payments.findById(ObjectId(payment._id));
        if (paymentResult.status === 100 || paymentResult.status === -1) {
            return clearTimeout(timer);
        } else {
            try {
                const res = await getTxnSolana(txn_id);
                if (!res.status) {
                    await Payments.updateOne({ _id: payment._id }, { status: -1, status_text: 'canceled' });
                    return clearTimeout(timer);
                } else {
                    var tResult = res.data.result;
                    if (tResult) {
                        if (tResult.transaction.message.accountKeys[2] == '11111111111111111111111111111111') {
                            const amount =
                                (tResult.meta.preBalances[0] - tResult.meta.postBalances[0] - tResult.meta.fee) / LAMPORTS_PER_SOL;
                            const fromAcc = tResult.transaction.message.accountKeys[0].toLowerCase();
                            const receiverAcc = tResult.transaction.message.accountKeys[1].toLowerCase();
                            if (from.toLowerCase() == fromAcc && solanaAddress.toLowerCase() == receiverAcc) {
                                await Payments.findByIdAndUpdate(
                                    ObjectId(payment._id),
                                    { status: 100, status_text: 'confirmed', amount },
                                    { new: true }
                                );
                                await balanceUpdate({
                                    req,
                                    balanceId,
                                    amount,
                                    type: 'deposit-solana'
                                });
                                return clearTimeout(timer);
                            } else {
                                return clearTimeout(timer);
                            }
                        } else {
                            const preTokenB = tResult.meta.preTokenBalances;
                            const postTokenB = tResult.meta.postTokenBalances;
                            const amount = Math.abs(preTokenB[0].uiTokenAmount.uiAmount - postTokenB[0].uiTokenAmount.uiAmount);
                            const fromAcc = preTokenB[0].owner.toLowerCase();
                            const tokenMintAcc = preTokenB[0].mint.toLowerCase();
                            const receiverAcc = postTokenB[1].owner.toLowerCase();
                            if (
                                (from.toLowerCase() == fromAcc || from.toLowerCase() == receiverAcc) &&
                                address.toLowerCase() == tokenMintAcc &&
                                (solanaAddress.toLowerCase() == fromAcc || solanaAddress.toLowerCase() == receiverAcc)
                            ) {
                                await Payments.findByIdAndUpdate(
                                    ObjectId(payment._id),
                                    { status: 100, status_text: 'confirmed', amount },
                                    { new: true }
                                );
                                await balanceUpdate({
                                    req,
                                    balanceId,
                                    amount,
                                    type: 'deposit-solana'
                                });
                                return clearTimeout(timer);
                            } else {
                                return clearTimeout(timer);
                            }
                        }
                    }
                }
            } catch (error) {
                console.log(error, "err")
            }
        }
        timeout++;
        timer = setTimeout(timerfunc, 10000);
        if (timeout === 360) {
            return clearTimeout(timer);
        }
    }
    timer = setTimeout(timerfunc, 10000);
};

//when the user requests the withdraw
export const withdrawal = async (req: Request, res: Response) => {
    const { userId, balanceId, currencyId, address, amount, method } = req.body;
    const currency = await Currencies.findById(ObjectId(currencyId));
    if (Number(amount) < 0) {
        return res.status(400).json('Your have to input the exact amount!');
    }
    if (!currency) {
        return res.status(400).json('Invalid field!');
    } else if (!currency.withdrawal) {
        return res.status(400).json('Withdrawal disabled!');
    }
    const _balance = await Balances.findOne({
        userId: ObjectId(userId),
        _id: ObjectId(balanceId),
        currency: ObjectId(currencyId)
    });
    if (!_balance || _balance.balance <= 0 || _balance.balance < Number(amount)) {
        return res.status(400).json('Your balance is not enough!');
    }
    const type = 'withdrawal-metamask';
    await balanceUpdate({ req, balanceId, amount: amount * -1, type });
    await Payments.create({
        userId,
        balanceId,
        currencyId: currency._id,
        currency: currency.payment,
        amount,
        address,
        method,
        status: -2,
        status_text: 'pending',
        ipn_type: 'withdrawal'
    });
    const msg = `withdraw request ${amount} BCB from ${address}`;
    console.log(msg, "msg")
    sendTelegramAlert(msg);
    return res.json('Succeed!');
};

//when the admin canceled the withdraw
export const cancelWithdrawal = async (req: Request, res: Response) => {
    const { _id } = req.body;
    const iswithdraw = await Payments.findOne({ _id: ObjectId(_id), status: -2 });
    if (!iswithdraw) {
        return res.json(false);
    } else {
        try {
            const payment = await Payments.findOneAndUpdate({ _id: ObjectId(_id) }, { status: -1, status_text: 'canceled' });
            await balanceUpdate({
                req,
                balanceId: payment.balanceId,
                amount: payment.amount,
                type: 'withdrawal-metamask-canceled'
            });
            return res.json(true);
        } catch (e) {
            return res.json(false)
        }
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    const { userId, pageIndex } = req.body;
    let pageSize = 10;

    const skip = (pageIndex) * pageSize;
    const limit = pageSize;

    const result = await Payments.find({
        userId: ObjectId(userId),
        status: { $ne: 0 }
    }).skip(skip).limit(limit).populate('currencyId').sort({ createdAt: -1 });

    const totalCount = await Payments.find({
        userId: ObjectId(userId),
        status: { $ne: 0 }
    }).populate('currencyId').count();

    return res.json({data: result, totalCount : totalCount, pageSize: 10});
};

export const getCurrencies = async (req: Request, res: Response) => {
    const result = await Currencies.find({ status: true }).sort({
        order: 1,
        createdAt: 1
    });
    return res.json(result);
};

export const getBalances = async (req: Request, res: Response) => {
    const { userId } = req.body;
    const result = await Balances.find({
        userId: ObjectId(userId),
        disabled: false
    }).sort({ status: -1, balance: -1 });
    return res.json(result);
};

export const addRemoveCurrency = async (req: Request, res: Response) => {
    const userId = ObjectId(req.body.userId);
    const currency = ObjectId(req.body.currency);
    const data = await Balances.findOne({ userId, currency });
    if (data) {
        const result = await Balances.findOneAndUpdate({ userId, currency }, { disabled: !data.disabled, status: false }, { new: true });
        const count = await Balances.countDocuments({
            userId,
            disabled: false,
            status: true
        });
        if (count === 0) {
            await Balances.findOneAndUpdate({ userId, disabled: false }, { status: true });
        }
        return res.json(result);
    } else {
        const result = await Balances.create({
            userId,
            currency,
            balance: 0,
            status: false,
            disabled: false
        });
        return res.json(result);
    }
};

export const useCurrency = async (req: Request, res: Response) => {
    const { userId, currency } = req.body;
    await Balances.updateMany({ userId: ObjectId(userId) }, { status: false });
    const result = await Balances.findOneAndUpdate({ userId: ObjectId(userId), currency: ObjectId(currency) }, { status: true });
    return res.json(result);
};


export const updateBalance = async (req: Request, res: Response) => {
    const { balanceId, amount, type } = req.body;
    if (amount < 0) {
        return res.status(400).json('Please input the exact amount!');
    }
    const balances = await Balances.findById(ObjectId(balanceId));
    if (type === 'withdrawal' && balances.balance < amount) {
        return res.status(400).json('Balances not enough!');
    }
    if (type === 'withdrawal') {
        await balanceUpdate({
            req,
            balanceId,
            amount: amount * -1,
            type: `${type}-admin`
        });
        await Payments.create({
            currencyId: balances.currency._id,
            currency: balances.currency.symbol,
            userId: balances.userId,
            balanceId,
            amount,
            address: 'admin',
            status: 2,
            method: 3,
            ipn_type: type,
            status_text: 'confirmed',
            txn_id: 'admin'
        });
    } else {
        await balanceUpdate({ req, balanceId, amount, type: `${type}-admin` });
        await Payments.create({
            currencyId: balances.currency._id,
            currency: balances.currency.symbol,
            userId: balances.userId,
            balanceId,
            amount,
            address: 'admin',
            status: 100,
            method: 3,
            ipn_type: type,
            status_text: 'confirmed',
            txn_id: 'admin'
        });
    }
    return res.json({ status: true });
};

export const getAdminBalance = async (req: Request, res: Response) => {
    const address1 = depositAddress;
    const address2 = widthrawAddress;

    const currencies = await Currencies.find({ status: true }).select({
        _id: 0,
        abi: 1,
        symbol: 1,
        price: 1,
        contractAddress: 1,
        type: 1,
        payment: 1,
        network: 1,
        icon: 1
    });
    let metamask = {} as any;
    let mtotal1 = 0;
    let mtotal2 = 0;
    for (const i in currencies) {
        const currency = currencies[i];
        if (currency.type === 2 || currency.type === 0) {
            if (currency.network === 'ethereum') {
                if (currency.contractAddress !== 'ether') {
                    const contract = new EthereumWeb3.eth.Contract(currency.abi, currency.contractAddress);
                    const balance1 = await contract.methods.balanceOf(address1).call();
                    const balance2 = await contract.methods.balanceOf(address2).call();
                    const decimals = await contract.methods.decimals().call();
                    const amount1 = Number(formatUnits(balance1, decimals));
                    const amount2 = Number(formatUnits(balance2, decimals));
                    metamask[currency.symbol] = {
                        balance1: amount1,
                        balance2: amount2,
                        usdbalance1: amount1 * currency.price,
                        usdbalance2: amount2 * currency.price
                    };
                    mtotal1 += amount1 * currency.price;
                    mtotal2 += amount2 * currency.price;
                } else {
                    const balance1 = await EthereumWeb3.eth.getBalance(address1);
                    const balance2 = await EthereumWeb3.eth.getBalance(address2);
                    const amount1 = Number(formatUnits(balance1, 18));
                    const amount2 = Number(formatUnits(balance2, 18));
                    metamask[currency.symbol] = {
                        balance1: amount1,
                        balance2: amount2,
                        usdbalance1: amount1 * currency.price,
                        usdbalance2: amount2 * currency.price
                    };
                    mtotal1 += amount1 * currency.price;
                    mtotal2 += amount2 * currency.price;
                }
            }
        }
    }
    return res.json({ metamask, mtotal1, mtotal2 });
};

export const getPaymentMethod = async (req: Request, res: Response) => {
    const result = await Currencies.find({ status: true }).sort({ order: 1 }).select({
        _id: 0,
        icon: 1,
        name: 1,
        officialLink: 1
    });
    return res.json(result);
};

const getExchangeRate = async (currency_from: string, currency_to: string): Promise<any> => {
    return new Promise((resolve) => {
        const params: {[key : string]: any} = {
            amount: 1,
            currency_from: currency_from,
            currency_to: currency_to,
        };

        const queryString = Object.keys(params).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');

        const options = {
            method: 'GET',
            url: `${process.env.NOWPAY_ENDPOINT}/v1/estimate?` + queryString,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': `${process.env.NOWPAY_APIKEY}`
            },
            json: true,
            body: params
        };

        request(options, async (error: any, response: any, body: any) => {
            if (error) {
                resolve({error : error});
            } else {
                resolve({rate: body.estimated_amount});
            }
        });
    });
}

export const getMatchedSymbolFromPayCurrency = async (currency: string) => {
    console.log('currency', currency);

    const result = await Currencies.findOne({ payment_currency: currency });

    return result.symbol;
}

export const getMiniumPayAmount = async (currency: string): Promise<any> => {
    return new Promise((resolve) => {
        const params: {[key : string]: any} = {
            currency_from: currency,
            currency_to: 'usd',
            is_fixed_rate :'true',
            is_fee_paid_by_user : 'true',
        };

        const queryString = Object.keys(params).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');

        const options = {
            method: 'GET',
            url: `${process.env.NOWPAY_ENDPOINT}/v1/min-amount?` + queryString,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': `${process.env.NOWPAY_APIKEY}`
            },
            json: true,
            body: params
        };

        request(options, async (error: any, response: any, body: any) => {
            if (error) {
                console.log('error', error);
                resolve({error : error});
            } else {
                resolve(body.min_amount);
            }
        });
    });
}

export const getAvailableCurrencyInfo = async (): Promise<any> => {
    return new Promise((resolve) => {
        const params: {[key : string]: any} = {
            fixed_rate: true
        };

        const queryString = Object.keys(params).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');

        const options = {
            method: 'GET',
            url: `${process.env.NOWPAY_ENDPOINT}/v1/currencies?` + queryString,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': `${process.env.NOWPAY_APIKEY}`
            },
            json: true,
            body: params
        };

        request(options, async (error: any, response: any, body: any) => {
            if (error) {
                resolve({error : error});
            } else {
                resolve(body.currencies);
            }
        });
    });
}