import http from 'node:http';
import { logStorage } from '../utils/storage';
import { ExternalLogPayload, LogEntry } from '../../shared/types';
import { randomUUID } from 'node:crypto';
import { defineNitroPlugin } from '#imports';

export default defineNitroPlugin(() => {
  const port = 4444;
  const server = http.createServer((req, res) => {
    // Enable CORS for external sources if needed
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body) as ExternalLogPayload;
          const logEntry: LogEntry = {
            ...payload,
            id: randomUUID(),
          };
          logStorage.addLog(logEntry);
          res.statusCode = 201;
          res.end(JSON.stringify({ status: 'ok', id: logEntry.id }));
        } catch (error) {
          res.statusCode = 400;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          res.end(JSON.stringify({ error: 'Invalid JSON', details: errorMessage }));
        }
      });
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  });

  server.listen(port, () => {
    console.log(`[HTTP Logger] Receiver listening on port ${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    server.close();
  });
});
