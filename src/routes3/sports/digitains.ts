import routerx from 'express-promise-router';
import {
    chequeRedact,
    creditBet,
    creditBetByBatch,
    debitByBatch,
    getBalance,
    getUserInfo,
    rollBackByBatch
} from "../../controllers/sports/digitain";

const router = routerx();

router.post('/GetUserInfo', getUserInfo)
router.post('/GetBalance', getBalance)
router.post('/CreditBet', creditBet)
router.post('/CreditBetByBatch', creditBetByBatch)
router.post('/RollBackByBatch', rollBackByBatch)
router.post('/DebitByBatch', debitByBatch)
router.post('/ChequeRedact', chequeRedact)

export default router;
