const fs = require('fs');
const crypto = require('crypto');

const JWT_SECRET = 'super_secret_key_with_at_least_32_characters_for_jwt_signing_algorithm_ticketbox';
const EXPIRATION_MS = 86400000; // 24 giờ

function signHS256(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const base64UrlEncode = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function main() {
  console.log('Reading users.csv...');
  let csvContent = fs.readFileSync('scripts/users.csv', 'utf8');
  if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.slice(1);
  }
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  
  // Dòng đầu là header: id,email
  const headers = lines[0].split(',');
  const idIndex = headers.indexOf('id');
  const emailIndex = headers.indexOf('email');

  if (idIndex === -1 || emailIndex === -1) {
    console.error('Invalid CSV format. Missing id or email header.');
    process.exit(1);
  }

  const tokens = [];
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(EXPIRATION_MS / 1000);

  console.log(`Generating tokens for ${lines.length - 1} users offline...`);
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 2) continue;
    
    const userId = cols[idIndex].trim();
    const email = cols[emailIndex].trim();
    
    // Trích xuất số thứ tự từ email để đặt tên Full Name
    const match = email.match(/loaduser_(\d+)@/);
    const userSeq = match ? match[1] : i;
    const fullName = `Load User ${userSeq}`;

    const payload = {
      sub: userId,
      email: email,
      role: 'AUDIENCE',
      fullName: fullName,
      iat: now,
      exp: exp
    };

    const token = signHS256(payload, JWT_SECRET);
    tokens.push(token);
  }

  fs.writeFileSync('scripts/tokens.json', JSON.stringify(tokens, null, 2), 'utf8');
  console.log(`Successfully generated and saved ${tokens.length} tokens to scripts/tokens.json`);
}

main();
