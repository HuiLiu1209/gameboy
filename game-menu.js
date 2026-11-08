import * as THREE from 'three';

import { FallingBlocks } from './falling-blocks.js';

import { Snake, Breakout, SpaceRaid } from './arcade-games.js';
import { buttonMotion } from './button-motion.js';

import { playGameSound } from './game-sounds.js';

const games = [
  {name:'TETRIS',create:sound=>new FallingBlocks(sound),sprite:[0,56,40,238,170,238,0,0]},
  {name:'SNAKE',create:sound=>new Snake(sound),sprite:[0,124,68,68,119,1,15,0]},
  {name:'BREAKOUT',create:sound=>new Breakout(sound),sprite:[238,238,0,119,0,16,0,124]},
  {name:'SPACE RAID',create:sound=>new SpaceRaid(sound),sprite:[16,0,24,24,60,126,219,24]}
];
const light = '#788952', ink = '#243120', mid = '#536741';

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
  const glass = new THREE.PlaneGeometry(83.76,67.31);
  // UV0 covers the menu; UV1 addresses the glass patch in the original FBX atlas.
  const glassUV = glass.attributes.uv.clone();
  for (let i = 0; i < glassUV.count; i++) {
    glassUV.setXY(i, 0.843557 + glassUV.getX(i)*0.149840,
      0.872399 + glassUV.getY(i)*0.120415);
  }
  glass.setAttribute('uv1', glassUV);
  const wear = shell.material.roughnessMap.clone();
  wear.channel = 1;
  const glassColor = shell.material.map.clone();
  glassColor.channel = 1;
  const lcd = new THREE.Mesh(glass, new THREE.MeshStandardMaterial({
    map: glassColor, color: 0x575c48, roughnessMap: wear, roughness: 1,
    emissiveMap: texture, emissive: 0xffffff, emissiveIntensity: 0.66,
    envMapIntensity: 0.34
  }));
  lcd.material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      float scuff = smoothstep(0.146, 0.285, texture2D(map, vMapUv).r);
      diffuseColor.rgb += vec3(0.115, 0.115, 0.095) * scuff;
    `);
  };
  lcd.rotation.y = Math.PI / 2;
  lcd.position.set(24.84,180.545,0.01);
  const lens = new THREE.SphereGeometry(1.24,24,16);
  const colors = [];
  const rim = new THREE.Color('#450d10'), core = new THREE.Color('#ab2c21');
  const tint = new THREE.Color();
  for (let i = 0; i < lens.attributes.normal.count; i++) {
    const facing = Math.max(0, lens.attributes.normal.getX(i));
    tint.lerpColors(rim, core, facing ** 3);
    colors.push(tint.r, tint.g, tint.b);
  }
  lens.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const led = new THREE.Mesh(lens, new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.38, clearcoat: 0.75,
    clearcoatRoughness: 0.22, emissive: 0x500b05, emissiveIntensity: 0.35
  }));
  led.scale.x = 0.42;
  led.position.set(25.3,189.74,53.22);
  model.add(lcd,led);
  lcd.visible = led.visible = false;

  const motion = buttonMotion(shell,render);
  const sources = new Map();
  const held = () => new Set(sources.values());
  const hint = document.querySelector('#power-hint');
  hint.hidden=false;
  let audio;
  const voices = new Set();
  function stopSounds() {
    for(const osc of voices) osc.stop();
    voices.clear();
  }
  function tone(freq,duration,delay=0,endFreq=freq,wave='square',volume=.035) {
    if(audio?.state!=='running') return;
    const start=audio.currentTime+delay;
    const osc=audio.createOscillator(), gain=audio.createGain();
    osc.type=wave;
    osc.frequency.setValueAtTime(freq,start);
    if(endFreq!==freq) osc.frequency.exponentialRampToValueAtTime(endFreq,start+duration);
    gain.gain.setValueAtTime(0.0001,start);
    gain.gain.exponentialRampToValueAtTime(volume,start+0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);
    osc.connect(gain).connect(audio.destination);
    voices.add(osc);
    osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};
    osc.start(start);osc.stop(start+duration);
  }
  let powered = false, selected = 0, booting=false, bootY=0, cursor=true;
  let session = null, paused = false, tick = 0;
  function text(label,x,y) {
    ctx.font = '8px "Press Start 2P"';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label,x,y+7);
  }
  function frameBox(x,y,w,h) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    ctx.strokeRect(x+0.5,y+0.5,w-1,h-1);
  }
  function paint(progress=1) {
    ctx.fillStyle = light;
    ctx.fillRect(0,0,160,144);
    ctx.fillStyle = ink;
    if(booting) {
      text('GAME BOY',48,bootY);
    } else if(session) {
      session.draw(ctx,text,ink,mid,light);
      if(paused || session.over) {
        ctx.fillStyle = light;
        ctx.fillRect(20,51,120,42);
        frameBox(20,51,120,42);
        ctx.fillStyle = ink;
        text(session.won?'YOU WIN':session.over?'GAME OVER':'PAUSED',32,59);
        text(session.over?'A: RETRY':'START: PLAY',32,77);
      }
    } else {
      frameBox(7,13,146,119);
      ctx.fillStyle = light;
      ctx.fillRect(17,8,96,10);
      ctx.fillStyle = ink;
      text('GAME SELECT',21,9);
      games.forEach(({name,sprite},index) => {
        const y = 28+index*26;
        if(index===selected && cursor) [1,2,3,4,3,2,1].forEach((w,row)=>ctx.fillRect(15,y+4+row,w,1));
        sprite.forEach((bits,row) => {
          for (let col=0;col<8;col++) if(bits & (128>>col)) ctx.fillRect(28+col*2,y+row*2,2,2);
        });
        text(name,52,y+4);
      });
    }
    if(progress<1) {
      ctx.fillStyle = 'rgba(47,58,33,'+(1-progress)+')';
      ctx.fillRect(0,0,160,144);
    }
    texture.needsUpdate = true;
    render();
  }
  function menu() {
    clearTimeout(tick);
    session=null; paused=false; booting=false; cursor=true;
    announce.textContent=games[selected].name+' selected.';
    function blink() { cursor=!cursor; paint(); tick=setTimeout(blink,cursor?620:260); }
    paint();
    tick=setTimeout(blink,620);
  }
  function toggle() {
    clearTimeout(tick);
    powered=!powered; selected=0; session=null; paused=false;
    sources.clear(); motion(held());
    lcd.visible=led.visible=booting=powered;
    hint.hidden=powered;
    if(!powered) { stopSounds(); announce.textContent='Power off.'; render(); return; }
    try {
      audio ??= new AudioContext();
      audio.resume().catch(()=>{});
    } catch { /* Audio is optional when Web Audio is unavailable. */ }
    announce.textContent='Power on. Booting.';
    const start=performance.now();
    let chimed=false;
    function boot() {
      const elapsed=performance.now()-start;
      bootY=Math.round(-10+77*Math.min(1,elapsed/950));
      if(elapsed>=950 && !chimed) {chimed=true; tone(1046,.085); tone(2093,.2,.09);}
      if(elapsed>=1570) {menu();return;}
      paint(Math.min(1,elapsed/180));tick=setTimeout(boot,35);
    }
    boot();
  }
  hint.addEventListener('click',()=>{if(!powered) toggle();hint.blur();});
  function sound(event, amount) { playGameSound(tone,event,amount); }
  function stepGame() {
    if(session.over) return;
    session.step(held());
    if(session.over) {
      clearTimeout(tick);
      sound(session.won ? 'win' : 'gameOver');
      announce.textContent=session.won?'You win. A to replay.':'Game over. A to retry.';
    }
  }
  function run() {
    clearTimeout(tick);
    if(!session || session.over || paused) return;
    tick=setTimeout(()=>{
      stepGame();
      paint();run();
    },session.tickMs ?? Math.max(120,720-Math.floor(session.lines/10)*70));
  }
  function act(action) {
    if(action==='power') { toggle();return; }
    if(!powered || booting) return;
    if(session && action==='back') {
      stopSounds();
      tone(523,.055);
      tone(330,.085,.055);
      menu();
      return;
    }
    if((!session || session.over) && ['a','start'].includes(action)) {
      stopSounds();
      session=games[selected].create(sound);paused=false;
      announce.textContent='Playing '+games[selected].name+'.';
      tone(660,.06); run();
    } else if(!session) {
      const step=['up','left'].includes(action)?-1:['down','right'].includes(action)?1:0;
      if(step) {selected=(selected+step+games.length)%games.length; tone(440,.035);menu();}
      return;
    } else if(action==='start' && !session.over) {
      paused=!paused;announce.textContent=paused?'Paused.':'Playing '+games[selected].name+'.';run();
    } else if(!paused && !session.over) {
      if(session.input) session.input(action);
      else {
        if(action==='left') session.shift(-1);
        if(action==='right') session.shift(1);
        if(action==='up' || action==='a') session.rotate();
        if(action==='down') stepGame();
      }
    }
    paint();
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
    if (powered && x>24) {
      if(Math.hypot(y-89,z+54)<10) return 'a';
      if(Math.hypot(y-78,z+30)<10) return 'back';
      if(y>36 && y<51 && z>-13 && z<8) return 'start';
    }
    if (powered && x>24 && Math.abs(z-45.5)<16 && Math.abs(y-82.5)<16) {
      const dy = y-82.5, dz = z-45.5;
      if(Math.max(Math.abs(dy),Math.abs(dz))<3) return null;
      if(Math.abs(dy)>Math.abs(dz)) return dy>0?'up':'down';
      return dz>0?'left':'right';
    }
    return null;
  }
  let repeatTimer=0;
  function syncInputs(action) {
    motion(held(),action);
    clearTimeout(repeatTimer);
    if(session instanceof FallingBlocks && !paused && !session.over) {
      const repeatAction=[...sources.values()].reverse().find(a=>['left','right','down'].includes(a));
      if(repeatAction) {
        function repeat() {
          if(!(session instanceof FallingBlocks) || paused || session.over) return;
          act(repeatAction); repeatTimer=setTimeout(repeat,65);
        }
        repeatTimer=setTimeout(repeat,180);
      }
    }
  }
  function press(source,action) {
    if(sources.has(source) || (!powered && action!=='power')) return;
    sources.set(source,action);act(action);syncInputs(action);
  }
  function release(source) {
    if(sources.delete(source)) syncInputs();
  }
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0) return;
    const action=controlAt(event);
    if(!action) return;
    event.stopImmediatePropagation();
    canvas.setPointerCapture(event.pointerId);
    press(event.pointerId,action);
  },true);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])
    canvas.addEventListener(event,e=>release(e.pointerId),true);
  canvas.addEventListener('pointermove',event=>{
    canvas.style.cursor=controlAt(event)?'pointer':event.buttons?'grabbing':'grab';
  });
  const keys={KeyP:'power',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',
    ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyZ:'a',
    Space:'a',Enter:'start',Escape:'back',KeyX:'back'};
  window.addEventListener('keydown',event=>{
    if(event.altKey || event.ctrlKey || event.metaKey || event.target===hint) return;
    const action=keys[event.code];
    if(!action || (!powered && action!=='power')) return;
    event.preventDefault();
    if(!event.repeat) press(event.code,action);
  });
  window.addEventListener('keyup',event=>release(event.code));
  window.addEventListener('blur',()=>{sources.clear();syncInputs();if(session && !paused && !session.over)act('start');});
}
