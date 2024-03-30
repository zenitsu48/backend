import { Entity, Schema, Repository } from 'redis-om'

export const sessionSchema = new Schema('session', {
        userId: {
            type: 'string',
        },
        socketId: {
            type: 'string'
        },
        accessToken: {
            type: 'string'
        },
    }
)

export const userSchema = new Schema('user', {
    _id: {
        type: 'string'
    },
    email: {
        type: 'string'
    },
    username: {
        type: 'string'
    },
    firstname: {
        type: 'string'
    },
    lastname: {
        type: 'string'
    },
    createdAt: {
        type: 'string'
    },
}
)

