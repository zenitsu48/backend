import routerx from 'express-promise-router';
import auth from './auth';
import admin from './admin';
import history from './history';
import session from './session';
import permission from './permission';
import referral from './referral';
import { verifyAdminToken } from '../../middlewares/auth';
const router = routerx();

router.use('/', auth);
router.use('/admin', admin);
router.use('/permission', verifyAdminToken, permission);
router.use('/session', verifyAdminToken, session);
router.use('/history', verifyAdminToken, history);
router.use('/referral', referral);

export default router;
