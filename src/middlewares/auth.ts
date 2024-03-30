import * as geoip from 'geoip-country';
import * as requestIp from 'request-ip';
import * as moment from 'moment';
import { Response, NextFunction } from 'express';
import { Sessions } from '../models';
import { encrypt, getSessionTime } from '../controllers/base';
const log = require('log-to-file');
const config = require('../../config');

const adminiplist = ['24.7.208.194', '103.35.254.245', '45.126.3.246', '188.43.136.45', 'http://admin.blockchainbets.club'];

const whitelist = [
    'https://bcb.exchange',
    'http://bcb.exchange',
    'https://bcb.poker',
    'http://bcb.poker',
    'http://52.57.156.33:3000',
    'https://blockchainbets.club',
    'http://blockchainbets.club',
    'https://www.blockchainbets.club',
    'https://admin.blockchainbets.club',
    'http://admin.blockchainbets.club',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:2002',
    'http://localhost:2083',
    'http://localhost:5000',
    'http://3.71.8.87',
    'http://3.71.8.87:5000/',
    'http://3.71.8.87:3000/',
    'http://3.71.8.87:2083/',
    'http://15.197.249.71',
    'http://15.197.249.71:5000/',
    'http://15.197.249.71:3000/',
    'http://15.197.249.71:2083/',
    'http://3.33.221.5',
    'http://3.33.221.5:5000/',
    'http://3.33.221.5:3000/',
    'http://3.33.221.5:2083/',
    'http://54.93.165.79',
    'http://54.93.165.79:5000',
    'http://54.93.165.79:3000',
    'http://54.93.165.79:2083',
    'http://3.78.26.159',
    'http://3.78.26.159:5000',
    'http://3.78.26.159:3000',
    'http://3.78.26.159:2083',
    'http://3.78.61.162',
    'http://3.78.61.162:5000',
    'http://3.78.61.162:3000',
    'http://3.78.61.162:2083',
    'http://78.28.223.18',
    'http://89.111.33.125',
    'http://89.111.33.128',
    'http://89.111.33.129',
    'http://89.111.33.130',
    'http://157.90.47.174',
    'http://78.28.223.29',
    'http://89.111.53.78',
    'http://89.111.53.79',
    'http://157.90.47.160',
    'http://78.28.223.43',
    'http://89.111.53.92',
    'http://89.111.53.68',
    'http://89.111.33.17',
    'http://85.9.219.104',
    'http://87.99.94.34',
    'http://188.130.240.79',
    'http://213.145.3.100',
    'http://89.111.33.131',
    '78.28.223.18',
    '89.111.33.125',
    '89.111.33.128',
    '89.111.33.129',
    '89.111.33.130',
    '157.90.47.174',
    '78.28.223.29',
    '89.111.53.78',
    '89.111.53.79',
    '157.90.47.160',
    '78.28.223.43',
    '89.111.53.92',
    '89.111.53.68',
    '89.111.33.17',
    '85.9.219.104',
    '87.99.94.34',
    '188.130.240.79',
    '213.145.3.100',
    '89.111.33.131',
];

const apilist = [
    '/api/v1/sports/matchs',
    '/api/v1/sports/lists',
    '/api/v1/sports/odds',
    '/api/v1/reports/profit',
    '/api/v1/reports/bracket',
    '/api/v1/languages/word',
    '/api/v1/languages/language'
];

const adminPathList = ['/signin', '/signup', '/signout', '/changePassword'];

const iplist = ['73.234.248.100', '98.196.146.131', '75.67.56.216', '77.111.245.14', '174.196.195.221', '107.77.219.37', '76.65.151.203', '180.252.219.215'];

const useragentlist = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0',
    'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0'
];

export const verifyToken = async (req: any, res: Response, next: NextFunction) => {
    try {
        const accessToken = req.headers.authorization;
        if (!accessToken) {
            return res.status(401).json({ error: 'Unauthorized' });
        } else {
            const user = await Sessions.findOneAndUpdate({ accessToken }, { expiration: getSessionTime() }).populate('userId');
            if (user && user.userId && user.userId.status) {
                req.user = user.userId;
                next();
            } else {
                return res.status(401).json({ error: 'Unauthorized' });
            }
        }
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
};

export const verifyAdminToken = async (req: any, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.token;
        if (!token || token != process.env.ADMIN_TOKEN) {
            return res.status(401).json({ error: 'Unauthorized' });
        } else if (adminPathList.includes(req.path)) {
            next();
        } else {
            const accessToken = req.headers.authorization;
            if (!accessToken) {
                return res.status(401).json({ error: 'Unauthorized' });
            } else {
                const user = await Sessions.findOneAndUpdate({ accessToken }, { expiration: getSessionTime() }).populate('userId');
                if (user && user.userId && user.userId.status && user.userId.permissionId.title === 'admin') {
                    req.user = user.userId;
                    next();
                } else {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
            }
        }
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
};

export const checkUser = (req: any, res: Response, next: NextFunction) => {
    if (req.body.userId !== String(req.user._id)) {
        console.log(req.body, 'body')
        console.log(`req.method`, req.method);
        console.log(`req.url`, req.url);
        console.log(`req.user`, req.user);
        console.log(`req.body`, req.body);
        return res.status(401).json({ error: 'Unauthorized' });
    } else {
        next();
    }
};

export const checkUrl = (req: any, res: Response, next: NextFunction) => {
    const ip = requestIp.getClientIp(req);
    if (ip) {
        const ipaddress = ip.replace('::ffff:', '');
        const geo = geoip.lookup(ipaddress);
        if (
            iplist.indexOf(ipaddress) !== -1 ||
            useragentlist.indexOf(req.headers['user-agent']) == undefined ||
            useragentlist.indexOf(req.headers['user-agent']) !== -1 ||
            (req.headers['user-agent'] && req.headers['user-agent'].indexOf('Firefox/91.0') !== -1)
        ) {
            console.log(
                '403 ******',
                ip.replace('::ffff:', ''),
                '******',
                geo?.country,
                '******',
                req.method,
                '******',
                req.url,
                '******',
                req.header('Origin'),
                '******'
            );
            return res.status(403).json(`You can't access.`);
        } else {
            if (apilist.indexOf(req.url) === -1 && adminiplist.indexOf(ipaddress) === -1) {
                // const filepath = `${config.DIR}/rlog/log-${moment().format('YYYY-MM-DD')}.log`;
                // log(
                //     `start\n${geo?.country} ${ipaddress}  ${req.method}  ${req.url}\nheaders ${JSON.stringify(
                //         req.headers
                //     )}\nparams ${JSON.stringify(req.params)}\nbody ${JSON.stringify(req.body)}\nend\r\n\n`,
                //     filepath
                // );
                console.log(
                    `===`,
                    geo?.country,
                    `===`,
                    req.header('Origin'),
                    `===`,
                    ipaddress,
                    `===`,
                    req.method,
                    `===`,
                    req.url,
                    `====`,
                    req.headers['user-agent'],
                    `===\n`
                );
            }
            next();
        }
    } else {
        return res.status(403).json(`You can't access.`);
    }
};

export const corsOptionsDelegate = (req: any, callback: Function) => {
    let corsOptions;
    try {
        const ip = requestIp.getClientIp(req) as string;
        const ipaddress = ip.replace('::ffff:', '');
        if (whitelist.indexOf(ipaddress) !== -1) {
            corsOptions = false;
        } else if (iplist.indexOf(ipaddress) !== -1) {
            corsOptions = true;
        } else if (req.method === 'GET') {
            corsOptions = false;
        } else if (req.header('Origin') !== undefined && whitelist.indexOf(req.header('Origin')) !== -1) {
            corsOptions = false;
        } else if (whitelist.indexOf(req.header('cf-connecting-ip')) !== -1) {
            corsOptions = false;
        } else {
            const ip = requestIp.getClientIp(req) as string;
            const geo = geoip.lookup(ip);
            console.log("cors error")
            console.log(
                '******',
                ip.replace('::ffff:', ''),
                '******',
                geo?.country,
                '******',
                req.method,
                '******',
                req.url,
                '******',
                req.header('Origin'),
                '******'
            );
            console.log(req.headers);
            console.log(req.body);
            corsOptions = true;
        }
    } catch (error) {
        console.log(error);
        corsOptions = true;
    }
    callback(corsOptions);
};
