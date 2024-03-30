import routerx from 'express-promise-router';
import users from './users';
import files from './files';
import sports from './sports';
import payments from './payments';
import games from './games';
import pvp from './pvp'
import p2p from './p2p'
import casinos from './casinos'
import rewards from './rewards'

const router = routerx();
router.use('/users', users);
router.use('/files', files);
router.use('/sports', sports);
router.use('/games', games);
router.use('/payments', payments);
router.use('/pvp', pvp);
router.use('/p2p', p2p);
router.use('/casinos', casinos);
router.use('/rewards', rewards);

export default router;
