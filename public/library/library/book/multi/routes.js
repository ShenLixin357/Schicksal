export const hovering={x:835,y:548};
export const podium={x:835,y:654};

// Control points use the library's original scene coordinates.
export const routeBook={
  A:{route:'A',title:'近侧小回环',cover:'navy'},
  L1:{route:'C',title:'高位单圈',cover:'wine',duration:3.65,segments:[
    [0,0,350,190,535,182],[598,180,666,126,632,82],
    [590,30,464,51,457,109],[445,182,532,205,599,218],
    [764,254,823,415,835,548]
  ]},
  L2:{route:'G',title:'长 S 弧',cover:'navy',duration:2.85,segments:[
    [0,0,250,182,378,235],[500,285,465,385,583,417],
    [687,445,772,429,835,548]
  ]},
  L3:{route:'K',title:'绕徽记半圈',cover:'plum',duration:2.90,segments:[
    [0,0,631,443,725,477],[800,502,953,450,1016,477],
    [1069,500,1081,551,1030,581],[981,609,889,603,835,548]
  ],crest:[1,2]},
  L4:{route:'J',title:'一弧到位',cover:'navy',duration:2.00,segments:[
    [0,0,463,393,590,460],[702,519,764,535,835,548]
  ]},
  R1:{route:'L',title:'高处滑翔',cover:'plum',duration:3.30,segments:[
    [0,0,1503,57,1400,113],[1230,199,1172,386,1036,495],
    [963,553,894,550,835,548]
  ]},
  R2:{route:'K',title:'绕徽记半圈',cover:'wine',duration:3.50,segments:[
    [0,0,1513,374,1422,401],[1274,445,1136,430,984,472],
    [897,496,716,442,657,480],[600,517,620,556,660,581],
    [710,611,787,606,835,548]
  ],crest:[2,3]},
  R3:{route:'I',title:'飞过再回来',cover:'navy',duration:2.48,segments:[
    [0,0,1113,406,1061,445],[1025,472,1018,514,1002,550],
    [986,586,949,611,918,619],[874,631,808,646,783,625],
    [766,611,811,562,835,548]
  ],crestPass:{
    approach:[0,1],departure:[.75,1.12],
    returnWaypoints:[[.78,970,623,224,-28],[1.54,1080,542,125,-158]]
  }},
  R4:{route:'H',title:'双掠',cover:'wine',duration:2.85,segments:[
    [0,0,1305,472,1225,499],[1158,520,1160,413,1054,402],
    [1010,397,984,410,976,455],[968,500,970,561,937,594],
    [900,631,862,593,835,548]
  ],crestPass:{
    approach:[1,2],departure:[.75,1.12],
    // Rise above the stand's right arm before moving across it.
    returnWaypoints:[[.28,836,563,15,-80],[.52,901,566,290,75],
      [.78,970,623,224,-28],[1.60,1127,501,205,-162]]
  }},
  LT:{kind:'teleport',title:'瞬移',cover:'navy'},
  AVS:{kind:'archive',title:'如何从零建立一个国家',cover:'wine',coverAsset:'archive-v1/cover.webp',shelfSide:'left'}
};

export const commonSettings=Object.freeze({
  extract:1,flight:1,shape:1,height:0,bank:1,depth:1,reading:1,descent:.86,returnSpeed:1,returnBuffer:0
});
const finalized={
  A:{total:5.40,extract:.95,acceleration:2.40,loopSpeed:.75,loopSize:1.05,loopHeight:-65,
    exitSpeed:1.25,deceleration:1,reading:1.40,descent:.50,returnSpeed:1.30},
  L1:{flight:1.05,shape:.90,bank:1.10},
  L2:{shape:1.25,height:44,bank:1.05,depth:.80,returnSpeed:.90},
  L3:{flight:1.30,shape:.95,height:40,bank:1.70,returnSpeed:.80},
  L4:{shape:.85,height:-18,bank:1.70,depth:.95,descent:.90},
  R1:{shape:1.25,height:40,bank:1.70,depth:.95,returnSpeed:.65,returnBuffer:1.10},
  R2:{flight:1.15,shape:1.25,height:18,bank:1.70,returnSpeed:.95},
  R3:{flight:1.30,shape:.85,height:2,bank:1.10,depth:.95,reading:1.15,returnSpeed:.85},
  R4:{flight:1.05,shape:1.25,height:20,bank:1.70,reading:1.10,descent:.95,returnSpeed:.95},
  LT:{flashIntensity:1.40,flashDuration:.70,teleportDelay:.36,reading:1.00,descent:.86},
  AVS:{
    domeSize:1.40,domeLight:1.00,domePulse:.20,domeHold:.20,
    fallTime:1.35,catchBounce:2.20,reboundSpeed:.65,flutter:1.45,
    beamTime:1.00,beamWidth:1.60,reading:1.00,descent:1.11
  }
};
export const finalizedBookIds=Object.keys(finalized);
export const defaultsFor=id=>({...commonSettings,...finalized[id]});

export const commonFields=[
  ['extract','抽书时长倍率',.65,1.6,.05,'×'],
  ['flight','去程时长倍率',.65,1.6,.05,'×'],
  ['shape','弯道幅度',.75,1.25,.05,'×'],
  ['height','航线高度',-44,44,2,'px'],
  ['bank','飞行侧倾',0,1.7,.05,'×'],
  ['depth','途中透视',.7,1.3,.05,'×'],
  ['reading','悬停与翻页时长倍率',.6,1.6,.05,'×'],
  ['descent','下降时长',.4,1.5,.01,'s'],
  ['returnSpeed','回程速度',.55,1.65,.05,'×']
];
export const returnBufferField=['returnBuffer','回程起步缓冲',0,1.2,.05,'s'];
export const teleportFields=[
  ['flashIntensity','闪光强度',.5,1.4,.05,'×'],
  ['flashDuration','单次闪光时长',.20,.80,.01,'s'],
  ['teleportDelay','两次闪光间隔',.10,.40,.01,'s'],
  ...commonFields.filter(([key])=>key==='reading'||key==='descent')
];
export const archiveFields=[
  ['domeSize','穹顶标识大小',.65,1.45,.05,'×'],
  ['domeLight','穹顶标识亮度',.40,1.65,.05,'×'],
  ['domePulse','穹顶闪光幅度',0,.65,.05,'×'],
  ['domeHold','穹顶标识停留',.15,1.2,.01,'s'],
  ['fallTime','自由下落时长',.70,2.20,.01,'s'],
  ['catchBounce','接住后回弹幅度',.60,2.20,.05,'×'],
  ['reboundSpeed','向上回弹速度',.60,1.80,.05,'×'],
  ['flutter','书页摆动幅度',0,1.70,.05,'×'],
  ['beamTime','光束上升时长',.45,1.6,.01,'s'],
  ['beamWidth','光束宽度',.50,1.60,.05,'×'],
  ...commonFields.filter(([key])=>key==='reading'||key==='descent')
];
export const aFields=[
  ['total','基础去程时长',3,12,.1,'s'],['extract','抽书时长',.65,1.60,.01,'s'],
  ['acceleration','起飞加速度',.5,3,.1,'×'],['loopSpeed','小回环相对速度',.4,1.2,.05,'×'],
  ['loopSize','小回环大小',.5,1.6,.05,'×'],['loopHeight','小回环高度偏移',-65,65,1,'px'],
  ['exitSpeed','出环后速度',.45,1.25,.05,'×'],['deceleration','接近时减速强度',.5,3,.1,'×'],['reading','悬停与翻页时长',.7,3,.1,'s'],
  ['descent','下降时长',.3,1.5,.05,'s'],['returnSpeed','回程速度',.4,2,.1,'×']
];
