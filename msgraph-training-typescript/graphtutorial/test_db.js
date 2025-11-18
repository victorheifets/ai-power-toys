const db = require('./database/db.ts');
console.log('DB exports:', Object.keys(db));
console.log('DB default:', Object.keys(db.default || {}));
console.log('Has getCustomToys:', typeof db.getCustomToys);
console.log('Has default.getCustomToys:', typeof (db.default && db.default.getCustomToys));
