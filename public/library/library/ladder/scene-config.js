const sprite={x:190,y:141,width:184,height:623,sourceWidth:758,sourceHeight:2075};
const contactSource={x:140,y:151};
export const ladderScene=Object.freeze({
 id:'left-library-ladder', width:1671, height:941,
 assets:{original:'./assets/master/library-master-v1.png',repair:'./assets/ladder/v1/local-repair.png',body:'./assets/ladder/v2/ladder-body.png',nearWheel:'./assets/ladder/v2/wheel-near.png',farWheel:'./assets/ladder/v2/wheel-far.png',foreground:'./assets/ladder/v1/foreground.png'},
 crop:{x:170,y:145,width:238,height:650},
 sprite,
 rail:{vanishingPoint:{x:850,y:700},homeAnchor:{x:sprite.x+contactSource.x*sprite.width/sprite.sourceWidth,y:sprite.y+contactSource.y*sprite.height/sprite.sourceHeight},nearX:184,farX:300,contactSource,visibleEnd:{x:346,y:287},secondaryContactSource:{x:280,y:237}},
 wheels:[{id:'nearWheel',cx:453,cy:1974,rx:52,ry:60},{id:'farWheel',cx:665,cy:1955,rx:44,ry:52}],
 contact:{x:326,y:756},
 repairPath:'M 201 162 Q 226 160 237 194 L 261 209 Q 274 226 273 253 L 342 621 Q 351 628 365 637 Q 378 651 368 670 L 375 712 Q 392 735 378 755 Q 369 770 348 763 L 319 766 Q 284 776 270 753 L 268 715 L 259 650 L 194 231 Q 187 198 194 181 Z M 258 748 Q 312 736 380 746 Q 400 761 389 784 Q 323 798 258 777 Z',
 foregroundPaths:[
 'M 91 0 L 151 0 L 169 626 L 184 671 L 178 755 L 80 759 L 78 670 L 93 628 Z',
 'M 0 646 Q 55 648 117 691 Q 171 692 188 726 L 199 770 L 209 805 Q 287 790 331 808 L 333 837 L 411 838 L 423 856 L 417 883 L 404 896 L 415 920 L 398 941 L 0 941 Z',
 'M 165 648 L 192 647 L 193 668 L 212 665 L 219 628 Q 233 616 241 633 L 239 668 L 257 678 L 258 692 L 248 695 L 253 744 L 245 750 L 236 698 L 182 697 L 177 747 L 169 750 L 174 695 L 166 692 Z'
 ]
});

