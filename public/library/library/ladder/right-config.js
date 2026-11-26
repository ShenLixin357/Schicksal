const sprite={x:1295,y:144,width:200,height:621,sourceWidth:729,sourceHeight:2157};
const contactSource={x:553,y:139};
export const rightLadderScene=Object.freeze({
 id:'right-library-ladder',width:1671,height:941,
 assets:{original:'./assets/master/library-master-v1.png',repair:'./assets/ladder/right-v2/local-repair.png',body:'./assets/ladder/right-v1/ladder-body.png',nearWheel:'./assets/ladder/right-v1/wheel-near.png',farWheel:'./assets/ladder/right-v1/wheel-far.png',foreground:'./assets/banners/v3/right-foreground.png'},
 crop:{x:1300,y:130,width:220,height:650},sprite,
 rail:{vanishingPoint:{x:850,y:700},homeAnchor:{x:sprite.x+contactSource.x*sprite.width/sprite.sourceWidth,y:sprite.y+contactSource.y*sprite.height/sprite.sourceHeight},nearX:1400,farX:1490,contactSource,secondaryContactSource:{x:402,y:269}},
 wheels:[{id:'nearWheel',cx:317,cy:2032,rx:45,ry:48},{id:'farWheel',cx:110,cy:2033,rx:40,ry:44}],contact:{x:1357,y:736},
 repairPath:'M 1447 160 Q 1477 152 1486 174 L 1475 226 L 1452 356 L 1428 492 L 1406 619 L 1408 653 L 1394 712 Q 1412 737 1390 757 L 1319 756 Q 1300 740 1314 716 L 1321 686 L 1314 661 L 1324 643 L 1341 626 L 1427 241 L 1436 224 Q 1426 201 1440 190 Z M 1305 747 Q 1355 735 1406 746 L 1416 776 Q 1366 790 1305 778 Z',
 foregroundPaths:[
 'M 1479 600 L 1488 568 L 1498 576 L 1502 602 L 1517 605 L 1518 617 L 1526 611 L 1526 580 L 1538 579 L 1541 608 L 1558 610 L 1557 620 L 1567 620 L 1578 632 L 1574 645 L 1549 650 L 1563 730 L 1553 734 L 1539 651 L 1477 655 L 1472 735 L 1461 736 L 1467 655 L 1452 651 L 1453 640 L 1479 632 Z',
 'M 1552 0 L 1613 0 L 1615 636 L 1634 693 L 1638 768 L 1543 769 L 1541 697 L 1550 644 Z',
 'M 1421 855 L 1485 817 L 1509 759 L 1554 696 L 1593 727 L 1631 773 L 1671 763 L 1671 941 L 1415 941 Z'
 ]
});
