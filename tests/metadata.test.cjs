const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('userscript runs on both Signup and SignUp URL spellings, including query strings',()=>{
  const source=fs.readFileSync(require.resolve('../fitness-watcher.user.js'),'utf8');
  const metadata=source.split('// ==/UserScript==')[0];
  const rules=[...metadata.matchAll(/^\/\/ @match\s+(\S+)/gm)].map(m=>m[1]);
  const accepts=url=>rules.some(rule=>{
    const pattern=new URL(rule), target=new URL(url);
    const pathPrefix=pattern.pathname.replace(/\*$/,'');
    return target.origin===pattern.origin && target.pathname.startsWith(pathPrefix);
  });
  for(const path of ['/Form/Signup','/Form/SignUp','/Form/Signup?from=bookmark','/Form/SignUp?from=bookmark','/Form/SignUpPs?CenterID=10002&Date=2026%2F11%2F11&HourID=10143']) {
    assert.equal(accepts('https://fcbooking.cse.hku.hk'+path),true,path);
  }
  assert.equal(accepts('https://example.com/Form/SignUp'),false);
  assert.equal(accepts('https://fcbooking.cse.hku.hk/Form/Cancel'),false);
});
