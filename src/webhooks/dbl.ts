import cf from '../config.json';
import { onVote } from '../events/vote';

export function dbl_onPost(req: any) 
{
    if (req.headers.authorization != cf.topgg_webhookAuth) return;
    onVote(req.body.user);
}