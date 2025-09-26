import FormData from 'form-data';
import fetch from 'node-fetch';
import fs from 'fs';

const form = new FormData();
form.append('name', 'soda pop');
form.append('boardCount', '4');
form.append('boardLayout', '2x2');
form.append('image', fs.createReadStream('C:/Users/New/Desktop/PICXEL ONLINE/PHOTOS/Soda pop.jpeg')); // Updated path

fetch('http://localhost:5000/api/upload', {
  method: 'POST',
  body: form
})
.then(response => response.text())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));