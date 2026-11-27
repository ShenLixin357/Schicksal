#!/usr/bin/env python3
"""Merge Gallery navigation after V2.5, preserving both storage and ACL paths."""
import hashlib,pathlib,argparse,subprocess
HASHES={
 'app/library/library-collections.tsx':'649abb6cbfa2b0b86af700e4cce278421eeb34bc',
 'app/library/gallery/gallery-panel.tsx':'ed7262763574479d597335e2f79dc72f4d761145',
 'app/library/digital/digital-panel.tsx':'c478c198e301e92096ae0a0187bf3b3a60d31f4a',
}
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def rep(s,a,b):
 if s.count(a)!=1:raise ValueError('Unexpected Gallery anchor: '+a[:120])
 return s.replace(a,b,1)
def apply(root,check=False):
 out={}
 for path,digest in HASHES.items():
  p=root/path
  if p.is_symlink() or blob(p.read_bytes())!=digest:raise ValueError('Gallery baseline mismatch: '+path)
  s=p.read_text()
  if path.endswith('/library-collections.tsx'):
   s=rep(s,"useState<'gallery'|'digital'|'assets'|'discovery'>", "useState<'gallery'|'assets'|'discovery'>")
   s=rep(s,"const [searchOpen,setSearchOpen]=useState(false);", "const [media,setMedia]=useState<'images'|'digital'>('images');const [searchOpen,setSearchOpen]=useState(false);")
   s=rep(s,'<button aria-pressed={active===\'gallery\'} onClick={()=>setTab(\'gallery\')}>Gallery</button><button aria-pressed={active===\'digital\'} onClick={()=>setTab(\'digital\')}>数字藏品</button>','<button aria-pressed={active===\'gallery\'} onClick={()=>setTab(\'gallery\')}>Gallery · 艺术馆藏</button>')
   s=rep(s,"active==='gallery'?<Gallery key={'gallery:'+minister} minister={minister}/>:active==='digital'?<Digital key={'digital:'+minister} minister={minister}/>",'''active==='gallery'?<section aria-label="Gallery · 艺术与数字作品"><header><h2>Gallery</h2><p>图像、模型、动画与数字作品统一收录；工程资料保留原稿、项目与版本记录。不同媒介仍使用原有安全预览与访问权限。</p></header><nav aria-label="Gallery 媒介"><button type="button" aria-pressed={media==='images'} onClick={()=>setMedia('images')}>图像与设计</button><button type="button" aria-pressed={media==='digital'} onClick={()=>setMedia('digital')}>数字作品与工程档案</button></nav>{media==='images'?<Gallery key={'gallery:'+minister} minister={minister}/>:<Digital key={'digital:'+minister} minister={minister}/>}</section>''')
  elif path.endswith('/gallery-panel.tsx'):
   s=rep(s,'<h2>艺术馆藏</h2>','<h2>图像与设计</h2>')
  else:
   s=rep(s,"useState('工程档案')","useState('数字作品')")
   s=rep(s,'<section aria-label="数字藏品"><h2>数字藏品与工程档案</h2>','<section aria-label="Gallery 数字作品与工程档案"><h2>数字作品与工程档案</h2>')
  out[path]=s
 if not check:
  for path,s in out.items():(root/path).write_text(s)
 return len(out)
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('root',type=pathlib.Path);p.add_argument('--check',action='store_true');a=p.parse_args()
 if not a.check:
  branch=subprocess.check_output(['git','-C',str(a.root),'branch','--show-current'],text=True).strip()
  if not branch or branch in ('main','master'):raise SystemExit('Require an isolated candidate branch')
 print('Gallery unified paths:',apply(a.root,a.check))
