import routerx from 'express-promise-router';
import game from './game';
import games from './games';
import lists from './lists';
import providers from './providers';
import { verifyAdminToken } from '../../middlewares/auth';
const router = routerx();

router.use('/', game);
router.use('/games', verifyAdminToken, games);
router.use('/lists', verifyAdminToken, lists);
router.use('/providers', verifyAdminToken, providers);

export default router;
