const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createStorage}=require('../fitness-watcher.user.js');
function api(asyncMode) {
  const values=new Map();
  const wrap=fn=>asyncMode?async(...args)=>fn(...args):fn;
  return {getValue:wrap((k,d)=>values.get(k)??d),setValue:wrap((k,v)=>values.set(k,v)),deleteValue:wrap(k=>values.delete(k))};
}
for(const mode of ['legacy','modern']) test(`${mode} storage round trip and deletion`,async()=>{
  const storage=createStorage({[mode]:api(mode==='modern')});
  assert.equal(storage.persistent,true);
  assert.equal(await storage.get('profile'),null);
  await storage.put('profile',{name:'Demo'});
  assert.deepEqual(await storage.get('profile'),{name:'Demo'});
  await storage.erase('profile');assert.equal(await storage.get('profile'),null);
});
test('a delayed async save cannot resurrect a profile after delete',async()=>{
  let finishSave;const values=new Map();
  const storage=createStorage({modern:{getValue:k=>values.get(k)??null,setValue:(k,v)=>new Promise(resolve=>{finishSave=()=>{values.set(k,v);resolve();};}),deleteValue:async k=>values.delete(k)}});
  const save=storage.put('profile','Demo'), clear=storage.erase('profile');
  await Promise.resolve();finishSave();await Promise.all([save,clear]);
  assert.equal(await storage.get('profile'),null);
});
test('failed writes reject, and the queue remains usable for a later delete',async()=>{
  const modern=api(true);modern.setValue=async()=>{throw new Error('quota');};
  const storage=createStorage({modern});
  await assert.rejects(storage.put('profile',{}),/quota/);
  await storage.erase('profile');assert.equal(await storage.get('profile'),null);
});
test('no manager storage uses session memory, not website localStorage',async()=>{
  const storage=createStorage();assert.equal(storage.persistent,false);
  await storage.put('profile','Demo');assert.equal(await storage.get('profile'),'Demo');
  assert.equal(await createStorage().get('profile'),null);
});
