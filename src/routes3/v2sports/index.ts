import routerx from 'express-promise-router';
import history from './history';
import { verifyAdminToken } from '../../middlewares/auth';
const router = routerx();

router.use('/history', verifyAdminToken, history);

export default router;
