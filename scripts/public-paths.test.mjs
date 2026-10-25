import test from 'node:test';
import assert from 'node:assert/strict';
import {isUnsafePublicPath} from './public-paths.mjs';

test('only known configuration JSON and generated Android art are accepted',()=>{
  for(const path of [
    'shells/package.json',
    'shells/package-lock.json',
    'shells/capacitor.config.json',
    'shells/android/app/src/main/res/drawable/splash.png',
    'shells/android/app/src/main/res/drawable-land-xxxhdpi/splash.png',
    'shells/android/app/src/main/res/drawable-port-xhdpi/splash.png',
    'shells/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png',
    'docs/images/timeline.png',
    'docs/images/week.png',
    'docs/images/focus.png',
  ]) assert.equal(isUnsafePublicPath(path),false,path);
});

test('private records and screenshots are rejected even with ordinary file names',()=>{
  for(const path of [
    'notes.json',
    'data/records.JSON',
    'screenshots/timeline.png',
    'docs/images/private-record.png',
    'shells/android/app/src/main/res/mipmap-mdpi/personal.png',
    'feedback.jpg',
    'assets/preview.svg',
    'export.csv',
    'private/readme.md',
    'backups/notes.txt',
  ]) assert.equal(isUnsafePublicPath(path),true,path);
});
