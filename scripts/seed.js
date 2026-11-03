import {openDB} from '../server/db.js';
import {seed} from '../server/core.js';
const email=process.argv[2];
if(!email){console.log('Usage: npm run seed -- your-registered-email@example.com');process.exit(1)}
const {sqlite,adapter}=openDB();const user=sqlite.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase());
if(!user){console.error('Register the account first, then run this script.');sqlite.close();process.exit(1)}
await seed(adapter,user.id);sqlite.close();console.log('Fictional demonstration projects and issues added.');
