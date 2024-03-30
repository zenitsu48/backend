import routerx from 'express-promise-router';
import { checkUser, verifyToken } from '../../middlewares/auth';
import { turn, list, history } from '../../controllers/games';
import { get, getUserCrashData, getServerCrashData } from '../../controllers/games/casino/crash';
import rateLimit from 'express-rate-limit';
import { getOriginalProfit } from '../../controllers/reports';
const router = routerx();

const Mlimiter = rateLimit({
    windowMs: 200,
    max: 1,
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/list', list);
router.post('/turn', Mlimiter, verifyToken, checkUser, turn);
router.post('/history', history);
router.get('/', get);
router.get('/me', getUserCrashData);
router.get('/service', getServerCrashData);
router.post('/getgameprofit', getOriginalProfit)

export default router;
