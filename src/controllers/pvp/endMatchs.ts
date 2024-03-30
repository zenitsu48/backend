import * as md5 from 'md5';
import * as moment from 'moment';
import * as request from 'request';
import { Request, Response } from 'express';
import { checkBalance, generatInfo, getActiveBet, handleBet, NumberFix, ObjectId } from '../base';
import {
    SportsBets,
    Sessions,
    Balances,
    SportsBetting,
    SportsLists,
    SportsMatchs,
    Users,
    BetRooms,
    Currencies,
    SportsEndMatchs
} from '../../models';

/**
 * Match Winner 2-Way
 */
const get1X2 = ({ h_score, a_score, oddType }: { h_score: number; a_score: number; oddType: string }): string => {
    if (h_score === a_score && oddType === 'draw') {
        return 'WIN';
    } else if (h_score > a_score && oddType === 'home') {
        return 'WIN';
    } else if (h_score < a_score && oddType === 'away') {
        return 'WIN';
    } else {
        return 'LOST';
    }
};

/**
 * Draw No Bet (Cricket)
 */
const getDrawNoBet = ({ h_score, a_score, oddType }: { h_score: number; a_score: number; oddType: string }): string => {
    if (h_score === a_score) {
        return 'REFUND';
    } else if (h_score > a_score && oddType === 'home') {
        return 'WIN';
    } else if (h_score < a_score && oddType === 'away') {
        return 'WIN';
    } else {
        return 'LOST';
    }
};

/**
 * Asian Handicap
 */
const getHandicap = ({
    h_score,
    a_score,
    oddType,
    handicap
}: {
    h_score: number;
    a_score: number;
    oddType: string;
    handicap: number;
}): string => {
    const isFavorite = Number(handicap) > 0 ? true : false;
    const _handicap = Math.abs(handicap);
    let d_score = Math.floor(_handicap);
    let handicap_od = d_score < 1 ? _handicap : _handicap % d_score;
    if (oddType === 'home') {
        handicap_od = isFavorite ? handicap_od : handicap_od * -1;
        h_score = h_score + (isFavorite ? d_score : d_score * -1);
    } else if (oddType === 'away') {
        let temp = h_score;
        handicap_od = isFavorite ? handicap_od * -1 : handicap_od;
        h_score = a_score - (isFavorite ? d_score : d_score * -1);
        a_score = temp;
    }
    if (handicap_od === 0.25) {
        if (h_score > a_score) {
            return 'WIN';
        } else if (h_score === a_score) {
            return 'HALF_WIN';
        } else {
            return 'LOST';
        }
    } else if (handicap_od === 0.5) {
        if (h_score > a_score) {
            return 'WIN';
        } else if (h_score === a_score) {
            return 'WIN';
        } else {
            return 'LOST';
        }
    } else if (handicap_od === 0.75) {
        if (h_score > a_score) {
            return 'WIN';
        } else if (h_score === a_score) {
            return 'WIN';
        } else if (h_score + 1 === a_score) {
            return 'HALF_LOST';
        } else {
            return 'LOST';
        }
    } else if (handicap_od === -0.25) {
        if (h_score > a_score) {
            return 'WIN';
        } else if (h_score === a_score) {
            return 'HALF_LOST';
        } else {
            return 'LOST';
        }
    } else if (handicap_od === -0.5) {
        if (h_score > a_score) {
            return 'WIN';
        } else {
            return 'LOST';
        }
    } else if (handicap_od === -0.75) {
        if (h_score > a_score + 1) {
            return 'WIN';
        } else if (h_score === a_score + 1) {
            return 'HALF_WIN';
        } else {
            return 'LOST';
        }
    } else {
        if (h_score > a_score) {
            return 'WIN';
        } else if (h_score === a_score) {
            return 'REFUND';
        } else {
            return 'LOST';
        }
    }
};

/**
 * Over/Under
 */
const getOverUnder = ({ t_score, handicap, oddType }: { t_score: number; handicap: number; oddType: string }): string => {
    handicap = Math.abs(handicap);
    let d_score = Math.floor(handicap);
    let over_under = d_score < 1 ? handicap : handicap % d_score;
    if (oddType === 'under') {
        if (over_under === 0.25) {
            if (t_score < d_score) {
                return 'WIN';
            } else if (t_score === d_score) {
                return 'HALF_WIN';
            } else {
                return 'LOST';
            }
        } else if (over_under === 0.5) {
            if (t_score <= d_score) {
                return 'WIN';
            } else {
                return 'LOST';
            }
        } else if (over_under === 0.75) {
            if (t_score <= d_score) {
                return 'WIN';
            } else if (t_score === d_score + 1) {
                return 'HALF_LOST';
            } else {
                return 'LOST';
            }
        } else {
            if (t_score < d_score) {
                return 'WIN';
            } else if (t_score === d_score) {
                return 'REFUND';
            } else {
                return 'LOST';
            }
        }
    } else if (oddType === 'over') {
        if (over_under === 0.25) {
            if (t_score > d_score) {
                return 'WIN';
            } else if (t_score === d_score) {
                return 'HALF_LOST';
            } else {
                return 'LOST';
            }
        } else if (over_under === 0.5) {
            if (t_score > d_score) {
                return 'WIN';
            } else {
                return 'LOST';
            }
        } else if (over_under === 0.75) {
            if (t_score > d_score + 1) {
                return 'WIN';
            } else if (t_score === d_score + 1) {
                return 'HALF_WIN';
            } else {
                return 'LOST';
            }
        } else {
            if (t_score > d_score) {
                return 'WIN';
            } else if (t_score === d_score) {
                return 'REFUND';
            } else {
                return 'LOST';
            }
        }
    } else {
        return '';
    }
};

const getFScore = (scores: any) => {
    return scores[Object.keys(scores).sort().reverse()[0]];
};

const getSHScore = (scores: any) => {
    const f_score = scores[Object.keys(scores).sort()[0]];
    const home = Number(f_score.home);
    const away = Number(f_score.away);
    return { home, away, total: home + away };
};

const getCorner = (scores: number[]) => {
    if (scores && scores.length) {
        return Number(scores[0]) + Number(scores[1]);
    } else {
        return false;
    }
};

const getHandicapData = (handicap: any): number => {
    return handicap;
    return Number(handicap.split(',')[0]);
};

const getScores = ({
    SportId,
    scores,
    ss
}: {
    SportId: number;
    scores: { home: string; away: string }[];
    ss: string;
}): { h_score: number; a_score: number; t_score: number; state: boolean } => {
    let h_score = 0,
        a_score = 0,
        t_score = 0;
    const h_s = Number(ss.split('-')[0]);
    const a_s = Number(ss.split('-')[1]);
    if (SportId === 1) {
        if (Object.keys(scores).length === 3) {
            h_score = Object.values(scores)
                .slice(0, 2)
                .reduce((sum, { home }) => (sum += Number(home)), 0);
            a_score = Object.values(scores)
                .slice(0, 2)
                .reduce((sum, { away }) => (sum += Number(away)), 0);
            t_score = Number(h_score) + Number(a_score);
            if (Number(h_s) === h_score && Number(a_s) === a_score) {
                return { h_score, a_score, t_score, state: true };
            } else {
                return { h_score: 0, a_score: 0, t_score: 0, state: false };
            }
        } else {
            const f_score = getFScore(scores);
            h_score = Number(f_score.home);
            a_score = Number(f_score.away);
            t_score = h_score + a_score;
            if (Number(h_s) === h_score && Number(a_s) === a_score) {
                return { h_score, a_score, t_score, state: true };
            } else {
                return { h_score: 0, a_score: 0, t_score: 0, state: false };
            }
        }
    } else {
        return { h_score, a_score, t_score, state: false };
    }
};

const getProfit = ({ status, bet }: { status: string; bet: any }) => {
    if (status === 'WIN') {
        return bet.stake * bet.odd;
    } else if (status === 'LOST') {
        // return bet.stake * -1;
        return 0;
    } else if (status === 'REFUND') {
        return bet.stake;
    } else if (status === 'HALF_WIN') {
        return (bet.stake * bet.odd) / 2 + bet.stake / 2;
    } else if (status === 'HALF_LOST') {
        return bet.stake / 2;
    }
};

export const bettingSettled = async ({ bet, data }: { bet: any; data: any }) => {
    if (!bet || !data) {
        return { profit: 0, status: '', scores: {}, state: false };
    }
    const oddType = bet.oddType;
    const SportId = bet.SportId;
    const marketId = bet.marketId;
    let status = '' as string;
    const { h_score, a_score, t_score, state } = getScores({
        SportId,
        scores: data.scores,
        ss: data.ss
    });
    if (state) {
        if (marketId.indexOf('_1') !== -1 || marketId === '13_4') {
            if (SportId === 1) {
                status = get1X2({ h_score, a_score, oddType });
            }
        } else if (marketId.indexOf('_2') !== -1) {
            const handicap = getHandicapData(bet.handicap);
            status = getHandicap({ h_score, a_score, oddType, handicap });
        } else if (marketId.indexOf('_3') !== -1) {
            const handicap = getHandicapData(bet.handicap);
            status = getOverUnder({ t_score, oddType, handicap });
        } else if (marketId === '1_4') {
            const corner = getCorner(data.stats?.corners);
            const handicap = getHandicapData(bet.handicap);
            if (corner) {
                status = getOverUnder({ t_score: corner, oddType, handicap });
            } else {
                status = 'REFUND';
            }
        } else if (marketId === '1_5') {
            const { home, away } = getSHScore(data.scores);
            const handicap = getHandicapData(bet.handicap);
            status = getHandicap({
                h_score: home,
                a_score: away,
                oddType,
                handicap
            });
        } else if (marketId === '1_6') {
            const { total } = getSHScore(data.scores);
            const handicap = getHandicapData(bet.handicap);
            status = getOverUnder({ t_score: total, oddType, handicap });
        } else if (marketId === '1_7') {
            const corner = getCorner(data.stats.corner_h);
            const handicap = getHandicapData(bet.handicap);
            if (corner) {
                status = getOverUnder({ t_score: corner, oddType, handicap });
            } else {
                status = 'REFUND';
            }
        } else if (marketId === '1_8') {
            const { home, away } = getSHScore(data.scores);
            status = get1X2({ h_score: home, a_score: away, oddType });
        }
        const profit = getProfit({ status, bet });
        const scores = { home: h_score, away: a_score, total: t_score };
        return { profit, status, scores, state };
    } else {
        return { profit: 0, status: '', scores: {}, state: false };
    }
};
