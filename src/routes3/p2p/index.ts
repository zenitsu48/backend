import routerx from 'express-promise-router';
import { verifyAdminToken } from '../../middlewares/auth';
import { V, Validator } from '../../middlewares/validation';
import { getOne, list, setResult } from '../../controllers/p2p';
const router = routerx();

router.post('/settle', V.body(Validator.P2p.Bet.Settle), verifyAdminToken, setResult);
router.post('/list', V.body(Validator.P2p.Bet.List), verifyAdminToken, list);
router.get('/list/:id', V.body(Validator.P2p.Bet.List), verifyAdminToken, getOne);

export default router;