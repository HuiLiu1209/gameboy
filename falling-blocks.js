// Each rotation is made from a square matrix so the pivot stays fixed.
const pieces = [
  ['....','####','....','....'], ['##','##'], ['.#.','###','...'],
  ['.##','##.','...'], ['##.','.##','...'], ['#..','###','...'], ['..#','###','...']
];
const emptyRow = () => Array(10).fill(0);

export class FallingBlocks {
  constructor(sound = () => {}) {
    this.sound = sound;
    this.board = Array.from({length:20},emptyRow);
    this.bag = [];
    this.lines = 0;
    this.score = 0;
    this.over = false;
    this.next = this.drawPiece();
    this.spawn();
  }
  drawPiece() {
    if (!this.bag.length) {
      this.bag = pieces.map((_,i)=>i);
      for (let i=this.bag.length-1;i>0;i--) {
        const j = Math.floor(Math.random()*(i+1));
        [this.bag[i],this.bag[j]] = [this.bag[j],this.bag[i]];
      }
    }
    return this.bag.pop();
  }
  spawn() {
    this.kind = this.next;
    this.next = this.drawPiece();
    this.shape = pieces[this.kind];
    this.x = Math.floor((10-this.shape.length)/2);
    this.y = 0;
    this.over = !this.fits(this.shape,this.x,this.y);
  }
  fits(shape,x,y) {
    return shape.every((row,dy)=>[...row].every((cell,dx)=>
      cell!== '#' || (this.board[y+dy]?.[x+dx]===0)));
  }
  shift(dx) {
    if (this.fits(this.shape,this.x+dx,this.y)) this.x+=dx;
  }
  rotate() {
    const rotated = this.shape.map((_,i)=>this.shape.map(row=>row[i]).reverse().join(''));
    for (const offset of [0,-1,1,-2,2]) {
      if (this.fits(rotated,this.x+offset,this.y)) {
        this.shape = rotated;
        this.x += offset;
        return;
      }
    }
  }
  step() {
    if (this.over) return;
    if (this.fits(this.shape,this.x,this.y+1)) { this.y++; return; }
    this.shape.forEach((row,dy)=>[...row].forEach((cell,dx)=>{
      if(cell==='#') this.board[this.y+dy][this.x+dx] = this.kind+1;
    }));
    this.board = this.board.filter(row=>row.includes(0));
    const cleared = 20-this.board.length;
    this.score += [0,100,300,500,800][cleared]*(1+Math.floor(this.lines/10));
    this.lines += cleared;
    if (cleared) this.sound('lineClear', cleared);
    while(this.board.length<20) this.board.unshift(emptyRow());
    this.spawn();
  }
  draw(ctx,text,ink,mid,light) {
    const block = (x,y,kind)=>{
      ctx.fillStyle = ink;
      ctx.fillRect(x,y,6,6);
      ctx.fillStyle = kind%2 ? mid : light;
      ctx.fillRect(x+1,y+1,4,4);
      ctx.fillStyle = light;
      ctx.fillRect(x+1,y+1,2,1);
    };
    const shape = (rows,x,y,kind)=>rows.forEach((row,dy)=>[...row].forEach((c,dx)=>{
      if(c==='#') block(x+dx*6,y+dy*6,kind);
    }));
    ctx.fillStyle = ink;
    ctx.fillRect(9,10,64,124);
    ctx.fillStyle = light;
    ctx.fillRect(11,12,60,120);
    this.board.forEach((row,y)=>row.forEach((cell,x)=>{
      if(cell) block(11+x*6,12+y*6,cell-1);
    }));
    if(!this.over) shape(this.shape,11+this.x*6,12+this.y*6,this.kind);
    ctx.fillStyle = ink;
    text('NEXT',84,13);
    shape(pieces[this.next],92,31,this.next);
    ctx.fillStyle = ink;
    text('SCORE',84,65); text(String(this.score),84,79);
    text('LINES',84,102); text(String(this.lines),84,116);
  }
}
