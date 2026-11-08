const clamp = (n,low,high)=>Math.max(low,Math.min(high,n));
const directions = {left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]};

function hud(ctx,text,name,score,ink) {
  ctx.fillStyle = ink;
  text(name,10,8);
  const digits = String(score).padStart(3,'0');
  text(digits,150-digits.length*8,8);
  ctx.fillRect(6,17,148,1);
}
function stamp(ctx,rows,x,y) {
  rows.forEach((row,j)=>[...row].forEach((c,i)=>{
    if(c==='#') ctx.fillRect(Math.round(x)+i,Math.round(y)+j,1,1);
  }));
}

export class Snake {
  constructor(sound = () => {}) {
    this.sound = sound;
    this.body = [[9,9],[8,9],[7,9]];
    this.heading = 'right';
    this.turns = [];
    this.score = 0;
    this.over = false;
    this.placeFood();
  }
  get tickMs() { return Math.max(85,195-this.score*3); }
  placeFood() {
    const free = [];
    for(let y=0;y<19;y++) for(let x=0;x<24;x++) {
      if(!this.body.some(([bx,by])=>bx===x && by===y)) free.push([x,y]);
    }
    this.food = free[Math.floor(Math.random()*free.length)];
    if(!this.food) this.over = this.won = true;
  }
  input(action) {
    if(!directions[action] || this.turns.length>=2) return;
    const [dx,dy] = directions[this.turns.at(-1) || this.heading];
    const [nx,ny] = directions[action];
    if(dx*nx+dy*ny===0) this.turns.push(action);
  }
  step() {
    this.heading = this.turns.shift() || this.heading;
    const [dx,dy] = directions[this.heading];
    const x = this.body[0][0]+dx, y = this.body[0][1]+dy;
    const eating = x===this.food[0] && y===this.food[1];
    const solid = eating ? this.body : this.body.slice(0,-1);
    if(x<0||y<0||x>=24||y>=19||solid.some(p=>p[0]===x&&p[1]===y)) {
      this.over=true; return;
    }
    this.body.unshift([x,y]);
    if(eating) { this.score++; this.sound('eat'); this.placeFood(); } else this.body.pop();
  }
  draw(ctx,text,ink,mid,light) {
    hud(ctx,text,'SNAKE',this.score,ink);
    ctx.strokeStyle = mid;
    ctx.strokeRect(6.5,21.5,147,117);
    this.body.forEach(([x,y],i)=>{
      ctx.fillStyle = i===0?ink:mid;
      ctx.fillRect(8+x*6,23+y*6,6,6);
      ctx.fillStyle = i===0?light:ink;
      if(i===0) {
        const [dx,dy]=directions[this.heading];
        ctx.fillRect(10+x*6+dx*2,25+y*6+dy*2,2,2);
      } else ctx.fillRect(9+x*6,24+y*6,4,4);
    });
    if(this.food) {
      ctx.fillStyle=ink;
      stamp(ctx,['...#..','..#...','.####.','#####.','.###..'],8+this.food[0]*6,23+this.food[1]*6);
    }
  }
}

export class Breakout {
  constructor(sound = () => {}) {
    this.sound = sound;
    this.tickMs=25; this.paddle=80; this.lives=3; this.score=0;
    this.bricks=Array.from({length:40},(_,i)=>({x:5+i%8*19,y:24+Math.floor(i/8)*9}));
    this.serve();
  }
  serve() { this.ready=true; this.x=this.paddle; this.y=125; this.vx=1.25; this.vy=-1.85; }
  input(a) {
    if(a==='a') this.ready=false;
    if(a==='left'||a==='right') this.move(a==='right'?2:-2);
  }
  move(dx) { this.paddle=clamp(this.paddle+dx,15,145); if(this.ready) this.x=this.paddle; }
  step(held) {
    this.move((Number(held.has('right'))-Number(held.has('left')))*3.1);
    if(this.ready) return;
    const lastY=this.y;
    this.x+=this.vx; this.y+=this.vy;
    if(this.x<=4||this.x>=156) {this.x=clamp(this.x,4,156);this.vx*=-1; this.sound('wall');}
    if(this.y<20) {this.y=20;this.vy=Math.abs(this.vy); this.sound('wall');}
    if(this.vy>0 && lastY<130 && this.y>=129 && Math.abs(this.x-this.paddle)<15) {
      const angle=clamp((this.x-this.paddle)/14,-1,1);
      this.vx=2.3*angle; this.vy=-Math.sqrt(6.76-this.vx*this.vx); this.y=128;
      this.sound('paddle');
    }
    const hit=this.bricks.findIndex(b=>this.x+2>=b.x && this.x-2<b.x+17 && this.y+2>=b.y && this.y-2<b.y+7);
    if(hit>=0) {
      const brick=this.bricks.splice(hit,1)[0];
      if(lastY+2<=brick.y || lastY-2>=brick.y+7) this.vy*=-1;
      else this.vx*=-1;
      this.score+=10;
      this.sound('brick');
      if(!this.bricks.length) this.over=this.won=true;
    }
    if(this.y>144 && --this.lives>0) { this.sound('damage'); this.serve(); }
    else if(this.lives===0) this.over=true;
  }
  draw(ctx,text,ink,mid,light) {
    hud(ctx,text,'BREAKOUT',this.score,ink);
    this.bricks.forEach(({x,y})=>{
      ctx.fillStyle=ink; ctx.fillRect(x,y,17,7);
      ctx.fillStyle=mid; ctx.fillRect(x+1,y+1,15,4);
      ctx.fillStyle=light;ctx.fillRect(x+2,y+1,8,1);
    });
    ctx.fillStyle=ink;
    ctx.fillRect(Math.round(this.paddle)-13,131,26,4);
    ctx.fillRect(Math.round(this.x)-1,Math.round(this.y)-1,3,3);
    for(let i=0;i<this.lives;i++) ctx.fillRect(10+i*7,136,5,2);
    if(this.ready) text('A: SERVE',48,92);
  }
}

// The flight deck is drawn in native LCD pixels. Sprites are centred on
// their collision bodies, so banking and exhaust never widen the hit box.
const fighter = [
  '......#......','......#......','.....###.....','.....###.....',
  '..#..###..#..','..#.#####.#..','.###########.',
  '####.###.####','##...###...##','....##.##....'
];
const dart = ['##.....##','.##...##.','.#######.','..#####..','...###...','....#....'];
const gunship = ['##...###...##','###..###..###','.###########.',
  '..####.####..','..##.###.##..','..#..###..#..','......#......'];
const formations = [
  [[36,0],[58,-11],[80,-22],[102,-11],[124,0]],
  [[26,0],[35,-15],[44,-30],[117,-6],[126,-21]],
  [[34,0],[80,-8,'heavy'],[126,0],[56,-22],[105,-22]]
];

export class SpaceRaid {
  constructor(sound = () => {}) {
    this.sound = sound;
    this.tickMs=24;
    this.x=80; this.y=120; this.age=0; this.lives=3; this.score=0;
    this.cooldown=0; this.invincible=0; this.bank=0; this.wave=0;
    this.shots=[]; this.bolts=[]; this.sparks=[]; this.enemies=[];
    this.launchWave();
  }
  launchWave() {
    const formation=formations[this.wave % formations.length];
    this.wave++;
    this.enemies=formation.map(([lane,stagger,type],i)=>({
      lane, x:lane, y:18+stagger, type, hp:type==='heavy'?3:1,
      phase:i*.65, age:0, flash:0, fired:false
    }));
  }
  fire() {
    if(this.cooldown>0) return;
    for(const dx of [-3,3]) this.shots.push({x:this.x+dx,y:this.y-4});
    this.cooldown=7;
    this.sound('fire');
  }
  move(dx,dy) {
    this.x=clamp(this.x+dx,11,149);
    this.y=clamp(this.y+dy,45,128);
  }
  input(a) {
    if(a==='a') this.fire();
    if(directions[a]) this.move(...directions[a]);
  }
  burst(x,y,n) {
    for(let i=0;i<n;i++) {
      const angle=2*Math.PI*i/n, speed=.7+Math.random()*1.4;
      this.sparks.push({x,y,dx:Math.cos(angle)*speed,dy:Math.sin(angle)*speed,life:6+Math.random()*7});
    }
  }
  hitPlayer() {
    if(this.invincible) return;
    this.lives--; this.invincible=40;
    this.burst(this.x,this.y,12);
    this.over=this.lives<=0;
    if(!this.over) this.sound('damage');
  }
  step(held) {
    this.age++; this.cooldown--; this.invincible=Math.max(0,this.invincible-1);
    const dx=Number(held.has('right'))-Number(held.has('left'));
    const dy=Number(held.has('down'))-Number(held.has('up'));
    this.bank+=(dx-this.bank)*.3;
    const speed=dx&&dy?1.6:2.3;
    this.move(speed*dx,speed*dy);
    if(held.has('a')) this.fire();
    for(const e of this.enemies) {
      e.age++; e.flash=Math.max(0,e.flash-1);
      const heavy=e.type==='heavy';
      const amplitude=this.wave%3===2?22:12;
      e.x=e.lane+Math.sin(e.phase+e.age*.035)*amplitude;
      e.y+=(heavy?.52:.8)+Math.min(.5,this.wave*.045);
      if(!e.fired && e.y>36+e.phase*9 && e.y<this.y-8) {
        e.fired=true;
        const aim=Math.atan2(this.y-e.y,this.x-e.x);
        for(const spread of heavy?[-.2,.2]:[0]) this.bolts.push({
          x:e.x,y:e.y+4,dx:Math.cos(aim+spread)*1.45,dy:Math.sin(aim+spread)*1.45
        });
      }
      if(Math.abs(e.x-this.x)<8 && Math.abs(e.y-this.y)<7) this.hitPlayer();
    }
    this.shots=this.shots.filter(s=>{
      s.y-=4;
      const e=this.enemies.find(e=>e.hp>0 && e.y>18 && Math.abs(s.x-e.x)<(e.type==='heavy'?7:5) && Math.abs(s.y-e.y)<6);
      if(!e) return s.y>=17;
      e.hp--; e.flash=3;
      this.sound(e.hp ? 'hit' : 'explosion');
      this.burst(e.x,e.y,e.hp?3:9);
      if(!e.hp) this.score+=e.type==='heavy'?50:10;
      return false;
    });
    this.bolts=this.bolts.filter(b=>{
      b.x+=b.dx; b.y+=b.dy;
      if(Math.abs(b.x-this.x)<4 && Math.abs(b.y-this.y)<4) {this.hitPlayer();return false;}
      return b.y<145 && b.x>=0 && b.x<160;
    });
    this.sparks=this.sparks.filter(p=>{
      p.x+=p.dx; p.y+=p.dy; p.life--;return p.life>0;
    });
    this.enemies=this.enemies.filter(e=>e.hp>0 && e.y<149);
    if(!this.over && !this.enemies.length) this.launchWave();
  }
  draw(ctx,text,ink,mid,light) {
    ctx.fillStyle=ink;
    ctx.fillRect(0,0,160,144);
    ctx.save();
    ctx.beginPath();ctx.rect(0,18,160,126);ctx.clip();
    // Two scroll speeds separate distant stars from the near orbital gantries.
    ctx.fillStyle=mid;
    for(let i=0;i<28;i++) {
      const near=i%4===0, y=18+(i*41+Math.floor(this.age*(near?1.5:.45)))%126;
      ctx.fillRect((i*47+11)%157,y,1,near?3:1);
    }
    const scroll=Math.floor(this.age*1.65);
    for(let side=0;side<2;side++) {
      const offset=scroll+side*33;
      for(let k=-1;k<=2;k++) {
        const y=18+k*64+offset%64;
        const w=9+Math.abs((k-Math.floor(offset/64)+side*3)%4)*3;
        const x=side?160-w:0;
        ctx.fillStyle=mid;ctx.fillRect(x,y,w,30);
        ctx.fillRect(side?153:0,y+30,7,8);
        ctx.fillStyle=ink;ctx.fillRect(x+2,y+3,w-4,16);
        for(let j=0;j<3;j++) ctx.fillRect(x+3,y+22+j*2,w-6,1);
      }
    }
    for(const e of this.enemies) {
      ctx.fillStyle=e.flash?light:mid;
      const heavy=e.type==='heavy';
      stamp(ctx,heavy?gunship:dart,e.x-(heavy?6:4),e.y-3);
      ctx.fillStyle=light;ctx.fillRect(Math.round(e.x)-1,Math.round(e.y),3,2);
    }
    ctx.fillStyle=light;
    for(const s of this.shots) ctx.fillRect(Math.round(s.x),Math.round(s.y)-3,1,5);
    for(const b of this.bolts) {
      const x=Math.round(b.x),y=Math.round(b.y);
      ctx.fillRect(x-1,y,3,1);ctx.fillRect(x,y-1,1,3);
    }
    if(!this.invincible || this.invincible%6<3) {
      const x=Math.round(this.x),y=Math.round(this.y),lean=Math.round(this.bank*2);
      ctx.fillStyle=mid;
      for(const d of [-2,2]) ctx.fillRect(x+d-1,y+4,2,3+this.age%4);
      ctx.fillStyle=light;
      fighter.forEach((row,i)=>stamp(ctx,[row],x-6+Math.round(lean*(1-i/9)),y-5+i));
      ctx.fillStyle=ink;ctx.fillRect(x+lean,y-2,1,3);
    }
    for(const p of this.sparks) {
      ctx.fillStyle=p.life>5?light:mid;
      ctx.fillRect(Math.round(p.x),Math.round(p.y),p.life>7?2:1,1);
    }
    ctx.restore();
    ctx.fillStyle=light;
    text('RAID',8,6);
    for(let i=0;i<3;i++) {
      ctx.fillStyle=i<this.lives?light:mid;
      ctx.fillRect(48+i*6,8,4,3);
    }
    ctx.fillStyle=light;
    const score=String(this.score).padStart(4,'0');
    text(score,152-score.length*8,6);
    ctx.fillStyle=mid;ctx.fillRect(6,16,148,1);
    // Restore the text colour expected by the shared pause/game-over overlay.
    ctx.fillStyle=ink;
  }
}
