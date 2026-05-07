const clients = new Set();

export function sseHandler(req, res) {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  clients.add(res);

  const keepAlive = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(res);
  });
}

export function publish(eventName, payload) {
  const data = JSON.stringify(payload);
  for (const res of clients) {
    try {
      res.write(`event: ${eventName}\ndata: ${data}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
}

