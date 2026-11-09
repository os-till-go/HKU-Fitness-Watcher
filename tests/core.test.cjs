const { test } = require('node:test');
const assert = require('node:assert/strict');
const {dateKey, available, matches, nextDelay} = require('../fitness-watcher.user.js');
test('matches the live API YYYY/MM/DD date and HTML time input', () => {
  const s={sessionDate:'2026/11/09', startTime:'1700'};
  assert.equal(matches(s,{date:'2026-11-09',time:'17:00'}),true);
  assert.equal(matches(s,{date:'2026-11-10',time:'17:00'}),false);
  assert.equal(matches(s,{date:'2026-11-09',time:'18:45'}),false);
  assert.equal(matches(s,{date:'2026-11-09',time:''}),true);
  assert.equal(dateKey('2026-11-09T00:00:00'),'2026-11-09');
});
test('full, walk-in and closed sessions cannot trigger a booking alert', () => {
  for (const s of [{spaceRemaining:0},{spaceRemaining:-1},{spaceRemaining:99999},{spaceRemaining:3,sessionStatus:20},{spaceRemaining:3,sessionStatus:'20'}]) assert.equal(available(s),false);
  assert.equal(available({spaceRemaining:1,sessionStatus:'10'}),true);
});
test('polling has a ten second floor and exponential backoff capped at five minutes', () => {
  assert.equal(nextDelay(1),10000);
  assert.equal(nextDelay(30,1),60000);
  assert.equal(nextDelay(30,2),120000);
  assert.equal(nextDelay(30,10),300000);
});
