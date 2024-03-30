import { CronJob } from 'cron';
import { Socket } from 'socket.io';
import { globalTime, ObjectId } from '../controllers/base';
import { sendMsg } from '../controllers/users';
import { Balances, Sessions, Users } from '../models';

export const UpdateBalance = async (io: any) => {
    const sessions = await Sessions.find({ socketId: { $ne: null } }).select({
        userId: 1,
        socketId: 1
    });
    if (sessions.length) {
        for (const i in sessions) {
            const userId = sessions[i].userId;
            if (userId) {
                const balance = await Balances.aggregate([
                    {
                        $match: {
                            userId,
                            status: true
                        }
                    },
                    {
                        $lookup: {
                            from: 'currencies',
                            localField: 'currency',
                            foreignField: '_id',
                            as: 'currency'
                        }
                    },
                    {
                        $unwind: '$currency'
                    },
                    {
                        $project: {
                            balance: 1
                        }
                    }
                ]);
                if (balance && balance[0]?.balance) {
                    io.to(sessions[i].socketId).emit('balance', {
                        balance: balance[0].balance
                    });
                }
            }
        }
    }
};

export const UpdateSession = async (io: any) => {
    const sessions = await Sessions.find({
        expiration: { $lte: globalTime() }
    }).populate('userId');
    if (sessions.length) {
        await Sessions.deleteMany({ expiration: { $lte: globalTime() } });
        for (const i in sessions) {
            io.to(sessions[i].socketId).emit('logout');
        }
    }
};

export default (io: any) => {
    io.on('connection', async (socket: Socket) => {
        const query = socket.handshake.query;
        if (query.auth) {
            try {
                const decoded = await Sessions.findOneAndUpdate({ accessToken: query.auth }, { socketId: socket.id });
                if (decoded) {
                    const user = await Users.findById(ObjectId(decoded.userId));
                    if (!user) {
                        io.to(socket.id).emit('logout');
                        await Sessions.deleteOne({ userId: decoded.userId });
                    }
                } else {
                    io.to(socket.id).emit('logout');
                }
            } catch (err) {
                io.to(socket.id).emit('logout');
            }
        }
        socket.on('disconnect', async () => {
            await Sessions.updateOne({ socketId: socket.id }, { socketId: '' });
        });

        socket.on('msg send', (data: any) => {
            socket.broadcast.emit('msg', { data: data });
            sendMsg(data)
        })

        socket.on("getchartdata", async () => {
        })

    });
    const job1 = new CronJob(process.env.TIME as string, () => {
        const time = globalTime();
        io.sockets.emit('time', time.valueOf());
    });
    job1.start();
    const job = new CronJob(process.env.BALANCE_TIME as string, () => {
        UpdateBalance(io);
        UpdateSession(io);
    });
    job.start();
    if (process.env.MODE === 'pro') {
        setTimeout(() => {
            io.sockets.emit('reload');
        }, 10000);
    }
};
