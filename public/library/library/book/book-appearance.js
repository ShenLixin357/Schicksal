// Swap this descriptor to change the book's art without changing its motion.
export const blueBookV5=Object.freeze({
 id:'right-blue-volume-v5',
 assets:{
  spine:'./assets/book/v5/shelf-spine.png',closed:'./assets/book/v5/book-closed.png',
  open:'./assets/book/v5/book-open.png',shelf:'./assets/book/v5/shelf-repair.png',
  stand:'./assets/book/v5/stand-repair.png',cover:'./assets/book/v5/cover-face.png',
  leftPage:'./assets/book/v5/page-left.png',rightPage:'./assets/book/v5/page-right.png'
 },
 shelf:{x:1626,y:457,spineWidth:17,spineHeight:50,repairX:1585,repairY:420,hit:{x1:1620,y1:434,x2:1633,y2:481}},
 stand:{x:835,y:626,repairX:740,repairY:570,openWidth:166,openHeight:70},
 hover:{x:835,y:526,closedWidth:92,closedHeight:62,openWidth:140,openHeight:59},
 closedPose:{binding:[{x:.045,y:.60},{x:.53,y:.04}],offset:{x:19.55,y:11.16}},
 closedSpineAnchor:{x:.29,y:.38},
 // Opposing shelves can supply mirrored poses through their own descriptor.
 shelfSide:'right',bindingSide:'left'
});
