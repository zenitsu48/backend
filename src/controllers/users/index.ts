import * as md5 from 'md5';
import * as randomString from 'randomstring';
import { bufferToHex } from 'ethereumjs-util';
import { Request, Response } from 'express';
import { recoverPersonalSignature } from 'eth-sig-util';
import { Users, Sessions, Permissions, Balances, Currencies, LoginHistories, BalanceHistories, Payments, Referrals, Messages } from '../../models';
import {
    signAccessToken,
    ObjectId,
    getIPAddress,
    sendEmail,
    getForgotPasswordHtml,
    getSessionTime,
    // usernameLimiter,
    maxFailsByLogin,
    // checkLimiter,
    // ipLimiter,
    getUserBalance
} from '../base';
import { sign } from 'tweetnacl';
import { decode } from 'bs58';
import io from '../../socket';
import socket from '../../socket';

const userInfo = (user: any) => {
    return {
        _id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        cryptoAccount: user.cryptoAccount,
        publicAddress: user.publicAddress,
        oddsformat: user.oddsformat,
        iReferral: user.iReferral,
        rReferral: user.rReferral
    };
};

export const signin = async (req: Request, res: Response) => {
    const { password, email } = req.body;
    // const rlResIp = await ipLimiter.get(req.ip);
    // const rlResUsername = await usernameLimiter.get(email);
    // if (rlResUsername !== null && rlResUsername.consumedPoints > maxFailsByLogin) {
    //     const retrySecs = Math.round(rlResUsername.msBeforeNext / 1000);
    //     res.set('Retry-After', String(retrySecs));
    //     return res.status(429).send('Too Many Requests.');
    // } else if (rlResIp !== null && rlResIp.consumedPoints > maxFailsByLogin) {
    //     const retrySecs = Math.round(rlResIp.msBeforeNext / 1000) || 1;
    //     res.set('Retry-After', String(retrySecs));
    //     return res.status(429).send('Too Many Requests.');
    // } else {

    const user = await Users.findOne({
        $or: [
            {
                username: {
                    $regex: new RegExp('^' + email.toLowerCase(), 'i')
                }
            },
            {
                email: {
                    $regex: new RegExp('^' + email.toLowerCase(), 'i')
                }
            }
        ]
    });
    if (!user) {
        // checkLimiter(req, res);
        return res.status(400).json(`We can't find with this email or username.`);
    } else if (!user.validPassword(password, user.password)) {
        // checkLimiter(req, res);
        return res.status(400).json('Passwords do not match.');
    } else if (!user.status) {
        // checkLimiter(req, res);
        return res.status(400).json('Account has been blocked.');
    } else {
        const session = signAccessToken(req, res, user._id);
        const LoginHistory = new LoginHistories({
            userId: user._id,
            ...session,
            data: req.body
        });
        await LoginHistory.save();
        await Sessions.updateOne({ userId: user._id }, session, {
            new: true,
            upsert: true
        });
        const userData = userInfo(user);
        const sessionData = {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken
        };
        // await usernameLimiter.delete(email);
        const balance = await getUserBalance(user._id);
        return res.json({
            status: true,
            session: sessionData,
            user: userData,
            balance
        });
    }
    // }
};

export const signup = async (req: Request, res: Response) => {
    try {
        const user = req.body;

        const ip = getIPAddress(req);
        // const ipCount = await Users.countDocuments({ ip: { '$regex': ip.ip, '$options': 'i' } })
        // if (ipCount > 1) {
        //     return res.status(400).json(`Account limited.`)
        // }
        const emailExists = await Users.findOne({
            email: { $regex: new RegExp('^' + user.email.toLowerCase(), 'i') }
        });
        if (emailExists) {
            return res.status(400).json(`${user.email} is used by another account.`);
        }
        const usernameExists = await Users.findOne({
            username: { $regex: new RegExp('^' + user.username.toLowerCase(), 'i') }
        });
        if (usernameExists) {
            return res.status(400).json(`An account named '${user.username}' already exists.`);
        }
        const currency = await Currencies.findOne({ symbol: process.env.DEFAULT_CURRENCY });
        if (!currency) {
            return res.status(400).json('error');
        }
        const iReferral = randomString.generate(10);
        let newuser = new Users({ ...user, ...ip, iReferral });
        let balance = new Balances({ userId: newuser._id, currency: currency._id });
        const permission = await Permissions.findOne({ title: 'player' });
        newuser.password = newuser.generateHash(user.password);
        newuser.permissionId = permission._id;
        newuser.status = true;

        const u_result = await newuser.save();
        const b_result = await balance.save();
        if (!u_result || !b_result) {
            return res.status(400).json('error');
        } else {
            return res.json('You have successfully created in as a user to BCB bets.');
        }
    } catch (e) {
        console.log("===error===")
        console.log(req.body)
        console.log(e)
    }
};

export const signout = async (req: Request, res: Response) => {
    const { userId } = req.body;
    const result = await Sessions.deleteMany({ userId });
    res.json(result);
};

export const checkAddress = async (req: Request, res: Response) => {
    const { publicAddress } = req.body;
    const user = await Users.findOne({
        publicAddress: {
            $regex: new RegExp('^' + publicAddress.toLowerCase(), 'i')
        }
    });
    if (!user) {
        return res.json({ status: false, message: `Please sign up first.` });
    } else if (!user.status) {
        return res.status(400).json('Account has been blocked.');
    }
    return res.json({
        status: true,
        user: { publicAddress: user.publicAddress, nonce: user.nonce }
    });
};

// user signup function
export const joinAddress = async (req: Request, res: Response) => {
    try {
        const { publicAddress, rReferral, defaultCurrency } = req.body;
        const ip = getIPAddress(req);
        // const ipCount = await Users.countDocuments({ ip: { '$regex': ip.ip, '$options': 'i' } })
        // if (ipCount > 1) {
        //     return res.status(400).json(`Account limited.`)
        // }
        const exists = await Users.findOne({
            publicAddress: {
                $regex: new RegExp('^' + publicAddress.toLowerCase(), 'i')
            }
        });
        if (exists) {
            return res.status(400).json(`${publicAddress} is used by another account.`);
        }

        // let referrals = await Referrals.findOne({ active: true });
        // if (!referrals) {
        //     let newreferral = new Referrals({
        //         active: true,
        //         bonus: 1000,
        //         percent: 5
        //     })
        //     await newreferral.save();
        //     referrals = newreferral;
        //     if (!newreferral) {
        //         return res.status(400).json('error');
        //     }
        // }

        const iReferral = randomString.generate(10);
        let newuser = new Users({
            publicAddress,
            nonce: Date.now(),
            username: randomString.generate(10),
            email: publicAddress,
            iReferral,
            rReferral,
            ...ip
        });
        let dcurrency = process.env.DEFAULT_CURRENCY;
        if (defaultCurrency === 'SOL') {
            dcurrency = 'SOL'
        }
        const currency = await Currencies.findOne({ symbol: dcurrency });
        const rcurrency = await Currencies.findOne({ symbol: 'BCB' });
        if (!currency || !rcurrency) {
            return res.status(400).json('error');
        }
        let balance = new Balances({ userId: newuser._id, currency: currency._id });
        const b_result = await balance.save();

        // let rbalance = new Balances({ userId: newuser._id, currency: rcurrency._id, status: process.env.DEFAULT_CURRENCY == 'BCB' ? true : false });
        // if (rReferral) {
        //     console.log(rReferral, "rReferral")
        //     rbalance.balance = referrals.bonus;
        //     const payment = await Payments.create({
        //         userId: newuser._id,
        //         balanceId: rbalance._id,
        //         currencyId: rcurrency._id,
        //         currency: rcurrency.payment,
        //         status: 100,
        //         method: 0,
        //         amount: referrals.bonus,
        //         address: 'admin',
        //         ipn_type: 'referral bonus',
        //         status_text: 'confirmed'
        //     });
        //     if (!payment) {
        //         return res.status(400).json('error');
        //     }

        //     const oUser = await Users.findOne({ iReferral: rReferral });
        //     if (oUser) {
        //         oUser.rNumber += 1;
        //         await oUser.save()
        //     }
        // }

        const permission = await Permissions.findOne({ title: 'player' });
        newuser.permissionId = permission._id;
        newuser.status = true;
        const u_result = await newuser.save();
        // const rb_result = await rbalance.save();
        if (!u_result || !b_result) {
            return res.status(400).json('error');
        } else {
            return res.json('You have successfully created in as a user to BCB bets.');
        }
    } catch (e) {
        console.log(e, 'error')
    }
};

export const signinMetamask = async (req: Request, res: Response) => {
    try {
        const { signature, publicAddress } = req.body;
        const user = await Users.findOne({
            publicAddress: {
                $regex: new RegExp('^' + publicAddress.toLowerCase(), 'i')
            }
        });
        if (!user) {
            return res.status(400).json(`User with publicAddress ${publicAddress} is not found.`);
        } else if (!user.status) {
            return res.status(400).json('Account has been blocked.');
        }
        const msg = `${process.env.SIGNIN_MESSAGE}: ${user.nonce}`;
        const msgBufferHex = bufferToHex(Buffer.from(msg, 'utf8'));
        const address = recoverPersonalSignature({
            data: msgBufferHex,
            sig: signature
        });
        if (address.toLowerCase() !== publicAddress.toLowerCase()) {
            return res.status(400).json('Signature verification failed.');
        }
        user.nonce = Date.now();
        const result = await user.save();
        if (!result) {
            return res.status(400).json('error');
        }
        const session = signAccessToken(req, res, user._id);
        const LoginHistory = new LoginHistories({
            userId: user._id,
            ...session,
            data: req.body
        });
        await LoginHistory.save();
        await Sessions.findOneAndUpdate({ userId: user._id }, session, {
            new: true,
            upsert: true
        });
        const userData = userInfo(user);
        const sessionData = {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken
        };
        const balance = await getUserBalance(user._id);

        return res.json({
            status: true,
            session: sessionData,
            user: userData,
            balance,
            adminAddress: process.env.E_D_PUBLIC_ADDRESS,
            ethAdminAddress: process.env.E_D_PUBLIC_ADDRESS,
            solAdminAddress: process.env.S_W_PUBLIC_ADDRESS
        });
    } catch (e) {
        console.log(e)
        return res.status(400).json('error');
    }

};

export const signinSolana = async (req: Request, res: Response): Promise<void> => {
    try {
        const { signature, publicAddress } = req.body;
        const user = await Users.findOne({
            publicAddress: {
                $regex: new RegExp('^' + publicAddress.toLowerCase(), 'i')
            }
        });
        if (!user) {
            res.status(400).json(`User with publicAddress ${publicAddress} is not found.`);
            return;
        } else if (!user.status) {
            res.status(400).json('Account has been blocked.');
            return;
        }
        const msg = `${process.env.SIGNIN_MESSAGE}: ${user.nonce}`;

        const verified = sign.detached.verify(new TextEncoder().encode(msg), decode(signature), decode(publicAddress));
        if (verified != true) {
            res.status(400).json('Signature verification failed.');
            return;
        }
        user.nonce = Date.now();
        const result = await user.save();
        if (!result) {
            res.status(400).json('error');
            return;
        }
        const session = signAccessToken(req, res, user._id);
        const LoginHistory = new LoginHistories({
            userId: user._id,
            ...session,
            data: req.body
        });
        await LoginHistory.save();
        await Sessions.updateOne({ userId: user._id }, session, {
            new: true,
            upsert: true
        });
        const userData = userInfo(user);
        const sessionData = {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken
        };
        const balance = await getUserBalance(user._id);
        res.json({
            status: true,
            session: sessionData,
            user: userData, balance,
            adminAddress: process.env.E_D_PUBLIC_ADDRESS,
            ethAdminAddress: process.env.E_D_PUBLIC_ADDRESS,
            solAdminAddress: process.env.S_W_PUBLIC_ADDRESS
        });
    } catch (e) {
        console.log(e)
        res.status(400).json('error');
    }
};

export const info = async (req: Request, res: Response) => {
    let result = {};
    if (req.body.update) {
        const { userId, email, username, avatar } = req.body;
        // const emailExists = await Users.findOne({
        //     _id: { $ne: ObjectId(userId) },
        //     email: { $regex: new RegExp('^' + email.toLowerCase(), 'i') }
        // });
        // if (emailExists) {
        //     return res.status(400).json(`${email} is used by another account.`);
        // }
        const usernameExists = await Users.findOne({
            _id: { $ne: ObjectId(userId) },
            username: { $regex: new RegExp('^' + username.toLowerCase(), 'i') }
        });
        if (usernameExists) {
            return res.status(400).json(`An account named '${username}' already exists.`);
        }
        const userData = await Users.findById(ObjectId(userId));
        if (!userData.status) {
            return res.status(400).json('Account has been blocked.');
        }
        const user = await Users.findByIdAndUpdate(ObjectId(userId), req.body, { new: true });
        result = userInfo(user);
        // if (userData.publicAddress === email || userData.publicAddress === username) {
        //     const user = await Users.findByIdAndUpdate(ObjectId(userId), { avatar }, { new: true });
        //     result = userInfo(user);
        // } else {
        //     const user = await Users.findByIdAndUpdate(ObjectId(userId), req.body, {
        //         new: true
        //     });
        //     result = userInfo(user);
        // }
    } else {
        const user = await Users.findOneAndUpdate({ _id: ObjectId(req.body.userId), status: true }, req.body, { new: true });
        result = userInfo(user);
    }
    return res.json(result);

};

export const changePassword = async (req: Request, res: Response) => {
    const { userId } = req.body;
    const user = await Users.findById(ObjectId(userId));
    if (!user.validPassword(req.body['Current Password'], user.password)) {
        return res.status(400).json('Passwords do not match.');
    }
    const password = user.generateHash(req.body['New Password']);
    const result = await Users.findOneAndUpdate({ _id: ObjectId(userId), status: true }, { password }, { new: true });
    if (result) {
        return res.json('Success!');
    } else {
        return res.status(400).json('Server error.');
    }
};

export const forgot = async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = await Users.findOne({ email });
    if (user) {
        const ip = getIPAddress(req);
        const expiration = getSessionTime();
        const passwordToken = md5(user._id + expiration);
        const session = { passwordToken, expiration, ...ip };
        await Sessions.updateOne({ userId: user._id }, session, {
            new: true,
            upsert: true
        });
        const subject = 'Forgot Password';
        const link = `${process.env.BASE_URL}password-reset/${user._id}/${passwordToken}`;
        const html = getForgotPasswordHtml(link);
        await sendEmail({ to: email, html, subject });
        return res.json('We just sent you an email with instructions for resetting your password.');
    } else {
        return res.json('We just sent you an email with instructions for resetting your password.');
    }
};

export const passwordReset = async (req: Request, res: Response) => {
    const { userId, token, password } = req.body;
    const user = await Users.findById(userId);
    if (!user) return res.status(400).json('invalid link or expired');
    const sessions = await Sessions.findOne({
        userId: user._id,
        passwordToken: token
    });
    if (!sessions) return res.status(400).json('Invalid link or expired');
    user.password = user.generateHash(password);
    await user.save();
    await sessions.delete();
    return res.json('password reset sucessfully.');
};

export const getReferral = async (req: any, res: Response) => {
    const { userId } = req.body;
    const invited = await Users.countDocuments({
        rReferral: req.user.iReferral
    });
    const rewards = await BalanceHistories.aggregate([
        {
            $match: {
                userId: ObjectId(userId),
                type: 'referral-bonus'
            }
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
            $group: {
                _id: {
                    currency: '$currency'
                },
                amount: { $sum: '$amount' }
            }
        },
        {
            $project: {
                amount: { $multiply: ['$amount', '$_id.currency.price'] }
            }
        },
        {
            $group: {
                _id: null,
                rewards: { $sum: '$amount' }
            }
        }
    ]);
    const reward = rewards.length ? rewards[0]?.rewards : 0;
    return res.json({ invited, rewards: reward });
};

export const sendMsg = async (req: any) => {
    const { userId, userName, content } = req;
    const Message = new Messages({
        userId,
        userName,
        content
    });
    await Message.save();
}

export const getMsg = async (req: any, res: Response) => {
    const result = await Messages.find().sort({ createdAt: -1 }).limit(20);
    return res.json(result);
} 