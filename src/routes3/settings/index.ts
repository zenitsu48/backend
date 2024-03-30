import routerx from 'express-promise-router';
import { verifyAdminToken } from '../../middlewares/auth';
import { V, Validator } from '../../middlewares/validation';
import { update, get } from '../../controllers/settings/dashboard';
const router = routerx();

router.post('/d-update', verifyAdminToken, update);
router.get('/d-get', verifyAdminToken, get);

export default router;
