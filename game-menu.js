import * as THREE from 'three';

// A five-by-seven bitmap alphabet keeps every stroke on the LCD grid.
const font = {
 A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[15,16,16,16,16,16,15],
 D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],G:[14,17,16,23,17,17,14],
 I:[31,4,4,4,4,4,31],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],
 M:[17,27,21,21,17,17,17],N:[17,25,25,21,19,19,17],O:[14,17,17,17,17,17,14],
 P:[30,17,17,30,16,16,16],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],
 T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],Y:[17,17,10,4,4,4,4],
 ' ':[0,0,0,0,0,0,0]
};
const games = [
 {name:'SNAKE',sprite:[0,126,66,66,114,2,30,0]},
 {name:'BREAKOUT',sprite:[238,238,0,119,0,16,0,124]},
 {name:'SPACE RAID',sprite:[24,24,60,60,126,255,90,24]}
];
const light = '#b9cb85', ink = '#2e452e', mid = '#758c57';

export function wireConsole(model, renderer, camera, render, announce) {
  const shell = model.children.find(node => node.isMesh);
  const screen = document.createElement('canvas');
  screen.width = 160;
  screen.height = 144;
  const ctx = screen.getContext('2d');
  const texture = new THREE.CanvasTexture(screen);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  // The FBX faces +X. This surface sits just above its glass, inside the bezel.
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(83.76,67.31),
    new THREE.MeshBasicMaterial({map:texture, toneMapped:false}));
  lcd.rotation.y = Math.PI / 2;
  lcd.position.set(24.84,180.545,0.01);
  const led = new THREE.Mesh(new THREE.SphereGeometry(1.24,16,12),
    new THREE.MeshBasicMaterial({color:0xff3925,toneMapped:false}));
  led.scale.x = 0.42;
  led.position.set(25.3,189.74,53.22);
  model.add(lcd,led);
  lcd.visible = led.visible = false;

  let powered = false, selected = 0, frame = 0;
  function text(label,x,y,scale=1) {
    for (const char of label) {
      font[char].forEach((bits,row) => {
        for (let col=0;col<5;col++) if (bits & (16>>col))
          ctx.fillRect(x+col*scale,y+row*scale,scale,scale);
      });
      x += 6*scale;
    }
  }
  function paint(progress=1) {
    ctx.fillStyle = light;
    ctx.fillRect(0,0,160,144);
    ctx.fillStyle = ink;
    text('GAME SELECT',15,15,2);
    ctx.fillRect(10,35,140,2);
    games.forEach(({name,sprite},index) => {
      const y = 44+index*28;
      const active = index===selected;
      ctx.fillStyle = active ? ink : mid;
      if (active) ctx.fillRect(9,y,142,24);
      ctx.fillStyle = active ? light : ink;
      sprite.forEach((bits,row) => {
        for (let col=0;col<8;col++) if(bits & (128>>col)) ctx.fillRect(16+col*2,y+4+row*2,2,2);
      });
      text(name,42,y+9);
      if(active) [1,2,3,2,1].forEach((w,row)=>ctx.fillRect(140,y+10+row,w,1));
    });
    ctx.fillStyle = mid;
    ctx.fillRect(10,132,140,1);
    if(progress<1) {
      ctx.fillStyle = 'rgba(47,58,33,'+(1-progress)+')';
      ctx.fillRect(0,0,160,144);
    }
    texture.needsUpdate = true;
    render();
  }
  function toggle() {
    cancelAnimationFrame(frame);
    powered = !powered;
    selected = 0;
    lcd.visible = led.visible = powered;
    announce.textContent = powered ? 'Power on. Snake selected.' : 'Power off.';
    if (!powered) { render(); return; }
    const start = performance.now();
    function brighten(now) {
      const progress = Math.min(1,(now-start)/220);
      paint(progress);
      if(progress<1) frame = requestAnimationFrame(brighten);
    }
    brighten(start);
  }
  function move(step) {
    if (!powered) return;
    selected = (selected+step+games.length)%games.length;
    paint();
    announce.textContent = games[selected].name+' selected.';
  }
  const canvas = renderer.domElement;
  const ray = new THREE.Raycaster();
  function controlAt(event) {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera({x:2*(event.clientX-r.left)/r.width-1,y:1-2*(event.clientY-r.top)/r.height},camera);
    const hit = ray.intersectObject(shell,false)[0];
    if (!hit) return null;
    const {x,y,z} = model.worldToLocal(hit.point);
    if ((x>6 || y>240) && y>231 && z>26 && z<63) return 'power';
    if (powered && x>24 && Math.abs(z-45.5)<16 && Math.abs(y-82.5)<16) {
      const dy = y-82.5, dz = z-45.5;
      if(Math.max(Math.abs(dy),Math.abs(dz))<3) return null;
      return (Math.abs(dy)>Math.abs(dz)?dy:dz)>0 ? 'prev' : 'next';
    }
    return null;
  }
  let pressing = null;
  canvas.addEventListener('pointerdown',event=>{
    if (!event.isPrimary || event.button!==0) return;
    const action = controlAt(event);
    if(!action) return;
    event.stopImmediatePropagation();
    pressing = {id:event.pointerId,action};
    canvas.setPointerCapture(event.pointerId);
  },true);
  canvas.addEventListener('pointerup',event=>{
    if(pressing?.id!==event.pointerId) return;
    const {action} = pressing;
    pressing = null;
    if(controlAt(event)!==action) return;
    action==='power' ? toggle() : move(action==='next'?1:-1);
  },true);
  canvas.addEventListener('pointercancel',()=>{pressing=null;});
  canvas.addEventListener('pointermove',event=>{
    canvas.style.cursor = controlAt(event)?'pointer':event.buttons?'grabbing':'grab';
  });
  window.addEventListener('keydown',event=>{
    if(event.altKey || event.ctrlKey || event.metaKey) return;
    if(event.code==='KeyP' && !event.repeat) toggle();
    if(powered && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) {
      event.preventDefault();
      move(['ArrowUp','ArrowLeft'].includes(event.key)?-1:1);
    }
  });
}
