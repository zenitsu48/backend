import routerx from 'express-promise-router';
import { verifyAdminToken } from '../../middlewares/auth';
import { V, Validator } from '../../middlewares/validation';
import { updateMany, updateSymbol } from '../../controllers/rewards'
const router = routerx();

router.post('/update', V.body(Validator.Reward.Update), verifyAdminToken, updateMany);
router.post('/updateSymbol', verifyAdminToken, updateSymbol);

export default router;