import routerx from 'express-promise-router';
import { get, claim, deleteMany } from '../../controllers/rewards';

const router = routerx();
router.post('/get', get)
router.post('/claim', claim)
router.post('/delete', deleteMany)

export default router;