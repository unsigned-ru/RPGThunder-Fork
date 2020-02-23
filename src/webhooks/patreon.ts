import crypto from 'crypto';
import cf from '../config.json';
import { patreon_onMemberCreate } from '../events/patreon_memberCreate';
import { patreon_onMemberUpdate } from '../events/patreon_memberUpdate.js';
import { patreon_onMemberPledgeUpdate } from '../events/patreon_memberPledgeUpdate.js';


export function patreon_onPost(req: any, res:any)
{
    res.sendStatus(200);
    //encrypt received data with authkey as key and check if we end up with the same hex signature.
    let signature = req.header("x-patreon-signature");
    let hmac = crypto.createHmac('md5',cf.patreon_webhookAuth);
    hmac.update(JSON.stringify(req.body), 'utf8');
    let digest = hmac.digest("hex");
    if (digest !== signature) return console.warn("Received patreon webhook with invallid signature.");

    switch(req.header("x-patreon-event"))
    {
        //Create is done only the first time a pledge happens.
        case "members:create": patreon_onMemberCreate(req.body.data); break;
        //update is done when membership is re-enabled or ended.
        case "members:update": patreon_onMemberUpdate(req.body.data); break;
        //pledge update is done when a pledge switches pledge amount, (tiers).
        case "members:pledge:update": patreon_onMemberPledgeUpdate(req.body.data); break;
    }
}