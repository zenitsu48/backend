import routerx from 'express-promise-router';
import {
    getCasinoGamesDetail,
    getCasinoGamesListByCategory,
    getCasinoGamesLists,
    getCasinoProviders,
    PlayerGetBalance,
    viewCasinoGame
} from '../../controllers/casinos';
import {
    getAllCasinoProfitByCurrency,
    getAllCasinosProfit,
    getCasinosProfit,
    getUserCasinosProfit
} from '../../controllers/reports';
import {
    getGameLists,
    getCategoryLists
} from '../../controllers/casinos/api';
import { deleteMany } from '../../controllers/casinos/casinos';
import {
    boCallback,
    openDemoGame,
    openGame,
    boCategoryList,
    getProviderList,
    getGames,
    getLiveWinners
} from '../../controllers/casinos/blueocean';

const router = routerx();

router.post('/get-gamelists', getCasinoGamesLists);
router.post('/get-gamelistsbycategory', getCasinoGamesListByCategory);
router.post('/get-gamedetail', getCasinoGamesDetail)
router.post('/get-providers', getCasinoProviders)
router.post('/view-gamedetail', viewCasinoGame)
router.post('/get-balance', PlayerGetBalance)
router.post('/getprofit', getCasinosProfit)
router.post('/getuserprofit', getUserCasinosProfit)
router.post('/getAllCasinoProfitByCurrency', getAllCasinoProfitByCurrency)
router.post('/getAllCasinosProfit', getAllCasinosProfit)

router.get('/get-gamelists', getGameLists)
router.get('/get-categorylists', getCategoryLists)
router.post('/delete', deleteMany)


//BlueOcean api
router.get('/blueocean', boCallback)
router.post('/demogame', openDemoGame)
router.post('/opengame', openGame)
router.post('/bo-providerlist', getProviderList)
router.get('/bo-categorylist', boCategoryList)
router.post('/bo-gamelist', getGames)
router.get('/bo-livewinners', getLiveWinners)

// router.post("*", async (req, res) => {
//     let { type } = req.body
//     if (type == "ping") {
//         return await PlayerPing(req, res)
//     } else if (type == "balance") {
//         return await PlayerGetBalance(req, res)
//     } else if (type == "debit") {
//         if (req.body.subtype == "cancel" || req.body.i_rollback) {
//             return await PlayerDebitRollback(req, res)
//         } else {
//             return await PlayerDebit(req, res)
//         }
//     } else if (type === 'credit') {
//         if (req.body.subtype == "cancel" || req.body.i_rollback) {
//             return await PlayerCreditRollback(req, res)
//         } else {
//             return await PlayerCredit(req, res)
//         }
//     } else if (type === "roundinfo") {
//         return await PlayerRound(req, res)
//     } else {
//         return res.json({
//             error: "parameter mismatch",
//             hmac: await softGamHmac("parameter mismatch")
//         })
//     }
// })

export default router;
