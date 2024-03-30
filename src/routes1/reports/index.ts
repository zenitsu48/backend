import routerx from 'express-promise-router';
import { verifyAdminToken } from '../../middlewares/auth';
import { V, Validator } from '../../middlewares/validation';
const router = routerx();


export default router;
