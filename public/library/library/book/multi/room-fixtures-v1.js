import {createSceneMask} from './foreground-occluders-v1.js';

// Only the faces bordering each slot sit in front of the inserting book.
// The hall's columns and hanging cloth remain behind the approach.
const farShelfSlot=new Path2D(`
  M 1170 399 L 1173 398 L 1172 438 L 1169 440 Z
  M 1188 390 L 1191 388 L 1191 427 L 1188 429 Z
  M 1173 401 L 1188 391 L 1188 397 L 1173 407 Z
  M 1173 434 L 1188 424 L 1188 428 L 1173 440 Z
`);

const nearShelfSlot=new Path2D(`
  M 1345 351 L 1348 349 L 1348 381 L 1345 385 Z
  M 1373 335 L 1379 331 L 1378 370 L 1372 373 Z
  M 1351 349 L 1374 333 L 1374 340 L 1351 357 Z
  M 1351 378 L 1373 366 L 1373 374 L 1351 386 Z
`);

const deskCandle=new Path2D(`
  M 928 621 Q 930.5 618 932 620 Q 934 621 934 626
  Q 937 628 938 633 L 937 642
  Q 943 640 943 643 Q 942 646 937 648
  Q 937 653 933 657 L 932 660 Q 932 664 932 670
  Q 933 675 937 676 L 943 677 Q 947 678 947 681
  Q 941 684 929 683 L 918 682 Q 915 680 918 678
  Q 924 677 926 674 L 928 662 L 926 657 Q 924 654 923 650
  Q 919 648 921 644 L 924 645 Q 925 642 924 638
  L 924.5 632 Q 925 628 928 626 Z
`);

const wallCandleBody=new Path2D(`
  M 1279 491 Q 1280 489 1282 488 Q 1284 491 1284 493
  L 1284 508 Q 1287 509 1288 510 Q 1286 514 1283 515
  L 1281 518 L 1279 514 Q 1275 514 1276 511 L 1279 510 Z
  M 1292 482 Q 1295 479 1296 474 Q 1297 480 1300 485
  L 1301 503 Q 1300 507 1301 507 Q 1304 508 1301 510 L 1298 512
  L 1297 531 L 1294 534 L 1293 530 L 1294 512
  Q 1289 510 1290 508 L 1293 506 Z
  M 1305 492 Q 1307 490 1308 486 Q 1310 489 1311 493
  L 1311 506 L 1312 508 Q 1315 511 1311 513 L 1309 518
  L 1307 518 L 1305 514 Q 1302 512 1303 509 L 1305 507 Z
  M 1292 526 Q 1296 523 1300 521 L 1302 522 L 1299 532
  L 1298 543 L 1296 548 Q 1294 547 1295 542 L 1292 538 Z
`);
const wallCandleArms=new Path2D(`
  M 1281 515 C 1280 527 1287 530 1296 532
  M 1290 514 C 1288 515 1286 525 1292 526 L 1295 525
  M 1308 517 Q 1310 530 1301 526
  M 1297 527 Q 1301 518 1304 522
`);

export function createShelfSlotMasks(){
  return {
    R3:createSceneMask([1167,387,26,55],ctx=>ctx.fill(farShelfSlot)),
    R4:createSceneMask([1343,329,38,59],ctx=>ctx.fill(nearShelfSlot))
  };
}

export function createWallSconceMask(){
  return createSceneMask([1274,471,43,82],ctx=>{
    ctx.fill(wallCandleBody);
    ctx.lineCap='round';
    ctx.lineWidth=2.4;
    ctx.stroke(wallCandleArms);
  });
}

export function createDeskCandleMask(){
  return createSceneMask([912,615,39,71],ctx=>ctx.fill(deskCandle));
}

// The front rail holds the binding. The raised outer arms sit behind the open
// pages, but in front of a book still approaching from the back of the room.
const standFront=new Path2D(`
  M 778.2 639.3 Q 779.5 637.8 781.2 639
  Q 788 644.6 796.7 647 L 799 646.6 L 800.8 648.7
  Q 807 649.7 814 651.4 L 823.5 653.3
  Q 825.7 652 827.1 655 Q 829.5 657.5 832.2 657.7
  Q 830.9 654 833.7 652.1 Q 836 650 838.9 652.3
  Q 841.6 654.4 839.7 657.6 Q 843 657.4 845.2 655.2
  Q 846.4 652.8 849.3 653.3 L 859.8 651.2
  L 872.3 648.6 L 874 646.8 L 876.1 647.1
  Q 884.9 644.7 890.1 639.2 Q 891.7 637.5 893.0 639.4
  Q 894.1 640.8 892.7 642.7 Q 886.3 648.8 876.5 651.4
  Q 875.5 654.4 873.3 652.8 L 849.6 657.3
  Q 846.2 661.2 838.7 661.9 Q 831.1 662.5 825.2 657.6
  L 800.4 652.8 Q 798.2 655 797 651.8 Q 785.6 648.5 779 642.7
  Q 777.3 642 778.2 639.3 Z
`);
const standArms=new Path2D(`
  M 770.3 612.4 Q 772.5 610 774.2 612.3
  Q 776 614.1 774.7 616 L 773.8 617.2
  Q 775.5 630 780.7 638.7 L 778.8 641.4
  Q 773.4 633.6 771.5 617.2 Q 768.1 615.5 770.3 612.4 Z
  M 895.9 612.5 Q 898.1 610 900.5 612.2
  Q 902.3 614.6 899.7 617.4 Q 898.4 630.2 892.8 641.3
  L 890.5 639.5 Q 895.8 629.5 896.5 617.3 Q 894.3 615.1 895.9 612.5 Z
`);

export function createStandMasks(){
  const bounds=[766,609,140,56];
  return {
    front:createSceneMask(bounds,ctx=>ctx.fill(standFront)),
    approaching:createSceneMask(bounds,ctx=>{
      ctx.fill(standFront);
      ctx.fill(standArms);
    })
  };
}
