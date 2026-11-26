export function createSelection(resolve){
  // Let the second click choose the direct route before the scene or dialog changes.
  let timer, pending;
  function cancel(){
    clearTimeout(timer);
    timer=undefined;
    pending=undefined;
  }
  function activate(target,direct){
    cancel();
    resolve(target,direct);
  }
  return {
    click(target,detail,pointerType){
      if(detail===0&&pointerType!=='touch'){activate(target,false);return;}
      if((detail>1||pointerType==='touch')&&pending===target){activate(target,true);return;}
      cancel();
      pending=target;
      timer=setTimeout(()=>activate(target,false),340);
    },
    direct:target=>activate(target,true),cancel
  };
}

const normalize=value=>value.normalize('NFKC').toLocaleLowerCase('zh-CN').trim();
const titleKey=value=>normalize(value).replace(/[\p{P}\s]/gu,'');
export function searchBook(book,rawQuery){
  const query=normalize(rawQuery);
  const title=titleKey(query);
  const catalogTitle=titleKey(book.title);
  if(!query||title===catalogTitle)return [{kind:'contents'}];
  const terms=query.split(/\s+/u);
  const matches=value=>terms.every(term=>value.includes(term));
  const results=title&&catalogTitle.includes(title)?[{kind:'contents'}]:[];
  for(const chapter of book.chapters){
    if(matches(normalize(chapter.title)))results.push({
      kind:'passage',chapterId:chapter.id,chapterTitle:chapter.title
    });
    for(const block of chapter.blocks){
      if(!matches(block.searchText))continue;
      const start=Math.max(0,block.searchText.indexOf(terms[0])-22);
      const end=Math.min(block.text.length,start+85);
      const snippet=(start?'…':'')+block.text.slice(start,end)+(end<block.text.length?'…':'');
      results.push({kind:'passage',chapterId:chapter.id,blockId:block.id,chapterTitle:chapter.title,snippet});
    }
  }
  return results;
}

export function prepareBook(book){
  const template=document.createElement('template');
  for(const chapter of book.chapters){
    for(const block of chapter.blocks){
      template.innerHTML=block.html;
      block.text=(template.content.textContent??'').trim().replace(/\s+/gu,' ');
      block.searchText=normalize(block.text);
    }
  }
  return book;
}
