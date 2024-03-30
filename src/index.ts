import 'dotenv/config';
import 'regenerator-runtime';
import * as cors from 'cors';
import * as path from 'path';
import * as morgan from 'morgan';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import * as session from 'express-session';
import * as useragent from 'express-useragent';
import * as methodOverride from 'method-override';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs';
// import { createStream } from 'rotating-file-stream';
import socket from './socket';
import routes1 from './routes1';
import routes2 from './routes2';
import routes3 from './routes3';
import { RetrunValidation } from './middlewares/validation';
import { checkUrl, corsOptionsDelegate } from './middlewares/auth';
import { clientErrorHandler, logErrors } from './controllers/base';
import { listen } from './controllers/games/casino/crash';
// import * as redis from "./util/redisClient";
import { sessionSchema, userSchema } from './redis/session'
import {Sessions, Users} from './models';
import { Entity, Schema, Repository, Client } from 'redis-om'

const config = require('../config');

const cluster = require('cluster'); // Include the cluster module

// ... other imports (dotenv, express, etc.)

// if (cluster.isMaster) {
//     // Master process code (spawning workers)
//     const numCPUs = require('os').cpus().length;
//     console.log(numCPUs, "cup number")

//     for (let i = 0; i < numCPUs; i++) {
//         cluster.fork();
//     }

//     // cluster.on('exit', (worker: any, code: any, signal: any) => {
//     //     console.log(`worker process ${worker.process.pid} died with code ${code} and signal ${signal}`);
//     //     cluster.fork(); // Optionally, you can fork a new worker to replace the dead one
//     // });
// } else {
    const app = express();

    // const accessLogStream = createStream('access.log', {
    //     interval: '1d',
    //     path: path.join(`${config.DIR}`, 'log')
    // });
    app.use(compression());
    app.use(useragent.express());
    // app.use(morgan('combined', { stream: accessLogStream }));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json({ type: 'application/json' }));
    app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }));
    app.use(bodyParser.text({ type: 'text/html' }));
    app.use(methodOverride());
    app.use(logErrors);
    app.use(clientErrorHandler);
    app.use(express.static(`${config.DIR}/upload`));
    app.use(express.static(`${config.DIR}/teams`));

    app.use(
        helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
            referrerPolicy: { policy: 'no-referrer' }
        })
    );
    app.set('trust proxy', 1);
    app.use(
        session({
            secret: process.env.SESSION_SECRET as string,
            saveUninitialized: true,
            resave: true,
            cookie: {
                httpOnly: true,
                secure: true,
                domain: process.env.DOMAIN,
                path: '*',
                expires: new Date(Date.now() + 60 * 60 * 1000)
            }
        })
    );

    app.use(express.static(`${config.DIR}/${process.env.FRONTEND}`));

    if (process.env.MODE === 'dev') {
        app.use(cors('*' as cors.CorsOptions));
    } else {
        app.use(cors(corsOptionsDelegate));
        app.use(checkUrl);
    }

    const apiV1Limiter = rateLimit({
        windowMs: 5 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false
    });

    const apiV2Limiter = rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 100000,
        standardHeaders: true,
        legacyHeaders: false
    });

    const apiV3Limiter = rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 3000,
        standardHeaders: true,
        legacyHeaders: false
    });

    app.use('/api/v1/', apiV1Limiter, routes1);
    app.use('/api/v2/', apiV2Limiter, routes2); //user action
    app.use('/api/v3/', apiV3Limiter, routes3);
    app.get('*', apiV2Limiter, (req: express.Request, res: express.Response) =>
        res.sendFile(`${config.DIR}/${process.env.FRONTEND}/index.html`)
    );
    app.use(RetrunValidation);


    mongoose
        .connect(process.env.DATABASE as string)
        .then(async () => {
            const db = mongoose.connection.db;
            
            // initRedis();

            const port = process.env.PORT || 5000;
            if (process.env.TYPE === 'https') {
                const options = {
                    key: fs.readFileSync('./conf/key.pem'),
                    cert: fs.readFileSync('./conf/cert.pem')
                };
                const https = require('https').createServer(options, app);
                const io = require('socket.io')(https, { cors: { origin: '*' } });
                socket(io);
                app.set('io', io);
                listen(io);
                https.listen(port);
                console.log('server listening on:', port);
            } else {
                const http = require('http').createServer(app);
                const io = require('socket.io')(http, { cors: { origin: '*' } });
                socket(io);
                app.set('io', io);
                listen(io);
                http.listen(port);
                console.log('server listening on:', port);
            }
        })
        .catch((error: any) => {
            console.log('database connection error => ', error);
        });
// }


const initRedis = async () => {
    
    let client = await new Client().open("redis://localhost:6379");

    let sessionRepository : Repository = new Repository(sessionSchema, client);
    let userRepository : Repository = new Repository(userSchema, client);

    await sessionRepository.createIndex();
    await userRepository.createIndex();

    let allSessions = await Sessions.find();
    let allUsers = await Users.find();

    for(let i = 0; i < allSessions.length; i++) {
        // let entity: Entity = sessionRepository.createEntity()

        const entity = {
            accessToken : allSessions[i].accessToken.toString(),
            userId : allSessions[i].userId.toString(),
            socketId : allSessions[i].socketId?.toString(),
        }

        await sessionRepository.save(entity);
    }

    for(let i = 0; i < allUsers.length; i++) {

        const entity = {
            _id : allUsers[i]._id.toString(),
            firstname : allUsers[i].firstname.toString(),
            lastname : allUsers[i].lastname.toString(),
            createdAt : allUsers[i].createdAt? allUsers[i].createdAt.toISOString() : ""
        } 

        await userRepository.save(entity);
    }

    const result = await sessionRepository.search().where('accessToken').equal('c1137cc80cfa93e473043563ba5d4ef8').return.all();

    console.log(result);
}







