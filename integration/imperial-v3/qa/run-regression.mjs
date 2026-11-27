// Preserve the repository's npm test suite list; do not stop after the first failure.
import {readFileSync,appendFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const scripts=JSON.parse(readFileSync('package.json','utf8')).scripts;
const command=scripts.test;
if(typeof command!=='string')throw new Error('Missing npm test contract');
const suites=command.split('&&').map(s=>s.trim().match(/^npm run ([a-zA-Z0-9:_-]+)$/)?.[1]);
if(!suites.length||suites.some(s=>!s||!scripts[s])||new Set(suites).size!==suites.length){
  // If the package contract changes, do not silently skip commands.
  const result=spawnSync('npm',['test'],{stdio:'inherit'});
  process.exit(result.status===0?0:1);
}
const results=[];
for(const suite of suites){
  console.log('::group::'+suite);
  const result=spawnSync('npm',['run',suite],{stdio:'inherit'});
  console.log('::endgroup::');
  results.push({suite,passed:result.status===0});
}
const summary=['## Full regression suite results','','| Suite | Result |','| --- | --- |',...results.map(r=>'| '+r.suite+' | '+(r.passed?'PASS':'FAIL')+' |'),''].join('\n');
console.log(summary);
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
process.exitCode=results.every(r=>r.passed)?0:1;
