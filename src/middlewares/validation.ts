import * as Joi from 'joi';
import * as Validation from 'express-joi-validation';
import { Request, Response, NextFunction } from 'express';

export const V = Validation.createValidator({ passError: true });

export const RetrunValidation = (error: any, req: Request, res: Response, next: NextFunction) => {
    if (error && error.error && error.value && error.type) {
        return res.status(400).json(error.error.toString().replace('Error: ', ''));
    } else {
        return next(error);
    }
};

export const Validator = {
    ObjectId: Joi.object({
        id: Joi.string().min(24).max(24).required()
    }),
    UserId: Joi.object({
        userId: Joi.string().min(24).max(24).required()
    }),
    EventId: Joi.object({
        id: Joi.number().required()
    }),
    Users: {
        Auth: {
            Signin: Joi.object({
                email: Joi.string().min(1).max(30).required(),
                password: Joi.string().min(1).max(30).required(),
            }),
            Signup: Joi.object({
                email: Joi.string().email().required(),
                username: Joi.string().min(6).max(30).required(),
                password: Joi.string().min(8).max(30).required(),
                iReferral: Joi.string().allow('', null).optional(),
                rReferral: Joi.string().allow('', null).optional()
            }),
            CheckAddress: Joi.object({
                publicAddress: Joi.string().min(42).max(44).required()
            }),
            SigninAddress: Joi.object({
                publicAddress: Joi.string().min(42).max(44).required(),
                signature: Joi.string().min(1).required()
            }),
            SignupAddress: Joi.object({
                publicAddress: Joi.string().min(42).max(44).required(),
                iReferral: Joi.string().allow('', null).optional(),
                rReferral: Joi.string().allow('', null).optional(),
                defaultCurrency: Joi.string().optional()
            }),
            Forgot: Joi.object({
                email: Joi.string().email().required(),
                recaptcha: Joi.string().min(1).required()
            }),
            ChangePassword: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                'Current Password': Joi.string().min(1).required(),
                Password: Joi.string().min(8).max(30).message('').required()
            }),
            PasswordReset: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                token: Joi.string().min(1).required(),
                password: Joi.string().min(8).max(30).required()
            }),
            Info: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                update: Joi.boolean().required(),
                _id: Joi.string().min(24).max(24).optional(),
                email: Joi.string().min(1).optional(),
                username: Joi.string().min(1).optional(),
                avatar: Joi.string().min(1).allow('', null).optional(),
                cryptoAccount: Joi.string().min(42).max(44).optional(),
                publicAddress: Joi.string().min(42).max(44).optional(),
                oddsformat: Joi.string().optional(),
                iReferral: Joi.string().allow('', null).optional(),
                rReferral: Joi.string().allow('', null).optional()
            })
        },
        Admin: {
            Signin: Joi.object({
                email: Joi.string().max(30).required(),
                password: Joi.string().min(8).max(30).required()
            }),
            Signup: Joi.object({
                email: Joi.string().max(30).required(),
                username: Joi.string().min(6).max(30).required(),
                password: Joi.string().min(8).max(30).required()
            }),
            ChangePassword: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                newpass: Joi.string().min(8).max(30).required()
            }),
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional(),
                country: Joi.string().min(2).max(2).optional(),
                status: Joi.boolean().optional(),
                userId: Joi.string().min(24).max(24).optional(),
                permission: Joi.string().min(24).max(24).optional(),
                date: Joi.array().optional()
            })
        },
        Permission: {
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                order: Joi.number().min(0).optional(),
                title: Joi.string().min(1).max(30).optional()
            }),
            Create: Joi.object({
                order: Joi.number().min(0).required(),
                title: Joi.string().min(1).max(30).required()
            })
        },
        Session: {
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional(),
                userId: Joi.string().min(24).max(24).optional(),
                date: Joi.array().optional()
            }),
            Create: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                socketId: Joi.string().min(1).optional(),
                accessToken: Joi.string().min(1).required(),
                refreshToken: Joi.string().min(1).optional(),
                passwordToken: Joi.string().min(1).optional(),
                expiration: Joi.date().required(),
                ip: Joi.string().min(1).optional(),
                country: Joi.string().min(2).max(2).optional(),
                range: Joi.object().optional(),
                useragent: Joi.object().optional()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                userId: Joi.string().min(24).max(24).optional(),
                socketId: Joi.string().min(1).optional(),
                accessToken: Joi.string().min(1).optional(),
                refreshToken: Joi.string().min(1).optional(),
                passwordToken: Joi.string().min(1).optional(),
                expiration: Joi.date().optional(),
                ip: Joi.string().min(1).optional(),
                country: Joi.string().min(2).max(2).optional(),
                range: Joi.object().optional(),
                useragent: Joi.object().optional()
            })
        },
        LoginHistory: {
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional(),
                userId: Joi.string().min(24).max(24).optional(),
                country: Joi.string().min(2).max(2).optional(),
                date: Joi.array().optional()
            }),
            Create: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                ip: Joi.string().min(1).required(),
                country: Joi.string().min(2).max(2).required(),
                range: Joi.object().required(),
                useragent: Joi.object().required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                userId: Joi.string().min(24).max(24).optional(),
                ip: Joi.string().min(1).optional(),
                country: Joi.string().min(2).max(2).optional(),
                range: Joi.object().optional(),
                useragent: Joi.object().optional()
            })
        }
    },
    Files: {
        DeleteURI: Joi.object({
            uri: Joi.string().min(1).optional()
        })
    },
    Sports: {
        Bets: {
            List: Joi.object({
                betId: Joi.string().min(24).max(24).optional(),
                userId: Joi.string().min(24).max(24).optional(),
                SportId: Joi.number().optional(),
                currency: Joi.string().min(24).max(24).optional(),
                type: Joi.string().valid('multi', 'single').optional(),
                status: Joi.string().valid('BET', 'SETTLED', 'LOST', 'WIN', 'HALF_WIN', 'HALF_LOST', 'REFUND', 'CANCEL').optional(),
                sort: Joi.number().valid(-1, 1).optional(),
                column: Joi.string().min(1).optional(),
                date: Joi.array().optional(),
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional()
            }),
            Create: Joi.object({
                betsId: Joi.string().min(32).max(32).required(),
                userId: Joi.string().min(24).max(24).required(),
                currency: Joi.string().min(24).max(24).required(),
                odds: Joi.number().min(1).required(),
                stake: Joi.string().min(0).required(),
                profit: Joi.string().min(0).required(),
                potential: Joi.string().min(0).required(),
                betType: Joi.number().required(),
                type: Joi.string().valid('multi', 'single').required(),
                status: Joi.string().valid('BET', 'SETTLED', 'LOST', 'WIN', 'HALF_WIN', 'HALF_LOST', 'REFUND', 'CANCEL').required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                betsId: Joi.string().min(32).max(32).optional(),
                userId: Joi.string().min(24).max(24).optional(),
                currency: Joi.string().min(24).max(24).optional(),
                odds: Joi.number().min(1).optional(),
                stake: Joi.string().min(0).optional(),
                profit: Joi.string().min(0).optional(),
                potential: Joi.string().min(0).optional(),
                betType: Joi.number().optional(),
                type: Joi.string().valid('multi', 'single').optional(),
                status: Joi.string().valid('BET', 'SETTLED', 'LOST', 'WIN', 'HALF_WIN', 'HALF_LOST', 'REFUND', 'CANCEL').optional()
            })
        },
        Lists: {
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional()
            }),
            Create: Joi.object({
                SportId: Joi.number().required(),
                SportName: Joi.string().required(),
                icon: Joi.string().required(),
                color: Joi.string().required(),
                draw: Joi.boolean().required(),
                live: Joi.boolean().required(),
                upcoming: Joi.boolean().required(),
                status: Joi.boolean().required(),
                order: Joi.number().required(),
                img: Joi.string().allow('', null).optional()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                SportId: Joi.number().optional(),
                SportName: Joi.string().optional(),
                icon: Joi.string().optional(),
                color: Joi.string().optional(),
                draw: Joi.boolean().optional(),
                live: Joi.boolean().optional(),
                upcoming: Joi.boolean().optional(),
                status: Joi.boolean().optional(),
                order: Joi.number().optional(),
                img: Joi.string().allow('', null).optional()
            })
        },
        Betting: {
            List: Joi.object({
                betId: Joi.string().min(24).max(24).optional(),
                eventId: Joi.number().optional(),
                SportId: Joi.number().optional(),
                oddType: Joi.string().optional(),
                status: Joi.string().valid('BET', 'SETTLED', 'LOST', 'WIN', 'HALF_WIN', 'HALF_LOST', 'REFUND', 'CANCEL').optional(),
                timeStatus: Joi.number().optional(),
                sort: Joi.number().valid(-1, 1).optional(),
                column: Joi.string().min(1).optional(),
                date: Joi.array().optional(),
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional()
            }),
            Create: Joi.object({
                betId: Joi.string().min(24).max(24).required(),
                eventId: Joi.number().required(),
                stake: Joi.number().required(),
                profit: Joi.number().required(),
                SportId: Joi.number().required(),
                SportName: Joi.string().required(),
                LeagueId: Joi.number().required(),
                LeagueName: Joi.string().required(),
                TimeStatus: Joi.number().required(),
                Time: Joi.date().required(),
                AwayTeam: Joi.string().required(),
                HomeTeam: Joi.string().required(),
                marketId: Joi.string().required(),
                marketName: Joi.string().required(),
                oddId: Joi.number().required(),
                oddName: Joi.string().required(),
                oddType: Joi.string().required(),
                odds: Joi.number().required(),
                oddData: Joi.object().required(),
                scores: Joi.object().required(),
                status: Joi.string().valid('BET', 'SETTLED', 'LOST', 'WIN', 'HALF_WIN', 'HALF_LOST', 'REFUND', 'CANCEL').required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                betId: Joi.string().min(24).max(24).optional(),
                eventId: Joi.number().optional(),
                stake: Joi.number().optional(),
                profit: Joi.number().optional(),
                SportId: Joi.number().optional(),
                SportName: Joi.string().optional(),
                LeagueId: Joi.number().optional(),
                LeagueName: Joi.string().optional(),
                TimeStatus: Joi.number().optional(),
                Time: Joi.date().optional(),
                AwayTeam: Joi.string().optional(),
                HomeTeam: Joi.string().optional(),
                marketId: Joi.string().optional(),
                marketName: Joi.string().optional(),
                oddId: Joi.number().optional(),
                oddName: Joi.string().optional(),
                oddType: Joi.string().optional(),
                odds: Joi.number().optional(),
                oddData: Joi.object().optional(),
                scores: Joi.object().optional(),
                status: Joi.string().valid('BET', 'SETTLED', 'LOST', 'WIN', 'HALF_WIN', 'HALF_LOST', 'REFUND', 'CANCEL').optional()
            }),
            Event: Joi.object({
                eventId: Joi.number().required()
            })
        },
        Leagues: {
            AllActive: Joi.object({
                status: Joi.boolean().required()
            }),
            List: Joi.object({
                SportId: Joi.number().optional(),
                status: Joi.boolean().optional(),
                country: Joi.string().min(2).max(2).optional(),
                has_toplist: Joi.number().optional(),
                has_leaguetable: Joi.number().optional(),
                q: Joi.string().optional(),
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional()
            }),
            Create: Joi.object({
                id: Joi.number().required(),
                sport_id: Joi.number().required(),
                name: Joi.string().required(),
                cc: Joi.string().required(),
                has_leaguetable: Joi.string().required(),
                has_toplist: Joi.string().required(),
                status: Joi.boolean().required(),
                order: Joi.number().required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                id: Joi.number().allow('', null).optional(),
                sport_id: Joi.number().allow('', null).optional(),
                name: Joi.string().allow('', null).optional(),
                sport: Joi.any().allow('', null).optional(),
                cc: Joi.string().min(2).max(2).allow('', null).optional(),
                has_leaguetable: Joi.string().allow('', null).optional(),
                has_toplist: Joi.string().allow('', null).optional(),
                status: Joi.boolean().allow('', null).optional(),
                order: Joi.number().allow('', null).optional()
            })
        },
        Matchs: {
            List: Joi.object({
                eventId: Joi.number().optional(),
                SportId: Joi.number().optional(),
                date: Joi.array().optional(),
                timeStatus: Joi.number().optional(),
                hide: Joi.boolean().optional(),
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional()
            }),
            Create: Joi.object({
                id: Joi.number().required(),
                sport_id: Joi.number().required(),
                time: Joi.number().required(),
                time_status: Joi.number().required(),
                league: Joi.object({
                    id: Joi.number().required(),
                    name: Joi.string().required(),
                    cc: Joi.string().allow(null).optional()
                }),
                home: Joi.object({
                    id: Joi.number().required(),
                    name: Joi.string().required(),
                    image_id: Joi.number().allow(null).optional(),
                    cc: Joi.string().allow(null).optional()
                }),
                away: Joi.object({
                    id: Joi.number().required(),
                    name: Joi.string().required(),
                    image_id: Joi.number().allow(null).optional(),
                    cc: Joi.string().allow(null).optional()
                }),
                ss: Joi.string().required(),
                points: Joi.string().optional(),
                playing_indicator: Joi.string().optional(),
                scores: Joi.object().optional(),
                stats: Joi.object().optional(),
                extra: Joi.object().optional(),
                events: Joi.object().optional(),
                timer: Joi.object().optional(),
                has_lineup: Joi.number().optional(),
                inplay_created_at: Joi.number().optional(),
                inplay_updated_at: Joi.number().optional(),
                confirmed_at: Joi.number().optional(),
                odds: Joi.object().optional(),
                astatus: Joi.boolean().optional()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                id: Joi.number().optional(),
                sport_id: Joi.number().optional(),
                time: Joi.number().optional(),
                time_status: Joi.number().optional(),
                league: Joi.object({
                    id: Joi.number().optional(),
                    name: Joi.string().optional(),
                    cc: Joi.string().allow(null).optional()
                }),
                home: Joi.object({
                    id: Joi.number().optional(),
                    name: Joi.string().optional(),
                    image_id: Joi.number().allow(null).optional(),
                    cc: Joi.string().allow(null).optional()
                }),
                away: Joi.object({
                    id: Joi.number().optional(),
                    name: Joi.string().optional(),
                    image_id: Joi.number().allow(null).optional(),
                    cc: Joi.string().allow(null).optional()
                }),
                ss: Joi.string().allow(null, '').optional(),
                points: Joi.string().optional(),
                playing_indicator: Joi.string().optional(),
                scores: Joi.object().optional(),
                stats: Joi.object().optional(),
                extra: Joi.object().optional(),
                events: Joi.array().optional(),
                timer: Joi.object().optional(),
                has_lineup: Joi.number().optional(),
                inplay_created_at: Joi.number().optional(),
                inplay_updated_at: Joi.number().optional(),
                confirmed_at: Joi.number().optional(),
                odds: Joi.object().optional(),
                count: Joi.number().optional(),
                sport: Joi.object().optional(),
                status: Joi.boolean().optional(),
                astatus: Joi.boolean().optional()
            })
        },
        Bet: {
            Result: Joi.object({
                _id: Joi.string().min(24).max(24).required(),
                status: Joi.string().valid('BET', 'SETTLED', 'LOST', 'WIN', 'HALF_WIN', 'HALF_LOST', 'REFUND', 'CANCEL').required()
            }),
            Lists: Joi.object({
                EventStatus: Joi.string().valid('LIVE', 'HOUR', 'TODAY', 'PRE').optional()
            }),
            Odds: Joi.object({
                id: Joi.number().required()
            }),
            Matchs: Joi.object({
                SportId: Joi.number().required(),
                EventStatus: Joi.string().valid('LIVE', 'HOUR', 'TODAY', 'PRE').optional()
            }),
            BetHistory: Joi.object({
                betsId: Joi.string().min(32).max(32).required()
            }),
            Bet: Joi.object({
                type: Joi.string().valid('multi', 'single').required(),
                userId: Joi.string().min(24).max(24).required(),
                currency: Joi.string().min(24).max(24).required(),
                stake: Joi.number().required(),
                data: Joi.any().required()
            }),
            History: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                status: Joi.string().valid('Active', 'Settled').required()
            }),
            CashOut: Joi.object({
                betId: Joi.string().min(24).max(24).required()
            })
        }
    },
    Games: {
        Providers: {
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional()
            }),
            Create: Joi.object({
                name: Joi.string().required(),
                symbol: Joi.string().required(),
                currency: Joi.string().required(),
                inputPercentage: Joi.number().required(),
                outputPercentage: Joi.number().required(),
                order: Joi.number().required(),
                status: Joi.boolean().required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                Name: Joi.string().optional(),
                System: Joi.string().optional(),
                Categories: Joi.array().optional(),
                order: Joi.number().optional(),
                Status: Joi.boolean().optional()
            })
        },
        Lists: {
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional(),
                providerId: Joi.string().min(0)
            }),
            Create: Joi.object({
                id: Joi.string().required(),
                name: Joi.string().required(),
                type: Joi.string().required(),
                icon: Joi.string().required(),
                providerId: Joi.string().min(24).max(24).required(),
                overlay: Joi.string().allow('').optional(),
                img: Joi.string().allow('').optional(),
                order: Joi.number().required(),
                rtp: Joi.number().required(),
                status: Joi.boolean().required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                id: Joi.string().optional(),
                name: Joi.string().optional(),
                type: Joi.string().optional(),
                icon: Joi.string().optional(),
                providerId: Joi.string().min(24).max(24).optional(),
                overlay: Joi.string().allow('').optional(),
                img: Joi.string().allow('').optional(),
                order: Joi.number().optional(),
                rtp: Joi.number().optional(),
                status: Joi.boolean().optional()
            })
        },
        Games: {
            List: Joi.object({
                cases: Joi.string().min(3).max(24).optional(),
                userId: Joi.string().min(24).max(24).optional(),
                currency: Joi.string().min(3).max(24).optional(),
                gameId: Joi.string().min(0).max(15).optional(),
                providerId: Joi.string().min(1).max(24).optional(),
                status: Joi.string().valid('BET', 'WIN').optional(),
                sort: Joi.number().valid(-1, 1).optional(),
                column: Joi.string().min(1).optional(),
                date: Joi.array().optional(),
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional()
            }),
            Create: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                currency: Joi.string().min(24).max(24).required(),
                providerId: Joi.string().min(24).max(24).required(),
                gameId: Joi.string().min(24).max(24).required(),
                odds: Joi.number().required(),
                amount: Joi.number().required(),
                profit: Joi.number().required(),
                betting: Joi.any().required(),
                aBetting: Joi.any().required(),
                status: Joi.string().valid('BET', 'DRAW', 'LOST', 'WIN').required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                userId: Joi.string().min(24).max(24).optional(),
                currency: Joi.string().min(24).max(24).optional(),
                providerId: Joi.string().min(24).max(24).optional(),
                gameId: Joi.string().min(24).max(24).optional(),
                odds: Joi.number().optional(),
                amount: Joi.number().optional(),
                profit: Joi.number().optional(),
                betting: Joi.any().optional(),
                aBetting: Joi.any().optional(),
                status: Joi.string().valid('BET', 'DRAW', 'LOST', 'WIN').optional()
            })
        }
    },
    Payments: {
        Payments: {
            ApproveWithdrawal: Joi.object({
                paymentId: Joi.string().min(24).max(24).required(),
                txn_id: Joi.string().min(0).max(68),
                status: Joi.string().valid('approve', 'confirmed', 'pending', 'canceled').required(),
                type: Joi.number().optional(),
                address: Joi.string().min(0).max(68).optional(),
                amount: Joi.string().optional(),
                currencyId: Joi.string().optional()
            }),
            Create: Joi.object({
                balanceId: Joi.string().min(24).max(24).required(),
                currencyId: Joi.string().min(24).max(24).required(),
                userId: Joi.string().min(24).max(24).required(),
                address: Joi.string().required(),
                amount: Joi.number().required(),
                amounti: Joi.number().required(),
                currency: Joi.string().optional(),
                id: Joi.string().optional(),
                ipn_id: Joi.string().optional(),
                ipn_mode: Joi.string().optional(),
                ipn_type: Joi.string().optional(),
                merchant: Joi.string().optional(),
                status_text: Joi.string().optional(),
                txn_id: Joi.string().optional(),
                status: Joi.number().required(),
                method: Joi.number().required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                balanceId: Joi.string().min(24).max(24).optional(),
                currencyId: Joi.string().min(24).max(24).optional(),
                userId: Joi.string().min(24).max(24).optional(),
                address: Joi.string().optional(),
                amount: Joi.number().optional(),
                amounti: Joi.number().optional(),
                currency: Joi.string().optional(),
                id: Joi.string().optional(),
                ipn_id: Joi.string().optional(),
                ipn_mode: Joi.string().optional(),
                ipn_type: Joi.string().optional(),
                merchant: Joi.string().optional(),
                status_text: Joi.string().optional(),
                txn_id: Joi.string().optional(),
                status: Joi.number().optional(),
                method: Joi.number().optional()
            }),
            List: Joi.object({
                userId: Joi.string().min(24).max(24).optional(),
                currency: Joi.string().min(24).max(24).optional(),
                type: Joi.string().valid('deposit', 'withdrawal').optional(),
                method: Joi.number().optional(),
                sort: Joi.number().valid(-1, 1).optional(),
                column: Joi.string().min(1).optional(),
                date: Joi.array().optional(),
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional()
            })
        },
        Currency: {
            Create: Joi.object({
                order: Joi.number().allow('').optional(),
                officialLink: Joi.string().allow('').optional(),
                name: Joi.string().required(),
                symbol: Joi.string().required(),
                icon: Joi.string().required(),
                decimals: Joi.number().required(),
                payment: Joi.string().allow('').optional(),
                coingecko: Joi.string().allow('').optional(),
                buyUrl: Joi.string().allow('').optional(),
                price: Joi.number().allow('').optional(),
                minDeposit: Joi.number().optional(),
                minWithdraw: Joi.number().optional(),
                minBet: Joi.number().optional(),
                maxBet: Joi.number().optional(),
                betLimit: Joi.number().optional(),
                adminAddress: Joi.string().allow('').optional(),
                contractAddress: Joi.string().allow('').optional(),
                network: Joi.string().allow('').optional(),
                abi: Joi.array().allow('').optional(),
                type: Joi.number().required(),
                status: Joi.boolean().required(),
                deposit: Joi.boolean().required(),
                withdrawal: Joi.boolean().required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                order: Joi.number().allow('').optional(),
                officialLink: Joi.string().allow('').optional(),
                name: Joi.string().optional(),
                symbol: Joi.string().optional(),
                icon: Joi.string().optional(),
                decimals: Joi.number().optional(),
                payment: Joi.string().allow('').optional(),
                coingecko: Joi.string().allow('').optional(),
                buyUrl: Joi.string().allow('').optional(),
                price: Joi.number().allow('').optional(),
                minDeposit: Joi.number().optional(),
                minWithdraw: Joi.number().optional(),
                minBet: Joi.number().optional(),
                maxBet: Joi.number().optional(),
                betLimit: Joi.number().optional(),
                adminAddress: Joi.string().allow('').optional(),
                contractAddress: Joi.string().allow('').optional(),
                network: Joi.string().allow('').optional(),
                abi: Joi.array().allow('').optional(),
                type: Joi.number().optional(),
                status: Joi.boolean().optional(),
                deposit: Joi.boolean().optional(),
                withdrawal: Joi.boolean().optional()
            }),
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional()
            })
        },
        Balances: {
            Create: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                currency: Joi.string().min(24).max(24).required(),
                balance: Joi.number().required(),
                status: Joi.boolean().required(),
                disabled: Joi.boolean().required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                userId: Joi.string().min(24).max(24).optional(),
                currency: Joi.string().min(24).max(24).optional(),
                balance: Joi.number().optional(),
                status: Joi.boolean().optional(),
                disabled: Joi.boolean().optional()
            }),
            List: Joi.object({
                userId: Joi.string().min(24).max(24).optional(),
                currency: Joi.string().min(24).max(24).optional(),
                hide: Joi.boolean().optional(),
                sort: Joi.number().valid(-1, 1).optional(),
                column: Joi.string().min(1).optional(),
                date: Joi.array().optional(),
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional()
            })
        },
        BalanceHistory: {
            Create: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                currency: Joi.string().min(24).max(24).required(),
                amount: Joi.number().required(),
                type: Joi.string().required()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                userId: Joi.string().min(24).max(24).optional(),
                currency: Joi.string().min(24).max(24).optional(),
                amount: Joi.number().optional(),
                type: Joi.string().optional()
            }),
            List: Joi.object({
                userId: Joi.string().min(24).max(24).optional(),
                currency: Joi.string().min(24).max(24).optional(),
                type: Joi.string()
                    .valid(
                        'deposit-metamask',
                        'withdrawal-metamask',
                        'withdrawal-metamask-canceled',
                        'deposit-admin',
                        'withdrawal-admin',
                        'sports-single-bet',
                        'sports-single-settled',
                        'sports-multi-bet',
                        'sports-multi-settled',
                        'referral-bonus'
                    )
                    .optional(),
                sort: Joi.number().valid(-1, 1).optional(),
                column: Joi.string().min(1).optional(),
                date: Joi.array().optional(),
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional()
            })
        },
        Payment: {
            UpdateBalance: Joi.object({
                balanceId: Joi.string().min(24).max(24).required(),
                amount: Joi.number().required(),
                type: Joi.string().required()
            }),
            Deposit: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                balanceId: Joi.string().min(24).max(24).required(),
                currencyId: Joi.string().min(24).max(24).required()
            }),
            Withdrawal: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                balanceId: Joi.string().min(24).max(24).required(),
                currencyId: Joi.string().min(24).max(24).required(),
                address: Joi.string().required(),
                method: Joi.number().required(),
                amount: Joi.number().required()
            }),
            CancelWithdrawal: Joi.object({
                _id: Joi.string().min(24).max(24).required(),
                userId: Joi.string().min(24).max(24).required()
            }),
            Currency: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                currency: Joi.string().min(24).max(24).required()
            }),
            MetamaskDeposit: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                balanceId: Joi.string().min(24).max(24).required(),
                currencyId: Joi.string().min(24).max(24).required(),
                txn_id: Joi.string().min(66).max(66).required(),
                amounti: Joi.any().required(),
                address: Joi.string().required(),
                from: Joi.string().required()
            }),
            SolanaDeposit: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                balanceId: Joi.string().min(24).max(24).required(),
                currencyId: Joi.string().min(24).max(24).required(),
                txn_id: Joi.string().min(50).max(100).required(),
                address: Joi.string().required(),
                from: Joi.string().required()
            })
        }
    },
    Report: {
        Report: Joi.object({
            date: Joi.array().required(),
            type: Joi.string().optional(),
            userId: Joi.string().min(24).max(24).optional()
        }),
        User: Joi.object({
            userId: Joi.string().min(24).max(24).optional(),
            date: Joi.array().required()
        }),
    },
    Reward: {
        Update: Joi.object({
            rewards: Joi.array().required()
        })
    },
    Languages: {
        Languages: {
            Create: Joi.object({
                label: Joi.string().required(),
                value: Joi.string().required(),
                code: Joi.string().optional()
            }),
            Update: Joi.object({
                _id: Joi.string().min(24).max(24).optional(),
                __v: Joi.number().optional(),
                createdAt: Joi.date().optional(),
                updatedAt: Joi.date().optional(),
                label: Joi.string().optional(),
                value: Joi.string().optional(),
                code: Joi.string().optional()
            })
        },
        Language: {
            ID: Joi.object({
                id: Joi.string().required()
            }),
            Word: Joi.object({
                data: Joi.object().required()
            })
        }
    },
    Pvp: {
        Bet: {
            Create: Joi.object({
                token: Joi.string().required(),
                id: Joi.number().optional(),
                amount: Joi.number().min(0.01).optional(),
                winner: Joi.number().min(0).max(2).required(),
                type: Joi.number().min(0).max(9).required()
            }),
            Join: Joi.object({
                token: Joi.string().required(),
                id: Joi.number().optional(),
                roomId: Joi.string().optional(),
                winner: Joi.number().min(0).max(2).required()
            }),
            GetRoom: Joi.object({
                id: Joi.number().optional()
            })
        }
    },
    P2p: {
        Bet: {
            Create: Joi.object({
                ownerId: Joi.string().min(24).max(24).required(),
                currency: Joi.string().min(24).max(24).optional(),
                min: Joi.number().min(0).required(),
                max: Joi.number().min(0).required(),
                option: Joi.object().required(),
                content: Joi.string().required(),
                avatar: Joi.string().optional(),
                expire: Joi.string().required()
            }),
            Join: Joi.object({
                userId: Joi.string().min(24).max(24).required(),
                currencyId: Joi.string().min(24).max(24).optional(),
                poolId: Joi.string().min(24).max(24).required(),
                stake: Joi.number().min(0).required(),
                type: Joi.number().required(),
            }),
            Settle: Joi.object({
                poolId: Joi.string().min(24).max(24).required(),
                status: Joi.string().required(),
                type: Joi.number().required(),
                losttype: Joi.number().required(),
            }),
            List: Joi.object({
                pageSize: Joi.number().min(1).max(100).optional(),
                page: Joi.number().min(0).optional(),
                status: Joi.string().optional(),
                ownerId: Joi.string().min(24).max(24).optional(),
                date: Joi.array().optional(),
                sort: Joi.number().valid(-1, 1).optional(),
                column: Joi.string().min(1).optional(),
            })
        }
    },
    Transactions: {
        get: Joi.object({
            userId: Joi.string().min(24).max(24).required(),
            pageIndex: Joi.number().required()
        })
    } 
};
