import lodash = require('lodash');
import jwt = require('jsonwebtoken');
import { Server, Socket } from 'socket.io';
import { AnyObject, ObjectId, Types } from 'mongoose';

import {
    generatePrivateSeedHashPair,
    generateCrashRandom
} from '../../../util/random';

import { Payload, Response, Request, NextFunction } from '../../../types';
import { GAMES, JWTSECRET } from '../../../config';
import { Users, CrashGame, ICrashGame, GameLists, Currencies, Games } from '../../../models';
import { checkBalance, generatInfo, handleBet } from '../../base';

type FormatGameHistoryType = {
    _id: Types.ObjectId;
    privateHash: string;
    privateSeed: string;
    publicSeed: string;
    crashPoint: number;
    createdAt: Date;
};

type FormatPlayerBetProps = {
    playerID: Types.ObjectId;
    name: string;
    avatar: string;
    betAmount: number;
    symbol: string;
    usd: number;
    autoCashOut: number;
    forcedCashout: boolean;
    status: number;
    createdAt: Date;
    stoppedAt?: number;
    winningAmount?: number;
};

type FormattedType = {
    playerID: Types.ObjectId;
    name: string;
    symbol: string;
    usd: number;
    avatar: string;
    betAmount: number;
    status: number;
    stoppedAt?: number;
    winningAmount?: number;
};

type GameStateType = {
    _id: Types.ObjectId | null;
    duration: number;
    crashPoint: number;
    pendingCount: number;
    privateSeed: string;
    privateHash: string;
    publicSeed: string;
    players: { [key: string]: FormatPlayerBetProps };
    pending: {
        [key: string]: {
            betAmount: number;
            autoCashOut: number;
            name: string;
        };
    };
    pendingBets: FormattedType[];
    startedAt: Date | null;
    status: number;
};

const TICK_RATE = 150;
const START_WAIT_TIME = 4000;
const RESTART_WAIT_TIME = 9000;

const growthFunc = (ms: number): number =>
    Math.floor(100 * Math.pow(Math.E, 0.00012 * ms));
const inverseGrowth = (result: number): number =>
    16666.666667 * Math.log(0.01 * result);

// Declare game states
const GAME_STATES = {
    notStarted: 1,
    starting: 2,
    inProgress: 3,
    over: 4,
    blocking: 5,
    refunded: 6
};

const BET_STATES = {
    playing: 1,
    cashedOut: 2
};

// Declare game state
const GAME_STATE: GameStateType = {
    _id: null,
    duration: 0,
    crashPoint: 0,
    pendingCount: 0,
    privateSeed: '',
    privateHash: '',
    publicSeed: '',
    players: {},
    pending: {},
    pendingBets: [],
    status: GAME_STATES.starting,
    startedAt: null
};

// Export state to external controllers
export const getCurrentGame = (): FormatGameType => formatGame(GAME_STATE);
export const getPrivateHash = (): null | string => GAME_STATE.privateSeed;
type FormatGameType = {
    _id: Types.ObjectId | null;
    status: number;
    startedAt: Date | null;
    elapsed: number;
    players: FormattedType[];
    privateHash: string;
    publicSeed: string;
    crashPoint?: number;
};
// Format a game
export const formatGame = (game: GameStateType): FormatGameType => {
    const formatted: FormatGameType = {
        _id: game._id,
        status: game.status,
        startedAt: game.startedAt,
        elapsed: Date.now() - new Date(game.startedAt || 0).valueOf(),
        players: lodash.map(game.players, (p: any) => formatPlayerBet(p)),
        privateHash: game.privateHash,
        publicSeed: game.publicSeed
    };
    if (game.status === GAME_STATES.over) {
        formatted.crashPoint = game.crashPoint;
    }
    return formatted;
};

// Format a game history
export const formatGameHistory = (game: AnyObject): FormatGameHistoryType => {
    const formatted = {
        _id: game._id,
        createdAt: game.createdAt,
        privateHash: game.privateHash,
        privateSeed: game.privateSeed,
        publicSeed: game.publicSeed,
        crashPoint: game.crashPoint / 100
    };
    return formatted;
};

// Format a player bet
const formatPlayerBet = (bet: FormatPlayerBetProps): FormattedType => {
    const formatted: FormattedType = {
        playerID: bet.playerID,
        name: bet.name,
        usd: bet.usd,
        symbol: bet.symbol,
        avatar: bet.avatar,
        betAmount: bet.betAmount,
        status: bet.status
    };

    if (bet.status !== BET_STATES.playing) {
        formatted.stoppedAt = bet.stoppedAt;
        formatted.winningAmount = bet.winningAmount;
    }
    return formatted;
};

// Calculate the current game payout
const calculateGamePayout = (ms: number): number => {
    const gamePayout = Math.floor(100 * growthFunc(ms)) / 100;
    return Math.max(gamePayout, 1);
};

// Get socket.io instance
export const listen = (io: Server): void => {
    // Function to emit new player bets
    const _emitPendingBets = (): void => {
        const bets = GAME_STATE.pendingBets;
        GAME_STATE.pendingBets = [];

        io.of('/crash').emit('game-bets', bets);
    };

    const emitPlayerBets = lodash.throttle(_emitPendingBets, 600);

    // Creates a new game
    const createNewGame = async (): Promise<any> => {
        try {
            // Generate pre-roll provably fair data
            const provablyData = await generatePrivateSeedHashPair();
            if (!provablyData) {
                // console.log(colors.cyan(`Crash >> Couldn't create a new game !!`));
                return;
            }

            // Push game to db
            const newGame = new CrashGame({
                privateSeed: provablyData.seed,
                privateHash: provablyData.hash,
                players: {},
                status: GAME_STATES.starting
            });

            // Save the new document
            await newGame.save();

            // console.log(
            //   colors.cyan('Crash >> Generated new game with the id'),
            //   newGame._id
            // );

            return newGame;
        } catch (error) {
            // console.log(colors.cyan(`Crash >> Couldn't create a new game ${error}`));
        }
    };

    // Starts a new game
    const runGame = async (): Promise<void> => {
        const game = await createNewGame();

        // Override local state
        GAME_STATE._id = game._id;
        GAME_STATE.status = GAME_STATES.starting;
        GAME_STATE.privateSeed = game.privateSeed;
        GAME_STATE.privateHash = game.privateHash;
        GAME_STATE.publicSeed = '';
        GAME_STATE.startedAt = new Date(Date.now() + RESTART_WAIT_TIME);
        GAME_STATE.players = {};

        // Update startedAt in db
        game.startedAt = GAME_STATE.startedAt;

        await game.save();

        emitStarting();
    };

    // Emits the start of the game and handles blocking
    const emitStarting = (): void => {
        // Emiting starting to clients
        io.of('/crash').emit('game-starting', {
            _id: GAME_STATE._id,
            privateHash: GAME_STATE.privateHash,
            timeUntilStart: RESTART_WAIT_TIME
        });

        setTimeout(blockGame, RESTART_WAIT_TIME - 500);
    };

    // Block games for more bets
    const blockGame = (): void => {
        GAME_STATE.status = GAME_STATES.blocking;

        const loop = (): void => {
            // const ids = Object.keys(GAME_STATE.pending);
            if (GAME_STATE.pendingCount > 0) {
                // console.log(
                //   colors.cyan(
                //     `Crash >> Delaying game while waiting for ${ids.length} (${ids.join(
                //       ', '
                //     )}) join(s)`
                //   )
                // );
                setTimeout(loop, 50);
                return;
            }

            startGame();
        };

        loop();
    };

    // starting animation and enabling cashouts
    const startGame = async (): Promise<void> => {
        try {
            // Generate random data
            const randomData = await generateCrashRandom(GAME_STATE.privateSeed);

            if (!randomData) {
                // console.log('Error while starting a crash game !!');
                return;
            }
            // Overriding game state
            GAME_STATE.status = GAME_STATES.inProgress;
            GAME_STATE.crashPoint = randomData.crashPoint;
            GAME_STATE.publicSeed = randomData.publicSeed;
            GAME_STATE.duration = Math.ceil(inverseGrowth(GAME_STATE.crashPoint + 1));
            GAME_STATE.startedAt = new Date();
            GAME_STATE.pending = {};
            GAME_STATE.pendingCount = 0;

            // console.log(
            //   colors.cyan('Crash >> starting new game'),
            //   GAME_STATE._id, 
            //   colors.cyan('with crash point'),
            //   GAME_STATE.crashPoint / 100
            // );

            // Updating in db
            await CrashGame.updateOne(
                { _id: GAME_STATE._id },
                {
                    status: GAME_STATES.inProgress,
                    crashPoint: GAME_STATE.crashPoint,
                    publicSeed: GAME_STATE.publicSeed,
                    startedAt: GAME_STATE.startedAt
                }
            );

            // Emiting start to clients
            io.of('/crash').emit('game-start', {
                publicSeed: GAME_STATE.publicSeed
            });

            callTick(0);
        } catch (error) {
            // console.log('Error while starting a crash game:', error);

            // Notify clients that we had an error
            io.of('/crash').emit(
                'notify-error',
                "Our server couldn't connect to EOS Blockchain, retrying in 15s"
            );

            // Timeout to retry
            const timeout = setTimeout(() => {
                // Retry starting the game
                startGame();

                clearTimeout(timeout);
            }, 15000);
        }
    };

    // Calculate next tick time
    const callTick = (elapsed: number): void => {
        // Calculate next tick
        const left = GAME_STATE.duration - elapsed;
        const nextTick = Math.max(0, Math.min(left, TICK_RATE));
        setTimeout(runTick, nextTick);
    };

    // Run the current tick
    const runTick = (): void => {
        // Calculate elapsed time
        const elapsed =
            new Date().valueOf() - new Date(GAME_STATE.startedAt || 0).valueOf();
        const at = growthFunc(elapsed);

        // Completing all auto cashouts
        runCashOuts(at);

        // Check if crash point is reached
        if (at > GAME_STATE.crashPoint) {
            endGame();
        } else {
            tick(elapsed);
        }
    };

    // Handles auto cashout for users
    const runCashOuts = (elapsed: number): void => {
        lodash.each(GAME_STATE.players, (bet: any) => {
            // Check if bet is still active
            if (bet.status !== BET_STATES.playing) return;

            // Check if the auto cashout is reached or max profit is reached
            if (
                bet.autoCashOut >= 101 &&
                bet.autoCashOut <= elapsed &&
                bet.autoCashOut <= GAME_STATE.crashPoint
            ) {
                doCashOut(
                    bet.playerID.toString(),
                    bet.autoCashOut,
                    false,
                    (err: AnyObject) => {
                        if (err) {
                            // console.log(
                            //   colors.cyan(
                            //     `Crash >> There was an error while trying to cashout`
                            //   ),
                            //   err
                            // );
                        }
                    }
                );
            } else if (
                bet.betAmount * (elapsed / 100) >= GAMES.crash.maxProfit &&
                elapsed <= GAME_STATE.crashPoint
            ) {
                doCashOut(bet.playerID.toString(), elapsed, true, (err: AnyObject) => {
                    if (err) {
                        // console.log(
                        //   colors.cyan(
                        //     `Crash >> There was an error while trying to cashout`
                        //   ),
                        //   err
                        // );
                    }
                });
            }
        });
    };

    // Handle cashout request
    const doCashOut = async (
        playerID: string,
        elapsed: number,
        forced: boolean,
        cb: (error: any, result: FormatPlayerBetProps) => void
    ): Promise<void> => {
        // console.log(colors.cyan('Crash >> Doing cashout for'), playerID);

        // Check if bet is still active
        if (GAME_STATE.players[playerID].status !== BET_STATES.playing) return;

        // Update player state
        GAME_STATE.players[playerID].status = BET_STATES.cashedOut;
        GAME_STATE.players[playerID].stoppedAt = elapsed;
        if (forced) GAME_STATE.players[playerID].forcedCashout = true;

        const bet: any = GAME_STATE.players[playerID];

        // Calculate winning amount
        const winningAmount = parseFloat(
            (
                bet.betAmount *
                ((bet.autoCashOut === bet.stoppedAt ? bet.autoCashOut : bet.stoppedAt) /
                    100)
            ).toFixed(2)
        );

        GAME_STATE.players[playerID].winningAmount = winningAmount;

        if (cb) cb(null, GAME_STATE.players[playerID]);

        const { status, stoppedAt } = GAME_STATE.players[playerID];

        // Emiting cashout to clients
        io.of('/crash').emit('bet-cashout', {
            playerID,
            status,
            stoppedAt,
            winningAmount
        });

        await handleBet({
            req: null,
            currency: bet.currency,
            userId: playerID,
            amount: Math.abs(winningAmount),
            type: 'casino-bet-settled(crash)',
            info: generatInfo()
        });
        const odds = ((bet.autoCashOut === bet.stoppedAt ? bet.autoCashOut : bet.stoppedAt) /
            100)
        await Games.updateOne({ _id: bet.betId }, { status: 'WIN', profit: Math.abs(winningAmount), odds })
        // Giving winning balance to user
        // const userData = await Users.findByIdAndUpdate(
        //     playerID,
        //     {
        //         $inc: {
        //             balance: Math.abs(winningAmount)
        //         }
        //     },
        //     { new: true }
        // );

        // insertNewWalletTransaction(playerID, Math.abs(winningAmount), 'Crash win', {
        //   crashGameId: GAME_STATE._id
        // });

        // Update local wallet
        // io.of('/crash')
        //     .to(playerID.toString())
        //     .emit('update-balance', userData.balance);

        // Updating in db
        const updateParam: AnyObject = { $set: {} };
        updateParam.$set['players.' + playerID] = GAME_STATE.players[playerID];
        await CrashGame.updateOne({ _id: GAME_STATE._id }, updateParam);
    };

    // Handle end request
    const endGame = async (): Promise<void> => {
        // console.log(
        //   colors.cyan(`Crash >> Ending game at`),
        //   GAME_STATE.crashPoint / 100
        // );

        const crashTime = Date.now();

        GAME_STATE.status = GAME_STATES.over;

        // Notify clients
        io.of('/crash').emit('game-end', {
            game: formatGameHistory(GAME_STATE)
        });

        // Run new game after start wait time
        setTimeout(
            () => {
                runGame();
            },
            crashTime + START_WAIT_TIME - Date.now()
        );

        // Updating in db
        await CrashGame.updateOne(
            { _id: GAME_STATE._id },
            {
                status: GAME_STATES.over
            }
        );
    };

    // Emits game tick to client
    const tick = (elapsed: number): void => {
        io.of('/crash').emit('game-tick', calculateGamePayout(elapsed) / 100);
        callTick(elapsed);
    };

    // Handle refunds of old unfinished games
    const refundGames = async (games: ICrashGame[]): Promise<void> => {
        for (const game of games) {
            // console.log(colors.cyan(`Crash >> Refunding game`), game._id);

            const refundedPlayers: any[] = [];

            try {
                for (const playerID in game.players) {
                    const bet = game.players[playerID];

                    if (bet.status == BET_STATES.playing) {
                        // Push Player ID to the refunded players
                        refundedPlayers.push(playerID);

                        // console.log(
                        //   colors.cyan(
                        //     `Crash >> Refunding player ${playerID} for ${bet.betAmount}`
                        //   )
                        // );

                        // Refund player
                        // await User.updateOne(
                        //     { _id: playerID },
                        //     {
                        //         $inc: {
                        //             balance: Math.abs(bet.betAmount)
                        //         }
                        //     }
                        // );
                        // await handleBet({
                        //     req: null,
                        //     currency,
                        //     userId: playerID,
                        //     amount: bet.betAmount,
                        //     type: 'casino-bet-refunded(limbo)',
                        //     info: generatInfo()
                        // });
                    }
                }

                game.refundedPlayers = refundedPlayers;
                game.status = GAME_STATES.refunded;
                await game.save();
            } catch (error) {
                // console.log(
                //   colors.cyan(
                //     `Crash >> Error while refunding crash game ${GAME_STATE._id}: ${error}`
                //   )
                // );
            }
        }
    };

    // Refunds old unfinished games and inits new one
    const initGame = async (): Promise<void> => {
        // console.log(colors.cyan('Crash >> starting up'));

        const unfinishedGames = await CrashGame.find({
            $or: [
                { status: GAME_STATES.starting },
                { status: GAME_STATES.blocking },
                { status: GAME_STATES.inProgress }
            ]
        });

        if (unfinishedGames.length > 0) {
            // console.log(
            //   colors.cyan(`Crash >> Ending`),
            //   unfinishedGames.length,
            //   colors.cyan(`unfinished games`)
            // );
            await refundGames(unfinishedGames);
        }

        console.log('init')
        runGame();
    };

    // Init the gamemode
    initGame();

    // Listen for new websocket connections
    io.of('/crash').on('connection', (socket: Socket) => {
        let loggedIn = false;
        let user: any = null;
        // Authenticate websocket connection
        socket.on('auth', async (userId: string) => {
            if (!userId) {
                loggedIn = false;
                user = null;
                return socket.emit(
                    'error',
                    'No authentication token provided, authorization declined'
                );
            }

            try {
                user = await Users.findOne({ _id: userId });
                if (user) {
                    loggedIn = true;
                    socket.join(String(user._id));
                }
            } catch (error) {
                console.log("here", error)
                loggedIn = false;
                user = null;
                return socket.emit('notify-error', 'Authentication token is not valid');
            }
        });

        /**
         * @description Join a current game
         *
         * @param {number} target Auto cashout target
         * @param {number} betAmount Bet amount
         */
        socket.on('join-game', async (target: number | null, betAmount: number, currency: string) => {
            console.log(target, "target")
            // Validate user input
            if (typeof betAmount !== 'number' || isNaN(betAmount))
                return socket.emit('game-join-error', 'Invalid betAmount type!');
            if (!loggedIn)
                return socket.emit('game-join-error', 'You are not logged in!');

            // More validation on the bet value
            // const { minBetAmount, maxBetAmount } = GAMES.crash;
            // if (
            //     parseFloat(betAmount.toFixed(2)) < minBetAmount ||
            //     parseFloat(betAmount.toFixed(2)) > maxBetAmount
            // ) {
            //     return socket.emit(
            //         'game-join-error',
            //         `Your bet must be a minimum of ${minBetAmount} credits and a maximum of ${maxBetAmount} credits!`
            //     );
            // }

            // Check if game accepts bets
            if (GAME_STATE.status !== GAME_STATES.starting)
                return socket.emit('game-join-error', 'Game is currently in progress!');
            // Check if user already betted
            if (GAME_STATE.pending[user._id] || GAME_STATE.players[user._id])
                return socket.emit(
                    'game-join-error',
                    'You have already joined this game!'
                );

            let autoCashOut = -1;

            // Validation on the target value, if acceptable assign to auto cashout
            if (typeof target === 'number' && !isNaN(target) && target > 100) {
                autoCashOut = target;
            }

            GAME_STATE.pending[String(user._id)] = {
                betAmount,
                autoCashOut,
                name: user.name
            };

            GAME_STATE.pendingCount++;

            try {
                const gamelist = await GameLists.findOne({ id: 'crash' });
                const gameId = gamelist._id;
                console.log(user._id, currency, betAmount, "res")
                const checked = await checkBalance({ userId: user._id, currency, amount: betAmount });
                console.log(checked, "checked")
                if (!checked) {
                    delete GAME_STATE.pending[user._id];
                    GAME_STATE.pendingCount--;
                    return socket.emit('game-join-error', "You can't afford this bet!");
                }

                // Remove bet amount from user's balance
                await handleBet({
                    req: null,
                    currency,
                    userId: user._id,
                    amount: betAmount * -1,
                    type: 'casino-bet(crash)',
                    info: generatInfo()
                });
                const currencies = await Currencies.findOne({ _id: currency });
                const tokenPrice = currencies.price;

                const data = {
                    providerId: gamelist.providerId,
                    userId: user._id,
                    currency,
                    gameId,
                    price: tokenPrice,
                    amount: betAmount,
                    betting: {}
                };
                const games = await Games.create({
                    status: 'LOST',
                    odds: autoCashOut / 100,
                    profit: 0,
                    aBetting: {},
                    ...data
                });

                // Creating new bet object
                const newBet = {
                    autoCashOut,
                    betAmount,
                    createdAt: new Date(),
                    playerID: user._id,
                    name: user.username,
                    betId: games._id,
                    avatar: user.avatar,
                    status: BET_STATES.playing,
                    currency,
                    symbol: currencies.symbol,
                    usd: tokenPrice * betAmount,
                    forcedCashout: false
                };

                // Updating in db
                const updateParam: AnyObject = { $set: {} };
                updateParam.$set['players.' + user._id] = newBet;
                await CrashGame.updateOne({ _id: GAME_STATE._id }, updateParam);

                // Assign to state
                GAME_STATE.players[user._id] = newBet;
                GAME_STATE.pendingCount--;
                const formattedBet = formatPlayerBet(newBet);
                GAME_STATE.pendingBets.push(formattedBet);
                emitPlayerBets();

                return socket.emit('game-join-success', formattedBet);
            } catch (error) {
                // console.error(error);

                delete GAME_STATE.pending[user._id];
                GAME_STATE.pendingCount--;

                return socket.emit(
                    'game-join-error',
                    'There was an error while proccessing your bet'
                );
            }
        });

        /**
         * @description Cashout the current bet
         */
        socket.on('bet-cashout', async () => {
            if (!loggedIn)
                return socket.emit('bet-cashout-error', 'You are not logged in!');

            // Check if game is running
            if (GAME_STATE.status !== GAME_STATES.inProgress)
                return socket.emit(
                    'bet-cashout-error',
                    'There is no game in progress!'
                );

            // Calculate the current multiplier
            const elapsed =
                new Date().valueOf() - new Date(GAME_STATE.startedAt || 0).valueOf();
            let at = growthFunc(elapsed);

            // Check if cashout is over 1x
            if (at < 101)
                return socket.emit(
                    'bet-cashout-error',
                    'The minimum cashout is 1.01x!'
                );

            // Find bet from state
            const bet = GAME_STATE.players[user._id];

            // Check if bet exists
            if (!bet)
                return socket.emit('bet-cashout-error', "Coudn't find your bet!");

            // Check if the current multiplier is over the auto cashout
            if (bet.autoCashOut > 100 && bet.autoCashOut <= at) {
                at = bet.autoCashOut;
            }

            // Check if current multiplier is even possible
            if (at > GAME_STATE.crashPoint)
                return socket.emit('bet-cashout-error', 'The game has already ended!');

            // Check if user already cashed out
            if (bet.status !== BET_STATES.playing)
                return socket.emit('bet-cashout-error', 'You have already cashed out!');

            // Send cashout request to handler
            doCashOut(
                bet.playerID.toString(),
                at,
                false,
                (err: AnyObject, result: FormatPlayerBetProps) => {
                    if (err) {
                        // console.log(
                        //   colors.cyan(
                        //     `Crash >> There was an error while trying to cashout a player`
                        //   ),
                        //   err
                        // );
                        return socket.emit(
                            'bet-cashout-error',
                            'There was an error while cashing out!'
                        );
                    }

                    socket.emit('bet-cashout-success', result);
                }
            );
        });
    });
};

export const get = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Get active game
        const history = await CrashGame.find({
            status: 4
        })
            .sort({ created: -1 })
            .limit(35);

        // Get current games
        const current = await getCurrentGame();

        res.json({
            current,
            history: history.map(formatGameHistory),
            options: lodash.pick(GAMES.crash, 'maxProfit')
        });
    } catch (error) {
        next(error);
    }
};

export const getUserCrashData = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Get current games
        const current = await getCurrentGame();

        // Check players array for user bet
        const userBet = lodash.find(current.players, { playerID: req.userId });

        res.json({
            bet: userBet ? userBet : null
        });
    } catch (error) {
        next(error);
    }
};

export const getServerCrashData = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Get current games
        const current = await getCurrentGame();
        const privateHash = await getPrivateHash();

        res.json({
            ...current,
            privateHash
        });
    } catch (error) {
        next(error);
    }
};
