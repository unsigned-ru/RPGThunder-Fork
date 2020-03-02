import cf from '../config.json';
import { onVote } from '../events/vote';

export function dblOnPost(req: any) 
{
    if (req.headers.authorization != cf.topgg_webhookAuth) return;
    onVote(req.body.user);
}