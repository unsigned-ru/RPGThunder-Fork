import cf from '../config.json';
import fs from 'fs';
import express from 'express';
import https from 'https';
import bodyParser from 'body-parser'
import { dbl_onPost } from './dbl.js';
import { patreon_onPost } from './patreon.js';

export function initializeWebhooks()
{
    console.log("Initializing webhooks...")
    //setup express app.
    const app = express();
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    //create httpsServer and link it to express app.
    let httpsServer = https.createServer({key: fs.readFileSync(cf.path_https_key), cert: fs.readFileSync(cf.path_https_cert)}, app);

    //add hooks.
    app.post('/dblwebhook', dbl_onPost);

    app.post('/patreonwebhook', patreon_onPost);

    httpsServer.listen(5000); //only listen to webhook events when we are not in devmode.

    console.log("Finished initializing webhooks.")
}