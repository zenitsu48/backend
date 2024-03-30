import routerx from 'express-promise-router';
import words from './words';
import language from './language';
import languages from './languages';
import { verifyAdminToken } from '../../middlewares/auth';
const router = routerx();

router.use('/words', words);
router.use('/languages', languages);
router.use('/', language);

export default router;
