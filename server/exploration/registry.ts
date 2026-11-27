import type {GuideTarget} from '../guide/registry.ts';
export type Region='帝国公共区域'|'知识与艺术'|'帝国事务'|'专属区域';
export type Egg={id:string;title:string;region:Region;target:GuideTarget;hint:[string,string,string];kind:'visit'|'interaction'};
const visit=(target:GuideTarget,title:string,region:Region,hint:Egg['hint']):Egg=>({id:'visit:'+target,title,region,target,hint,kind:'visit'});
const lib=(id:string,title:string,hint:Egg['hint']):Egg=>({id:'library:'+id,title,region:'知识与艺术',target:'library',hint,kind:'interaction'});
const lounge=(id:string,title:string):Egg=>({id:'lounge:'+id,title,region:'专属区域',target:'lounge',hint:['在月色与静谧之间，或许还有未知的回响。','熟悉的专属空间也有不一样的细节。','留意空间、声音与光影之间的联系。'],kind:'interaction'});
const realm:Egg['hint']=['有些秘密就藏在日常。','熟悉的风景未必已经看尽。','不妨留意知识与艺术之间的联系。'];
export const EGGS:readonly Egg[]=[
 visit('home','帝国初见','帝国公共区域',['旅程从熟悉的光开始。','这里有一个共同的起点。','留意日常所见的公共区域。']),
 visit('briefing','帝国简报台','帝国事务',['帝国从未停止记录。','时间在公共事务中留下痕迹。','新的消息可能值得留意。']),
 visit('calendar','国家节日','帝国事务',['有些日子有不同的意义。','记忆与时间有关。','留意帝国的时间记录。']),
 visit('parliament','帝国政务','帝国事务',['共同的决定有自己的声音。','有些事需要众人参与。','留意帝国公共事务。']),
 visit('honors','积分与荣誉','帝国事务',['旅程或许留下纪念。','贡献拥有不一样的回响。','留意公民的公共记录。']),
 visit('market','跳蚤市场','帝国事务',['物品之间也有故事。','某些事物可以流转。','留意公共生活。']),
 visit('profile','我的个人页','帝国公共区域',['旅途中也值得认识自己。','每位公民都有独特的记忆。','留意与自身有关的公共入口。']),
 visit('photos','家庭影像馆','知识与艺术',['时光有时不需要文字。','画面可以留住记忆。','留意馆藏的另一种表达。']),
 visit('archives','国家档案馆','知识与艺术',['历史不会自己说话。','文字能保存往昔。','留意正式记录。']),
 visit('library','魔法图书馆','知识与艺术',realm),
 visit('books','图书问询','知识与艺术',['好奇心可以打开新世界。','知识未必需要准确的名称。','不妨从一个问题开始。']),
 visit('collections','全馆藏搜索','知识与艺术',['不同的收藏可能彼此呼应。','一段描述或许比名称更有用。','留意知识与艺术的交集。']),
 visit('lounge','委员会 Lounge','专属区域',['有些旅程属于特定身份。','你拥有的身份或许还有另一面。','留意属于自己的专属区域。']),
 visit('technology','科技部','专属区域',['秩序背后也有维护者。','有些职责与公职相连。','留意当前身份所允许的管理区域。']),
 lib('core','徽记律动',[...realm]),lib('guides','空间定位',[...realm]),lib('compare','原画对照',[...realm]),lib('fullscreen','沉浸欣赏',[...realm]),
 lib('crest','徽记召唤',[...realm]),lib('read','魔法阅读',[...realm]),lib('chapter','章节探索',[...realm]),lib('cover','封皮欣赏',[...realm]),lib('rotate','立体欣赏',[...realm]),lib('resume','重返文字',[...realm]),lib('return','藏书归位',[...realm]),
 ...['A','L1','L2','L3','L4','R1','R2','R3','R4','LT','AVS'].map((id):Egg=>lib('book:'+id,'实体藏书 · '+id,[...realm])),
 ...['left','right'].map((id):Egg=>lib('ladder:'+id,id==='left'?'左侧机关':'右侧机关',['静止的风景也许并不静止。','这里的空间可能另有变化。','留意建筑与运动的关系。'])),
 ...['candle','dome','window'].map((id):Egg=>lib('light:'+id,({candle:'烛光',dome:'穹顶光',window:'花窗光'}[id]??id)+' · 光影变化',['同一个空间可能有不同的气氛。','光与影共同塑造记忆。','留意环境中的细微变化。'])),
 ...Object.entries({'committee:moon':'月光回应','committee:portrait':'画像回应','committee:cat':'黑猫回应','committee:pumpkin':'南瓜回应','committee:scroll':'卷轴展开','committee:light':'公共光影','committee:mask':'面具探索','committee:rankings':'成绩簿','room:mafraer':'冰晶月宫','room:chryser':'翡翠书房','room:wordmage':'言灵书房','room:games':'游艺室','mafraer:light':'冰晶光芒','mafraer:moon':'月光魔力','mafraer:crystal':'水晶共鸣','mafraer:snowflake':'冰晶星轨','mafraer:observatory':'星空探索','mafraer:broom':'扫帚回响','mafraer:broom-flight':'扫帚飞行','mafraer:bed':'寝室魔法','mafraer:curtain':'床纱光影','mafraer:weather':'天气魔法','mafraer:orb-rotate':'星河旋转','vase:menu':'花瓶探索','vase:history':'花瓶往事','vase:choice':'陈设选择','vase:draw':'一次神秘揭晓','chryser:hearth':'翡翠壁炉','chryser:sigil':'翡翠刻盘','chryser:music':'翡翠音乐匣','chryser:window':'夜雨与星空','chryser:decanter':'草木香雾','chryser:clock':'座钟旋律','chryser:books':'书房札记','chryser:chair':'翡翠座椅','chryser:light':'翡翠光影','wordmage:atlas':'隐秘航路','wordmage:field':'文字磁场','wordmage:stars':'群星成图','wordmage:words':'言灵魔法','wordmage:book':'言灵书','wordmage:light':'言灵光影','games:catalogue':'游戏目录','games:console':'游戏机','games:light':'游艺室光影','game:ice-fire':'打开森林冰火人','game:aquarium':'打开怪怪水族馆','game:solitaire':'打开 Lounge Solitaire','game:potion-sort':'打开魔药排序','game:merge-game':'打开合成游戏','game:jade-sigils':'打开翡翠导光阵','game:ember-echo':'打开余烬回声'}).map(([id,title])=>lounge(id,title)),
 ...['left','inner','outer'].flatMap(id=>['gentle','strong'].map(mode=>lib('banner:'+id+':'+mode,({left:'左侧',inner:'内侧',outer:'外侧'}[id]??id)+' · '+(mode==='gentle'?'微风':'强风'),['不动的东西也许能回应你。','同一种回应未必只有一种形态。','留意空间中不属于文字的变化。']))),
];
if(new Set(EGGS.map(x=>x.id)).size!==EGGS.length)throw Error('Duplicate discovery IDs');
