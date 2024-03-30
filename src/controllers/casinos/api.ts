import 'dotenv/config';
import 'regenerator-runtime';
import * as request from 'request';
import { Request, Response } from 'express';

const md5 = require("md5")

export const getGameLists = async (req: Request, res: Response) => {
    let TID = new Date().valueOf()
    let Hash = md5(`Game/List/${process.env.MY_IP}/${TID}/${process.env.CASINO_APIKEY}/${process.env.CASINO_APIPASSWORD}`)
    let Url = `${process.env.CASINO_ENDPOINT}System/Api/${process.env.CASINO_APIKEY}/Game/List?&TID=${TID}&Hash=${String(Hash)}`;
    const options = {
        method: 'POST',
        url: Url,
        headers: { 'Content-Type': 'application/json' },
        json: true
    };
    try {
        request(options, async (error: any, response: any, body: any) => {
            if (error) {
                console.log(error)
                return res.json("error")
            } else {
                return res.json(body)
            }
        })
    } catch (e) {
        console.log(e, "error")
        return res.json("error")
    }
}

export const getCategoryLists = async (req: Request, res: Response) => {
    let TID = new Date().valueOf()
    let Hash = md5(`Game/Categories/${process.env.MY_IP}/${TID}/${process.env.CASINO_APIKEY}/${process.env.CASINO_APIPASSWORD}`)
    let Url = `${process.env.CASINO_ENDPOINT}System/Api/${process.env.CASINO_APIKEY}/Game/Categories?&TID=${TID}&Hash=${String(Hash)}`;
    const options = {
        method: 'POST',
        url: Url,
        headers: { 'Content-Type': 'application/json' },
        json: true
    };
    request(options, async (error: any, response: any, body: any) => {
        if (error) {
            console.log(error)
            return res.json("error")
        } else {
            return res.json(body)
        }
    })
}