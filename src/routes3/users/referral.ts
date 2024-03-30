import routerx from 'express-promise-router';
import { get, edit } from '../../controllers/users/referral';
const router = routerx();

router.get('/', get);
router.post('/edit', edit);

export default router;