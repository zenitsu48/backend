import routerx from 'express-promise-router';
import rateLimit from 'express-rate-limit';
import { V, Validator } from '../../middlewares/validation';
import { checkUser, verifyToken } from '../../middlewares/auth';
import {
    SportsBet,
    getBettingHistory,
    sportsBetCashOut,
    getBetHistory,
    getPvpBettingHistory
} from '../../controllers/sports';
import {
    getUserInfo,
    getBalance,
    creditBet,
    creditBetByBatch,
    rollBackByBatch,
    debitByBatch,
    chequeRedact
} from '../../controllers/sports/digitain';
import {
    getAllSportsProfit,
    getAllSportsProfitByCurrency,
    getAllV2SportsProfit,
    getAllV2SportsProfitByCurrency,
    getSportsProfit,
    getUserSportsProfit,
    getV2SportsProfit
} from '../../controllers/reports';

const router = routerx();
const Mlimiter = rateLimit({
    windowMs: 500,
    max: 1,
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/bet-history', V.body(Validator.Sports.Bet.BetHistory), getBetHistory);
router.post('/bet', Mlimiter, V.body(Validator.Sports.Bet.Bet), verifyToken, checkUser, SportsBet);
router.post('/history', V.body(Validator.Sports.Bet.History), verifyToken, checkUser, getBettingHistory);
router.post('/pvp-history', V.body(Validator.Sports.Bet.History), verifyToken, checkUser, getPvpBettingHistory);
router.post('/cashout', V.body(Validator.Sports.Bet.CashOut), verifyToken, checkUser, sportsBetCashOut);
router.post('/getprofit', getSportsProfit);
router.post('/getv2profit', getV2SportsProfit);
router.post('/getuserprofit', getUserSportsProfit);
router.post('/getAllSportsProfitByCurrency', getAllSportsProfitByCurrency)
router.post('/getAllV2SportsProfitByCurrency', getAllV2SportsProfitByCurrency)
router.get('/getAllSportsProfit', getAllSportsProfit)
router.get('/getAllV2SportsProfit', getAllV2SportsProfit)
router.post('/digitain/GetUserInfo', getUserInfo)
router.post('/digitain/GetBalance', getBalance)
router.post('/digitain/CreditBet', creditBet)
router.post('/digitain/CreditBetByBatch', creditBetByBatch)
router.post('/digitain/RollBackByBatch', rollBackByBatch)
router.post('/digitain/DebitByBatch', debitByBatch)
router.post('/digitain/ChequeRedact', chequeRedact)

export default router;
