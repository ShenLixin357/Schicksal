/** The feature registry describes site functions, not the contents of any book.
 * Targets are closed, typed navigation capabilities, never arbitrary links or code. */
export type GuideTarget='home'|'briefing'|'parliament'|'calendar'|'honors'|'market'|'profile'|'photos'|'archives'|'library'|'books'|'collections'|'lounge'|'technology';
export type GuideEntry={id:GuideTarget;title:string;description:string;steps:string[];tags:string[];audience:'member'|'committee'|'minister';feature?:'photos'|'archives'|'library';requiresSearch?:boolean;requiresCollections?:boolean};
export const REGISTRY:readonly GuideEntry[]=[
 {id:'home',title:'帝国首页',description:'从首页浏览帝国各区域，认识共同徽记及主要入口。',steps:['打开首页','选择希望探索的区域'],tags:['入门','网站地图','home','start'],audience:'member'},
 {id:'briefing',title:'帝国简报台',description:'阅读最新简报与任务，了解帝国近期事务。首次进入网站必须先完成规定的简报阅读。',steps:['打开帝国简报台','选择简报或待办事项'],tags:['新闻','公告','通知','briefing','news'],audience:'member'},
 {id:'parliament',title:'帝国政务',description:'查看政务议案、辩论与投票页面。实际参与资格及流程仍由政务系统核验。',steps:['进入帝国政务','选择议案或相关政务页面'],tags:['议会','法案','投票','立法','government','vote'],audience:'member'},
 {id:'calendar',title:'国家节日',description:'浏览帝国的日期及国家节日。',steps:['打开国家节日'],tags:['日期','节庆','calendar'],audience:'member'},
 {id:'honors',title:'积分与荣誉',description:'进入积分与荣誉页面，了解界面中已开放的功能。',steps:['展开积分菜单','进入积分与荣誉'],tags:['积分','荣誉','honors','points'],audience:'member'},
 {id:'market',title:'跳蚤市场',description:'打开积分菜单中的跳蚤市场页面，查看当前开放的内容。',steps:['展开积分菜单','进入跳蚤市场'],tags:['市场','market'],audience:'member'},
 {id:'profile',title:'我的个人页',description:'查看自己的身份信息和当前账号所允许的个人功能。',steps:['打开个人页'],tags:['自己','档案','账号','profile','account'],audience:'member'},
 {id:'photos',title:'家庭影像馆',description:'浏览获准访问的家庭影像。照片管理与个人权利仍遵循影像馆的原有规则。',steps:['展开帝国馆藏','进入家庭影像馆'],tags:['照片','相册','photo','album'],audience:'member',feature:'photos'},
 {id:'archives',title:'国家档案馆',description:'阅读国家档案资料；书籍及正文以当前正式发布内容为准。',steps:['展开帝国馆藏','进入国家档案馆'],tags:['档案','文献','archive'],audience:'member',feature:'archives'},
 {id:'library',title:'魔法图书馆',description:'探索书架、召唤实体藏书与阅读正文。单击书籍播放召唤，双击同一搜索结果可直接阅读。',steps:['展开帝国馆藏','进入魔法图书馆','选择书籍或中央徽记'],tags:['阅读','书架','魔法书','library','read'],audience:'member',feature:'library'},
 {id:'books',title:'图书问询',description:'描述想了解的主题或问题，检索当前正式书籍。语义模型可用时支持混合检索，未配置模型时使用文字检索。',steps:['进入图书馆','打开中央徽记','选择图书问询'],tags:['知识','找书','章节','搜索正文','book search','question'],audience:'member',feature:'library',requiresSearch:true},
 {id:'collections',title:'全馆藏搜索',description:'按文字描述、文件名、标签与时间寻找获准访问的书籍及已启用的艺术或工程馆藏。图片外观语义检索尚未启用。',steps:['进入图书馆','打开全馆藏搜索','选择范围及查询条件'],tags:['找素材','工程','图片','搜索','collection','search'],audience:'member',feature:'library',requiresSearch:true,requiresCollections:true},
 {id:'lounge',title:'委员会 Lounge',description:'符合原有委员会资格的成员可以进入专属休息室。具体房间及装置以当前开放界面为准。',steps:['通过主站原有 Lounge 入口进入'],tags:['休息室','lounge','committee'],audience:'committee'},
 {id:'technology',title:'科技部',description:'以现任科技部长的独立公职身份管理网站及获准调控的功能，普通个人身份不能代替部长身份。',steps:['切换至科技部长身份','打开个人页中的科技部管理中心'],tags:['控制台','权限管理','技术监察','ministry','admin'],audience:'minister'},
];
export const GUIDE_TOURS=[{id:'start',title:'初次探索',targets:['home','briefing','profile','calendar']},{id:'knowledge',title:'探索知识与馆藏',targets:['library','books','collections','archives','photos']},{id:'government',title:'了解帝国事务',targets:['briefing','parliament','honors']},{id:'minister',title:'技术管理',targets:['technology']} ] as const;
export type GuideCopy={title:string;description:string;steps:string[];tags:string[];hidden:boolean};
export const copyOf=(e:GuideEntry):GuideCopy=>({title:e.title,description:e.description,steps:[...e.steps],tags:[...e.tags],hidden:false});
export function checkCopy(raw:unknown):GuideCopy{const v=raw as GuideCopy;if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!=='description,hidden,steps,tags,title'||typeof v.hidden!=='boolean')throw Error('invalid guide fields');const text=(x:unknown,max:number)=>{if(typeof x!=='string'||!x.trim()||x.length>max||/[\x00-\x08\x0b-\x1f]/.test(x))throw Error('invalid guide text');return x.trim();};const list=(x:unknown,max:number,n:number)=>{if(!Array.isArray(x)||x.length>n)throw Error('invalid guide list');return x.map(t=>text(t,max));};return {title:text(v.title,80),description:text(v.description,1000),steps:list(v.steps,220,8),tags:list(v.tags,60,20),hidden:v.hidden};}
