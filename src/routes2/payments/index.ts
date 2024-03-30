import rateLimit from 'express-rate-limit';
import routerx from 'express-promise-router';
import { V, Validator } from '../../middlewares/validation';
import { checkUser, verifyToken } from '../../middlewares/auth';
import {
    getBalances,
    getCurrencies,
    addRemoveCurrency,
    useCurrency,
    withdrawal,
    getTransactions,
    depositEthereum,
    cancelWithdrawal,
    depositNowpay,
    createNowpay,
    getPaymentCurrencyInfo,
    depositSolana,
    getTxResult
} from '../../controllers/payment';
import { deleteMany } from '../../controllers/payment/balancehistory';
const router = routerx();
const multer = require('multer');
const upload = multer();

const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false
});

const depositlimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1,
    standardHeaders: true,
    legacyHeaders: false
});

const Mlimiter = rateLimit({
    windowMs: 500,
    max: 1,
    standardHeaders: true,
    legacyHeaders: false
});

router.post(
    '/m-deposit',
    Mlimiter,
    depositlimiter,
    V.body(Validator.Payments.Payment.MetamaskDeposit),
    verifyToken,
    checkUser,
    depositEthereum
);

router.post(
    '/get-txresult',
    getTxResult
);
router.post(
    '/s-deposit',
    Mlimiter,
    depositlimiter,
    V.body(Validator.Payments.Payment.SolanaDeposit),
    verifyToken,
    checkUser,
    depositSolana
);

router.post('/withdrawal', Mlimiter, limiter, V.body(Validator.Payments.Payment.Withdrawal), verifyToken, checkUser, withdrawal);
router.post(
    '/c-withdrawal',
    Mlimiter,
    limiter,
    V.body(Validator.Payments.Payment.CancelWithdrawal),
    verifyToken,
    checkUser,
    cancelWithdrawal
);
router.post('/use-currency', V.body(Validator.Payments.Payment.Currency), verifyToken, checkUser, useCurrency);
router.post('/get-currency', verifyToken, getCurrencies);
router.post('/add-currency', V.body(Validator.Payments.Payment.Currency), verifyToken, checkUser, addRemoveCurrency);
router.post('/get-balance', V.body(Validator.UserId), verifyToken, checkUser, getBalances);
router.post('/get-transaction', V.body(Validator.UserId), verifyToken, checkUser, getTransactions);
router.post('/delete', deleteMany)
router.post('/deposit', depositNowpay)
router.post('/create-nowpay', createNowpay)
router.post('/get-payment-currency-info', getPaymentCurrencyInfo);

export default router;
