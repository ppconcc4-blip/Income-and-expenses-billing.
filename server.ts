import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // LINE Notify API proxy endpoint
  app.post('/api/line-notify', async (req, res) => {
    try {
      const { token, message } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, error: 'ต้องระบุ LINE Notify Access Token' });
      }
      if (!message) {
        return res.status(400).json({ success: false, error: 'ต้องระบุข้อความแจ้งเตือน' });
      }

      const params = new URLSearchParams();
      params.append('message', message);

      const response = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      const data = await response.json();
      if (response.ok) {
        return res.json({ success: true, data });
      } else {
        return res.status(response.status).json({ success: false, error: data.message || 'ส่งแจ้งเตือน LINE ล้มเหลว' });
      }
    } catch (error: any) {
      console.error('LINE Notify Error:', error);
      return res.status(500).json({ success: false, error: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ LINE Notify' });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
