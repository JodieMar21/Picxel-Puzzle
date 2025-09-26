import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/upload', (req, res) => {
  console.log('Received:', req.body);
  res.status(200).send('Upload successful');
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});