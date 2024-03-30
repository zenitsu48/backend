import routerx from 'express-promise-router';
import { V, Validator } from '../../middlewares/validation';
import { create, deleteAll, deleteOne, get, getOne, list, updateOne, betSettled } from '../../controllers/sports/sportsfixmatchs';
const router = routerx();

router.get('/', get);
router.get('/:id', V.params(Validator.ObjectId), getOne);
router.post('/', V.body(Validator.Sports.Matchs.Create), create);
router.post('/list', V.body(Validator.Sports.Matchs.List), list);
router.post('/:id', V.params(Validator.EventId), betSettled);
router.put('/:id', V.params(Validator.ObjectId), V.body(Validator.Sports.Matchs.Update), updateOne);
router.delete('/', deleteAll);
router.delete('/:id', V.params(Validator.ObjectId), deleteOne);

export default router;
