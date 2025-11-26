const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.json({ status: 'ok' });
});

const port = 3001;
app.listen(port, () => {
  console.log(`Test server listening on port ${port}`);
});

// Keep process alive
setInterval(() => {
  console.log('[Heartbeat] Server is alive...');
}, 10000);
