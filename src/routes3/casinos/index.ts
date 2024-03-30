import routerx from 'express-promise-router';
import game from './game';
import casinos from './casinos';
import lists from './lists';
import providers from './providers';
import { verifyAdminToken } from '../../middlewares/auth';
const router = routerx();

router.use('/', verifyAdminToken, game);
router.use('/casinos', verifyAdminToken, casinos);
router.use('/lists', verifyAdminToken, lists);
router.use('/providers', verifyAdminToken, providers);

export default router;
