// Simple Express web server for Graph API tutorial
import express from 'express';
import path from 'path';

const app = express();
const PORT = 3200;

// Serve static files from 'public' directory
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🌐 Graph API Web App running at: http://localhost:${PORT}`);
  console.log('\nOpen this URL in your browser to get started!\n');
});
