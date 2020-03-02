import crypto from 'crypto';
import cf from '../config.json';
import { patreonOnMemberCreate } from '../events/patreon_memberCreate';
import { patreonOnMemberUpdate } from '../events/patreon_memberUpdate.js';
import { patreonOnMemberPledgeUpdate } from '../events/patreon_memberPledgeUpdate.js';


export function patreonOnPost(req: any, res: any)
{
    res.sendStatus(200);
    //encrypt received data with authkey as key and check if we end up with the same hex signature.
    const signature = req.header("x-patreon-signature");
    const hmac = crypto.createHmac('md5',cf.patreon_webhookAuth);
    hmac.update(JSON.stringify(req.body), 'utf8');
    const digest = hmac.digest("hex");
    if (digest !== signature) return console.warn("Received patreon webhook with invallid signature.");

    switch(req.header("x-patreon-event"))
    {
        //Create is done only the first time a pledge happens.
        case "members:create": patreonOnMemberCreate(req.body.data); break;
        //update is done when membership is re-enabled or ended.
        case "members:update": patreonOnMemberUpdate(req.body.data); break;
        //pledge update is done when a pledge switches pledge amount, (tiers).
        case "members:pledge:update": patreonOnMemberPledgeUpdate(req.body.data); break;
    }
}