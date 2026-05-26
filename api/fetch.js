const ALLOWED = [
  'theskint.com',
  'nycgovparks.org',
  'donyc.com',
  'cityparksfoundation.org',
  'bricartsmedia.org',
  'rooftopfilms.com',
  'bryantpark.org',
  'govisland.com',
  'hyperallergic.com',
  'mas.org',
  'bam.org',
  'thebellhouseny.com',
  'joespub.com',
  'lpr.com',
  'mercuryeastpresents.com',
  'nationalsawdust.org',
  'petescandystore.com',
  'citycal.com',
  'ohmyrockness.com',
  'classbento.com', 
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  let parsed;
  try { parsed = new URL(url); }
  catch { return res.status(400).json({ error: 'Invalid URL' }); }

  const domain = parsed.hostname.replace(/^www\./, '');
  const allowed = ALLOWED.some(d => domain === d || domain.endsWith('.' + d));
  if (!allowed) return res.status(403).json({ error: 'Domain not allowed' });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    const text = await response.text();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
