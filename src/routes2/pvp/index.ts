import routerx from 'express-promise-router';
import { V, Validator } from '../../middlewares/validation';
import { checkUser, verifyToken } from '../../middlewares/auth';
import { createBetRoom, getRoom, joinBetRoom, getLanking } from '../../controllers/pvp';
const router = routerx();

router.post('/create-bet', V.body(Validator.Pvp.Bet.Create), verifyToken, createBetRoom);
router.post('/join-bet', V.body(Validator.Pvp.Bet.Join), verifyToken, joinBetRoom);
router.post('/getRoom', V.body(Validator.Pvp.Bet.GetRoom), getRoom);
router.post('/getLanking', V.body(Validator.Pvp.Bet.GetRoom), getLanking);

export default router;
