const fs = require('fs');
const cargo = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
const match = cargo.match(/^version = "([^"]+)"/m);
const version = match ? match[1] : 'unknown';
console.log(`version=${version}`);
