import routerx from 'express-promise-router';
import { V, Validator } from '../../middlewares/validation';
import { checkUser, verifyToken } from '../../middlewares/auth';
import { joinPool, createPool, getPools } from '../../controllers/p2p';
const router = routerx();

router.post('/create-pool', V.body(Validator.P2p.Bet.Create), verifyToken, createPool);
router.post('/join-pool', V.body(Validator.P2p.Bet.Join), verifyToken, joinPool);
router.get('/get-pools', getPools);

export default router;
