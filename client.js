import fetch from 'node-fetch';

const payload = {
  name: 'soda pop',
  boardCount: 4,
  boardLayout: '2x2',
  image: 'binary data placeholder'
};

fetch('http://localhost:5000/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(response => response.text())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));