#!/usr/bin/env python3
"""Exact three-file reconciliation for the preserved V3.2 intake; no activation."""
import pathlib, re, subprocess
def rep(s,a,b):
    assert s.count(a)==1, 'Expected one anchor: '+a[:130]
    return s.replace(a,b,1)
def resolve(path, funcs):
    p=pathlib.Path(path); s=p.read_text()
    pattern=r'^<<<<<<< HEAD\n(.*?)^=======\n(.*?)^>>>>>>> [^\n]+\n'
    matches=list(re.finditer(pattern,s,re.M|re.S))
    assert len(matches)==len(funcs), (path,len(matches))
    out=[]; pos=0
    for m,fn in zip(matches,funcs):
        out.append(s[pos:m.start()]);out.append(fn(m[1],m[2]));pos=m.end()
    out.append(s[pos:]);s=''.join(out)
    assert not re.search(r'^(<<<<<<<|=======|>>>>>>>)',s,re.M),path
    p.write_text(s);return s
def edit(path,fn):
    p=pathlib.Path(path);p.write_text(fn(p.read_text()))
def section_header(a,b):
    b=rep(b,'lazy,Suspense,','')
    b=rep(b,'DYNAMIC_LIBRARY_ENABLED,LIBRARY_COLLECTIONS_ENABLED,LIBRARY_SEMANTIC_SEARCH_ENABLED','DYNAMIC_LIBRARY_ENABLED,LIBRARY_SEMANTIC_SEARCH_ENABLED')
    b=rep(b,'import {CollectionSearch} from "./search/collection-search";\n','')
    b=rep(b,'const LibraryCollections=lazy(()=>import("./library-collections").then(m=>({default:m.LibraryCollections})));\n','')
    b=rep(b,'onError?:(error:unknown)=>void}', 'onError?:(error:unknown)=>void;onReady?:()=>void}')
    return rep(b,'{technology=false,onOpenGuide,initialSearch}:{technology?:boolean;onOpenGuide?:()=>void;initialSearch?:"books"|"collections"}','{technology=false,onOpenGuide,onOpenCollectionSearch,initialSearch,onReady,onLoading,onFailure}:{technology?:boolean;onOpenGuide?:()=>void;onOpenCollectionSearch?:()=>void;initialSearch?:"books";onReady?:()=>void;onLoading?:()=>void;onFailure?:()=>void}')
def section_mount(a,b):
    return rep(a,'{debug,onReady:', '{debug,dynamic:DYNAMIC_LIBRARY_ENABLED,semanticSearch:LIBRARY_SEMANTIC_SEARCH_ENABLED&&DYNAMIC_LIBRARY_ENABLED,onOpenCollectionSearch:()=>callbacks.current.onOpenCollectionSearch?.(),onOpenGuide:()=>callbacks.current.onOpenGuide?.(),initialBookSearch:initialSearch==="books",onDiscover:recordExploration,onReady:').replace('debug=allowed;','debug=allowed;setManagement(allowed&&DYNAMIC_LIBRARY_ENABLED);')
def section_end(a,b):
    return rep(rep(rep(a,'setError(false);onLoading?.();','setError(false);setManagement(false);onLoading?.();'),'[technology,attempt,onReady,onLoading,onFailure]','[technology,attempt,initialSearch,onReady,onLoading,onFailure]'),'<div className="library-native-host" ref={host}/></section>','<div className="library-native-host" ref={host}/>{management&&technology&&<LibraryManagement onPublished={()=>setAttempt(n=>n+1)}/>}</section>')
p='app/library/library-section.tsx'
resolve(p,[section_header,section_mount,section_end])
def cleanup_section(s):
    a=s.index('  const [authorized,setAuthorized]');b=s.index('  const [attempt,setAttempt]',a)
    return s[:a]+'  const callbacks=useRef({onOpenGuide,onOpenCollectionSearch});callbacks.current={onOpenGuide,onOpenCollectionSearch};\n'+s[b:]
edit(p,cleanup_section)
def entrance(s):
    s=rep(s,'onFailure?:()=>void};','onFailure?:()=>void;onOpenGuide?:()=>void;onOpenCollectionSearch?:()=>void;initialSearch?:"books"};')
    s=rep(s,'{component:Scene,technology,onExit}:{component:ComponentType<SceneProps>;technology:boolean;onExit:()=>void}','{component:Scene,technology,onExit,onOpenGuide,onOpenCollectionSearch,initialSearch}:{component:ComponentType<SceneProps>;technology:boolean;onExit:()=>void;onOpenGuide?:()=>void;onOpenCollectionSearch?:()=>void;initialSearch?:"books"}')
    return rep(s,'onFailure={failure}/>','onFailure={failure} onOpenGuide={onOpenGuide} onOpenCollectionSearch={onOpenCollectionSearch} initialSearch={initialSearch}/>')
edit('app/library/library-entrance.tsx',entrance)
def page_library(a,b):
    return rep(a,'<LibraryEntrance component={LibrarySection}', '<LibraryEntrance key={guideVisit.serial} component={LibrarySection} onOpenGuide={IMPERIAL_GUIDE_ENABLED?()=>setGuideOpen(true):undefined} onOpenCollectionSearch={()=>{if(LIBRARY_COLLECTIONS_ENABLED)setSection("gallery")}} initialSearch={guideVisit.target==="books"?"books":undefined}') + '    case "gallery": content = LIBRARY_COLLECTIONS_ENABLED ? <FeatureSuspense label="Gallery" onExit={()=>setSection("home")}><LibraryCollections minister={accountMode==="technology"&&isCurrentMinister}/></FeatureSuspense> : <HomeSection go={setSection}/>; break;\n'
def page_toast(a,b):
    guide=next(x for x in b.splitlines() if '<GuidePanel ' in x)
    return guide+'\n'+a
p='app/page.tsx';resolve(p,[page_library,page_toast])
def page(s):
    s=rep(s,'ExplorationVisit,DiscoveryToast','ExplorationVisit')
    s=rep(s,'import { IMPERIAL_GUIDE_ENABLED }','import { IMPERIAL_GUIDE_ENABLED, LIBRARY_COLLECTIONS_ENABLED }')
    s=rep(s,'import { ProfileCrystalEmblem } from "./profile/profile-crystal-emblem";','import { ProfileCrystalEmblem } from "./profile/profile-crystal-emblem"; import { PersonalExplorationSummary } from "./guide/personal-exploration-summary";')
    anchor='const LibrarySection = lazy(() => import("./library/library-section").then(module => ({ default: module.LibrarySection })));'
    s=rep(s,anchor,anchor+'\nconst LibraryCollections = lazy(() => import("./library/library-collections").then(m=>({default:m.LibraryCollections})));')
    s=rep(s,'placement="profile-personal-simple" />}/><ProfileSupplement id={citizen.id}/>', 'placement="profile-personal-simple" />}/><ProfileSupplement id={citizen.id}/><PersonalExplorationSummary identity={citizen.id+":citizen"}/><section aria-label="私人工作区"><h3>私人工作区</h3><p>尚未开放。</p></section>')
    s=rep(s,'if(target==="books"||target==="collections"||target==="library")','if(target==="collections"&&LIBRARY_COLLECTIONS_ENABLED){setSection("gallery");}else if(target==="books"||target==="collections"||target==="library")')
    return s
edit(p,page)
def nav(s):
    s=rep(s,'/** Single source of truth','import {LIBRARY_COLLECTIONS_ENABLED} from "../library/library-mode";\n/** Single source of truth')
    s=rep(s,'CollectionDestination = "library"','CollectionDestination = "gallery" | "library"')
    return rep(s,'{ id: "library", label: "魔法图书馆" },','{ id: "library", label: "魔法图书馆" },\n  ...(LIBRARY_COLLECTIONS_ENABLED ? [{id:"gallery" as const,label:"Gallery · 艺术馆藏"}] : []),')
edit('app/shell/navigation.ts',nav)
def mount_header(a,b):return rep(b,'onError=()=>{}}','onError=()=>{},onReady=()=>{}}')
def mount_search(a,b):return b[:b.index('for(const button of [crest,openCatalog])')]+a
def mount_controls(a,b):
    return rep(rep(a,'stage.lights[key]=1-stage.lights[key];','stage.lights[key]=1-stage.lights[key];discover("library:light:"+key);'),"stage.setView({compare});selection.cancel();","stage.setView({compare});selection.cancel();discover('library:compare');")
def mount_boot(a,b):
    a=rep(a,'loadDocuments(abort.signal),styleReady','(dynamic?loadPublishedCatalog(abort.signal).then(data=>{publishedAnimations=data.animations;return data.documents;}):loadDocuments(abort.signal)),styleReady')
    a=rep(a,'const slot=stage.slots.find(s=>s.id===bindingForBook(doc.id).slotId);','const binding=bindingForBook(doc.id);if(!binding)continue;const slot=stage.slots.find(s=>s.id===binding.slotId);if(!slot)continue;')
    return rep(a,'onReady();schedule();','onReady();schedule();discover("visit:library");if(initialBookSearch&&semanticSearch)void showCatalog({currentTarget:crest});')
p='public/library/library/catalog/mount.js'
s=resolve(p,[mount_header,mount_search,mount_controls,mount_boot])
assert 'openCatalog' not in s and 'styleReady' in s and 'ready=true' in s
# Existing SQL proposal: only approved books can remain displayed; do not run migrations.
def sql(s):
    s=rep(s,'WHERE d.revision=(SELECT MAX(x.revision) FROM imperial_slot_displays x WHERE x.slot=d.slot);','WHERE d.revision=(SELECT MAX(x.revision) FROM imperial_slot_displays x WHERE x.slot=d.slot) AND EXISTS(SELECT 1 FROM imperial_review_current r WHERE r.kind=\'book\' AND r.entity=d.book AND r.state=\'approved\');')
    return rep(s,"THEN RAISE(ABORT,'not bound') END;\nEND;","THEN RAISE(ABORT,'not bound') END;\n SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM imperial_review_current r WHERE r.kind='book' AND r.entity=NEW.book AND r.state='approved') THEN RAISE(ABORT,'not approved') END;\nEND;")
edit('integration/imperial-v3/foundation/collection-review.proposed.sql',sql)
print('Resolved three conflicts preserving R5 readiness, original controls, guide and collection navigation; approval SQL fixed, gates unchanged.')
