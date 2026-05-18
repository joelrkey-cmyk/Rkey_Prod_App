const http = require('http');

fetch('http://localhost:3000/api/dj-fiches/public')
  .then(res => res.json())
  .then(data => {
    console.log("Profiles:", data);
    if(data.length > 0) {
      return fetch('http://localhost:3000/api/dj-fiches/public/' + data[0].id);
    }
  })
  .then(res => res ? res.json() : null)
  .then(console.log)
  .catch(console.error);
