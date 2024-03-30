import {
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction as ExpressNextFunction
} from 'express';
import { Server, Socket as SocketRequest } from 'socket.io';
import { Schema } from 'mongoose';

export type Payload = { userId: Schema.Types.ObjectId } & any;
export type SocketPayload = {
  markedForDisconnect: boolean;
  lastAccess: number;
};
export type Request = ExpressRequest & Payload;
export type Response = ExpressResponse;
export type NextFunction = ExpressNextFunction;
export type Socket = SocketRequest & Payload & SocketPayload;

export type NetworkType = {
  name: string;
  icon: string;
};

export type MessageType = {
  content: string;
};

export type ChangeBalanceType = {
  io: Server;
  userId: Schema.Types.ObjectId;
  amount: number;
  note: string;
  id: string;
};

export type CreateCoinFlipType = {
  amount: number;
  side: boolean;
};
