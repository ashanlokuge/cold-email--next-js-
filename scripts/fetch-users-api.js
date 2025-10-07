const http = require('http');

function run() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3002/api/admin/users', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('status', res.statusCode);
          console.log(JSON.stringify(json, null, 2));
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => reject(err));
  });
}

run().catch((err) => console.error(err));
