#!/usr/bin/env node

/**
 * Syncs version across package.json, Cargo.toml, and tauri.conf.json
 * Run this before builds to ensure all versions match
 */

const fs = require('fs');
const path = require('path');

// Get version from package.json (source of truth)
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

console.log(`📦 Syncing version ${version} across all files...`);

// Update Cargo.toml
const cargoTomlPath = path.join(__dirname, '../src-tauri/Cargo.toml');
let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
cargoToml = cargoToml.replace(
  /^version = ".*?"/m,
  `version = "${version}"`
);
fs.writeFileSync(cargoTomlPath, cargoToml);
console.log('✅ Updated Cargo.toml');

// Update tauri.conf.json
const tauriConfPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2));
console.log('✅ Updated tauri.conf.json');

console.log(`\n✨ Version ${version} synced successfully!\n`);
