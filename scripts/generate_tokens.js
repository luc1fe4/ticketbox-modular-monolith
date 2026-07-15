const fs = require('fs');
const http = require('http');

const BASE_URL = 'http://localhost:8080';
const TOTAL_USERS = parseInt(process.env.TOTAL_USERS || '10000', 10);
const BATCH_SIZE = 50; 

const tokens = new Array(TOTAL_USERS);

async function loginUser(id) {
  const email = `loaduser_${id}@ticketbox.test`;
  const password = 'password123';
  const postData = JSON.stringify({ email, password });

  return new Promise((resolve) => {
    const req = http.request(
      `${BASE_URL}/api/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 10000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.data.accessToken);
            } catch (err) {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      }
    );

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log(`Starting token generation for ${TOTAL_USERS} users...`);
  const startTime = Date.now();

  for (let i = 1; i <= TOTAL_USERS; i += BATCH_SIZE) {
    const promises = [];
    const limit = Math.min(i + BATCH_SIZE - 1, TOTAL_USERS);
    for (let j = i; j <= limit; j++) {
      promises.push(
        (async (id) => {
          let token = null;
          let retries = 3;
          while (!token && retries > 0) {
            token = await loginUser(id);
            if (!token) {
              retries--;
              await new Promise((r) => setTimeout(r, 500));
            }
          }
          tokens[id - 1] = token;
        })(j)
      );
    }

    await Promise.all(promises);
    if (i % 1000 === 1 || i + BATCH_SIZE > TOTAL_USERS) {
      const percentage = ((limit / TOTAL_USERS) * 100).toFixed(1);
      console.log(`Progress: ${limit}/${TOTAL_USERS} (${percentage}%) completed...`);
    }
  }

  const failedCount = tokens.filter(t => !t).length;
  console.log(`Finished in ${((Date.now() - startTime) / 1000).toFixed(1)}s.`);
  console.log(`Successfully generated: ${TOTAL_USERS - failedCount}/${TOTAL_USERS}`);
  
  if (failedCount > 0) {
    console.warn(`Warning: ${failedCount} logins failed! Please check if backend is running or database is populated.`);
  }

  fs.writeFileSync('scripts/tokens.json', JSON.stringify(tokens, null, 2), 'utf8');
  console.log('Saved tokens to scripts/tokens.json');
}

main();
