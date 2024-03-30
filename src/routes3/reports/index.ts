import routerx from 'express-promise-router';
import { verifyAdminToken } from '../../middlewares/auth';
import { V, Validator } from '../../middlewares/validation';
import { getUserProfit, removeTest, getCProfit, removeSports, getAllUsersBalance, getPlayerData, getChartData, getSportsBetData, getCasinoBetData, getGamesBetData, getBalanceData } from '../../controllers/reports';
const router = routerx();

router.post('/user', V.body(Validator.Report.User), verifyAdminToken, getUserProfit);
router.post('/player', V.body(Validator.Report.Report), verifyAdminToken, getPlayerData);
router.post('/chart', V.body(Validator.Report.Report), verifyAdminToken, getChartData);
router.post('/balance', V.body(Validator.Report.Report), verifyAdminToken, getBalanceData);
router.post('/sports', V.body(Validator.Report.Report), verifyAdminToken, getSportsBetData);
router.post('/casino', V.body(Validator.Report.Report), verifyAdminToken, getCasinoBetData);
router.post('/game', V.body(Validator.Report.Report), verifyAdminToken, getGamesBetData);
router.post('/r-all', V.body(Validator.UserId), verifyAdminToken, removeTest);
router.post('/r-sports', V.body(Validator.UserId), verifyAdminToken, removeSports);
router.get('/t-hold', getAllUsersBalance);

//dashboard page chart profit 
router.post('/c-profit', getCProfit);

export default router;
