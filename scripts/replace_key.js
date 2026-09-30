const fs = require('fs');
const path = 'src/services/brandService.ts';
let s = fs.readFileSync(path, 'utf8');
const newS = s.replace(/const MANUAL_RESEND_API_KEY = \".*\";/, 'const MANUAL_RESEND_API_KEY = process.env.RESEND_API_KEY || \"REDACTED_MANUAL_RESEND_API_KEY\";');
if (s === newS) console.log('No match found');
else { fs.writeFileSync(path, newS, 'utf8');
    console.log('Replaced key'); }