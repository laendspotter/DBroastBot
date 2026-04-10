import { setWebhook } from '../lib/telegram.js';

export default async function handler(req, res) {
  const { secret } = req.query;

  // Basic protection
  if (secret !== process.env.SETUP_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const webhookUrl = `https://${req.headers.host}/api/webhook`;
  const result = await setWebhook(webhookUrl);

  return res.status(200).json({ webhookUrl, result });
}
