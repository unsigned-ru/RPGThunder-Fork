import cf from '../config.json';
import fs from 'fs';
import express from 'express';
import https from 'https';
import bodyParser from 'body-parser';
import { dblOnPost } from './dbl.js';
import { patreonOnPost } from './patreon.js';

export function initializeWebhooks()
{
    console.log("Initializing webhooks...");
    //setup express app.
    const app = express();
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    //create httpsServer and link it to express app.
    const httpsServer = https.createServer({key: fs.readFileSync(cf.path_https_key), cert: fs.readFileSync(cf.path_https_cert)}, app);

    //add hooks.
    app.post('/dblwebhook', dblOnPost);

    app.post('/patreonwebhook', patreonOnPost);
    
    httpsServer.listen(5000); //only listen to webhook events when we are not in devmode.

    console.log("Finished initializing webhooks.");
}