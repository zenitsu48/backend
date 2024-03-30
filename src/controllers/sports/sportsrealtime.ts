import * as moment from 'moment';
import * as request from 'request';
import { SportsMatchs, SportsLists, SportsEndMatchs, SportsLeagues, SportsFixMatchs, SportsBetting, BetRooms } from '../../models';

const token = process.env.SPORTSBOOK_APIKEY;
let count = 0;
let ecount = 0;
let ecount1 = 0;
let scount = 0;
export const getLeaguePage = (sport_id: number) => {
    const options = {
        method: 'GET',
        url: process.env.LEAGUE_ENDPOINT as string,
        qs: { token, sport_id, skip_esports: 'Esports' },
        headers: { 'Content-Type': 'application/json' },
        body: { page: 1, skip_markets: 1 },
        json: true
    };
    request(options, (error: any, response: any, body: any) => {
        if (error) {
            ecount++;
        } else {
            count++;
            const data = body;
            if (!data || !data?.pager) return console.log(data);
            const pager = data.pager;
            const page = Math.ceil(pager.total / pager.per_page);
            for (let i = 0; i < page; i++) {
                getLeague(sport_id, i + 1);
            }
        }
    });
};

export const getEndedDate = (event_id: number) => {
    return new Promise(async (resolve, reject) => {
        const options = {
            method: 'GET',
            url: process.env.ENDED_ENDPOINT as string,
            headers: { 'Content-Type': 'application/json' },
            qs: { token, event_id, skip_esports: 'Esports' },
            json: true
        };
        request(options, async (error: any, response: any, body: any) => {
            if (error) {
                reject(error);
            } else {
                if (body && body.success && body.results.length) {
                    const result = body.results[0];
                    let data = {} as any;
                    if (result.time_status) {
                        data.time_status = Number(result.time_status);
                    }
                    if (result.time) {
                        data.time = Number(result.time);
                    }
                    if (result.scores) {
                        data.scores = result.scores;
                    }
                    if (result.events) {
                        data.events = result.events;
                    }
                    if (result.extra) {
                        data.extra = result.extra;
                    }
                    if (result.extra) {
                        data.extra = result.extra;
                    }
                    if (result.stats) {
                        data.stats = result.stats;
                    }
                    if (result.ss) {
                        data.ss = result.ss;
                    }
                    try {
                        await SportsEndMatchs.updateOne({ id: Number(result.id) }, data);
                    } catch (error) {
                        reject(error);
                    }
                    resolve(result);
                } else {
                    reject(body);
                }
            }
        });
    });
};

export const filterHorseOdds = async (odds: any) => {
    return new Promise(async (resolve, reject) => {
        let latestAddTime: any = {}
        for (let i = 0; i < odds["2_1"].length; i++) {
            const odd = odds["2_1"][i];

            if (!latestAddTime[odd.team_id] || odd.add_time > latestAddTime[odd.team_id].add_time) {
                latestAddTime[odd.team_id] = { team_id: odd.team_id, add_time: odd.add_time, od: odd.od, id: odd.id };
            }
        }

        const latestAddTimeArray = Object.values(latestAddTime);
        resolve(latestAddTimeArray);
    });
}

export const filterOdds = async (data: any) => {
    return new Promise(async (resolve, reject) => {
        let odds = {} as any;
        for (const i in data) {
            if (data[i] && data[i].length) {
                odds[i] = data[i].sort((a: any, b: any) => Number(b.add_time) - Number(a.add_time))[0];
            }
        }
        resolve(odds);
    });
};

const filterLiveOdds = async (odds: any, oldOdds: any) => {
    return new Promise(async (resolve, reject) => {
        if (!odds) {
            resolve({});
        }
        for (const i in odds) {
            if (!oldOdds) {
                odds[i].notUpdate = 0;
            } else {
                try {
                    let notUpdate = oldOdds[i] && oldOdds[i] && oldOdds[i]?.notUpdate ? oldOdds[i].notUpdate : 0;
                    if (odds[i]?.time_str && odds[i].time_str != oldOdds[i].time_str) {
                        notUpdate = 0;
                    } else if (odds[i]?.add_time && odds[i].add_time != oldOdds[i].add_time) {
                        notUpdate = 0;
                    } else {
                        notUpdate++;
                    }
                    odds[i].notUpdate = notUpdate;
                } catch (error) {
                    odds[i].notUpdate = 0;
                }
            }
        }
        resolve(odds);
    });
};

const getOdds = (event_id: number, sport_id: number, isLive: boolean, time = 20) => {
    return new Promise(async (resolve, reject) => {
        if (event_id == 0) return resolve('error');
        setTimeout(() => {
            resolve(event_id);
        }, time);
        const options = {
            method: 'GET',
            url: process.env.ODDS_ENDPOINT as string,
            headers: { 'Content-Type': 'application/json' },
            qs: { event_id, token, skip_esports: 'Esports' },
            json: true
        };
        request(options, async (error: any, response: any, body: any) => {
            if (error) {
                ecount++;
            } else {
                count++;
                if (body && body.success && body.results && body.results.odds) {
                    try {

                        if (sport_id === 2) {
                            let newOdds = await filterHorseOdds(body.results.odds);
                            console.log(newOdds, "newOdds", event_id)
                            await SportsMatchs.updateOne({ id: event_id }, { horse_odds: newOdds });
                        } else {
                            let newOdds = await filterOdds(body.results.odds);

                            if (isLive) {
                                const sportsMatchs = await SportsMatchs.findOne({
                                    id: event_id
                                });
                                const odds = await filterLiveOdds(newOdds, sportsMatchs?.odds);
                                await SportsMatchs.updateOne({ id: event_id }, { odds });
                            } else {
                                await SportsMatchs.updateOne({ id: event_id }, { odds: newOdds });
                            }
                            scount++;
                        }
                    } catch (error) {
                        console.log(`getOdds update error`, error);
                        ecount1++;
                    }
                }
            }
        });
    });
};

const getLeague = (sport_id: number, page: number) => {
    const options = {
        method: 'GET',
        url: process.env.LEAGUE_ENDPOINT as string,
        headers: { 'Content-Type': 'application/json' },
        qs: { token, sport_id, skip_esports: 'Esports' },
        body: { page },
        json: true
    };
    request(options, async (error: any, response: any, body: any) => {
        if (error) {
            ecount++;
        } else {
            count++;
            if (body && body.success && body.results.length) {
                const results = body.results;
                for (const i in results) {
                    let result = results[i];
                    result.sport_id = sport_id;
                    try {
                        await SportsLeagues.updateOne({ id: result.id }, result, {
                            upsert: true
                        });
                    } catch (error) {
                        console.log('getLeague => update', error);
                    }
                }
            }
        }
    });
};

const getInplayPage = (sport_id: number) => {
    const options = {
        method: 'GET',
        url: process.env.LIVE_ENDPOINT as string,
        qs: { token, sport_id, skip_esports: 'Esports' },
        headers: { 'Content-Type': 'application/json' },
        body: { page: 1, skip_markets: 1 },
        json: true
    };
    request(options, (error: any, response: any, body: any) => {
        if (error) {
            ecount++;
        } else {
            count++;
            const data = body;
            if (!data || !data?.pager) return console.log(data);
            const pager = data.pager;
            const page = Math.ceil(pager.total / pager.per_page);
            for (let i = 0; i < page; i++) {
                getInplayEvents(sport_id, i + 1);
            }
        }
    });
};

const getInplayEvents = (sport_id: number, page: number) => {
    const options = {
        method: 'GET',
        url: process.env.LIVE_ENDPOINT as string,
        headers: { 'Content-Type': 'application/json' },
        qs: { token, sport_id, skip_esports: 'Esports' },
        body: { page },
        json: true
    };
    request(options, async (error: any, response: any, body: any) => {
        if (error) {
            ecount++;
        } else {
            count++;
            if (body && body.success && body.results.length) {
                const results = body.results;
                for (const i in results) {
                    const result = results[i];
                    if (result.away && result.home && result.time && result.time_status !== 2 && result.time_status !== 3) {
                        try {
                            const date = moment().add(process.env.PRE_DAY, 'days').valueOf();
                            const time = new Date(result.time * 1000).valueOf();
                            const sportsLeagues = await SportsLeagues.findOne({
                                id: result.league.id
                            });
                            if (sportsLeagues?.status && time < date) {
                                const exists = await SportsFixMatchs.findOne({
                                    id: result.id
                                });
                                if (!exists) {
                                    await SportsMatchs.updateOne({ id: result.id }, result, {
                                        upsert: true
                                    });
                                    scount++;
                                }
                            }
                        } catch (error) {
                            ecount1++;
                        }
                    } else if (result.time && result.sport_id === '2' && result.time_status !== 2 && result.time_status !== 3) {
                        try {
                            const date = moment().add(process.env.PRE_DAY, 'days').valueOf();
                            const time = new Date(result.time * 1000).valueOf();
                            const sportsLeagues = await SportsLeagues.findOne({
                                id: result.league.id
                            });
                            if (sportsLeagues?.status && time < date) {
                                const exists = await SportsFixMatchs.findOne({
                                    id: result.id
                                });
                                if (!exists) {
                                    await SportsMatchs.updateOne({ id: result.id }, result, {
                                        upsert: true
                                    });
                                    scount++;
                                }
                            }
                        } catch (error) {
                            ecount1++;
                        }
                    }
                }
            }
        }
    });
};

const getUpcomingPage = (sport_id: number, day: string) => {
    return new Promise(async (resolve, reject) => {
        setTimeout(() => {
            resolve('success');
        }, 8500);
        const options = {
            method: 'GET',
            url: process.env.PRE_ENDPOINT as string,
            qs: { token, sport_id, skip_esports: 'Esports' },
            headers: { 'Content-Type': 'application/json' },
            body: { page: 1, skip_markets: 1, day },
            json: true
        };
        request(options, (error: any, response: any, body: any) => {
            if (error) {
                ecount++;
            } else {
                count++;
                const data = body;
                if (!data || !data?.pager) return console.log(data);
                const pager = data.pager;
                const page = Math.ceil(pager.total / pager.per_page);
                for (let i = 0; i < page; i++) {
                    getUpcomingEvents(sport_id, i + 1, day);
                }
            }
        });
    });
};

const getUpcomingEvents = (sport_id: number, page: number, day: string) => {
    const options = {
        method: 'GET',
        url: process.env.PRE_ENDPOINT as string,
        headers: { 'Content-Type': 'application/json' },
        qs: { token, sport_id, skip_esports: 'Esports' },
        body: { page, day },
        json: true
    };
    request(options, async (error: any, response: any, body: any) => {
        if (error) {
            ecount++;
        } else {
            count++;
            if (body && body.success && body.results.length) {
                const results = body.results;
                for (const i in results) {
                    const result = results[i];
                    if (result.away && result.home && result.time && result.time_status != 2 && result.time_status != 3) {
                        try {
                            const date = moment().add(process.env.PRE_DAY, 'days').valueOf();
                            const time = new Date(result.time * 1000).valueOf();
                            const sportsLeagues = await SportsLeagues.findOne({
                                id: result.league.id
                            });
                            if (sportsLeagues?.status && time < date) {
                                const exists = await SportsFixMatchs.findOne({
                                    id: result.id
                                });
                                if (!exists) {
                                    await SportsMatchs.updateOne(
                                        {
                                            time_status: { $ne: 3 },
                                            id: result.id
                                        },
                                        result,
                                        { upsert: true }
                                    );
                                }
                            }
                            scount++;
                        } catch (error) {
                            ecount1++;
                        }
                    } else if (result.time && result.sport_id === '2' && result.time_status != 2 && result.time_status != 3) {
                        try {
                            const date = moment().add(process.env.PRE_DAY, 'days').valueOf();
                            const time = new Date(result.time * 1000).valueOf();
                            const sportsLeagues = await SportsLeagues.findOne({
                                id: result.league.id
                            });
                            if (sportsLeagues?.status && time < date) {
                                const exists = await SportsFixMatchs.findOne({
                                    id: result.id
                                });
                                if (!exists) {
                                    await SportsMatchs.updateOne(
                                        {
                                            time_status: { $ne: 3 },
                                            id: result.id
                                        },
                                        result,
                                        { upsert: true }
                                    );
                                }
                            }
                            scount++;
                        } catch (error) {
                            ecount1++;
                        }
                    }
                }
            }
        }
    });
};

const updateHorseTeams = async (result: any) => {
    try {
        await SportsMatchs.findOneAndUpdate({ id: result.id }, { horse_teams: result.teams })
    } catch (e) {
        console.log(e, "error")
    }
}

const checkBet = async (eventId: number) => {
    const isbet = await SportsBetting.findOne({ eventId, status: 'BET' });
    if (isbet) return true;
    return false;
};

const checkPvpBet = async (eventId: number) => {
    // const isbet = await SportsBetting.findOne({ eventId, status: 'BET' });
    const isbet = await BetRooms.findOne({ eventId, finished: false });
    if (isbet) return true;
    return false;
};

const checkFix = async (id: number) => {
    const is = await SportsFixMatchs.findOne({ id });
    if (is) return true;
    return false;
};

const updateEndedEvents = (result: any) => {
    return new Promise(async (resolve, reject) => {
        if (!result) return resolve('error');
        setTimeout(() => {
            resolve('success');
        }, 20);
        try {
            const time_status = Number(result.time_status);
            const sportslist = await SportsLists.findOne({
                SportId: Number(result.sport_id)
            });
            if (!result.id && !sportslist) {
                return console.log(`result.id => null ${result.id}`);
            } else if (time_status === 0 || time_status === 1) {
                const id = Number(result.id);
                const exists = await checkFix(id);
                if (exists) {
                    await SportsFixMatchs.deleteOne({ id });
                    await SportsMatchs.updateOne({ id }, result, {
                        upsert: true
                    });
                } else {
                    await SportsMatchs.updateOne({ id }, result);
                }
            } else {
                const id = Number(result.id);
                const isbet = await checkBet(id);
                await SportsMatchs.deleteOne({ id });
                const exists = await checkFix(id);
                if (!isbet || (exists && time_status !== 3)) {
                    return;
                } else if (time_status === 2) {
                    await SportsFixMatchs.updateOne({ id }, result, {
                        upsert: true
                    });
                    scount++;
                } else if (time_status === 3) {
                    if (result.ss == null) {
                        await SportsFixMatchs.updateOne({ id }, result, {
                            upsert: true
                        });
                        scount++;
                    } else {
                        const isDraw = result.ss.split('-')[0] === result.ss.split('-')[1];
                        if (isDraw && !sportslist.draw) {
                            await SportsFixMatchs.updateOne({ id }, result, {
                                upsert: true
                            });
                            scount++;
                        } else if (time_status === 3) {
                            if (exists) {
                                await SportsFixMatchs.deleteOne({ id });
                            }
                            await SportsEndMatchs.updateOne({ id }, result, {
                                upsert: true
                            });
                            scount++;
                        }
                    }
                } else if (
                    time_status === 4 ||
                    time_status === 5 ||
                    time_status === 6 ||
                    time_status === 7 ||
                    time_status === 8 ||
                    time_status === 9 ||
                    time_status === 10 ||
                    time_status === 99
                ) {
                    await SportsFixMatchs.updateOne({ id }, result, {
                        upsert: true
                    });
                    scount++;
                } else {
                    console.log(`updateEndedEvents result`, result);
                }
            }
        } catch (error) {
            console.log(`updateEndedEvents error`, error);
            ecount1++;
        }
    });
};
