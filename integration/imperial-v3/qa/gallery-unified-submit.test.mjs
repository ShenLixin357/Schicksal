import test from "node:test";
import assert from "node:assert/strict";
import {unifiedSubmission} from "../../../app/library/gallery/unified-submit.mjs";
const job={file:{name:"snow.webp"},collection:"完成作品",requestId:"work-1",versionRequestId:"version-1"};
test("new submission preserves stable work and version IDs",()=>{const a=unifiedSubmission(job),b=unifiedSubmission(job);assert.deepEqual(a,b);assert.equal(a.work,"work-1");assert.equal(new URLSearchParams(a.query).get("title"),"snow");assert.equal(new URLSearchParams(a.query).has("base"),false)});
test("version submission preserves original title/category, not file name",()=>{const q=new URLSearchParams(unifiedSubmission({...job,workId:"existing",baseVersion:"old"},{title:"原作",category:"概念设计"}).query);assert.equal(q.get("title"),"原作");assert.equal(q.get("category"),"概念设计");assert.equal(q.get("work"),"existing");assert.equal(q.get("base"),"old")});
test("reject legacy arbitrary categories and missing verified base metadata",()=>{assert.throws(()=>unifiedSubmission({...job,collection:"未分类"}));assert.throws(()=>unifiedSubmission({...job,workId:"existing",baseVersion:"old"}));assert.throws(()=>unifiedSubmission({...job,requestId:"../../x"}))});
