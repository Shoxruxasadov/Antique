#!/usr/bin/env node
/**
 * Increments iOS build number and Android versionCode in app.json for EAS builds.
 */
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const expo = app.expo || app;
const ios = expo.ios || {};
const android = expo.android || {};

const nextIos = (parseInt(ios.buildNumber, 10) || 1) + 1;
const nextAndroid = (parseInt(android.versionCode, 10) || 1) + 1;

if (!expo.ios) expo.ios = {};
if (!expo.android) expo.android = {};
expo.ios.buildNumber = String(nextIos);
expo.android.versionCode = nextAndroid;

fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2) + '\n', 'utf8');
console.log(`Build numbers updated: iOS ${nextIos}, Android ${nextAndroid}`);
