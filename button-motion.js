// FBX stores the buttons and case in one non-indexed mesh. Group touching
// triangles so a key can move without pulling the surrounding case with it.
export function buttonMotion(mesh, render) {
  const position=mesh.geometry.attributes.position;
  const rest=position.array.slice();
  const links=new Map();
  function root(i) {
    while(links.has(i)) i=links.get(i);
    return i;
  }
  const vertices=Array.from({length:position.count},(_,i)=>
    [position.getX(i),position.getY(i),position.getZ(i)].map(n=>n.toFixed(3)).join(','));
  for(let i=0;i<vertices.length;i+=3) {
    const a=root(vertices[i]);
    for(let j=1;j<3;j++) {const b=root(vertices[i+j]);if(b!==a) links.set(b,a);}
  }
  const parts=new Map();
  vertices.forEach((v,i)=>{
    const key=root(v);
    if(!parts.has(key)) parts.set(key,[]);
    parts.get(key).push(i);
  });
  const keys=[];
  for(const indices of parts.values()) {
    const ys=indices.map(i=>rest[i*3+1]),zs=indices.map(i=>rest[i*3+2]);
    if(Math.max(...ys)-Math.min(...ys)>35) continue;
    const y=(Math.min(...ys)+Math.max(...ys))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
    const action = y>65 ? (z>0?'pad':z< -40?'a':'back') : z<10?'start':'select';
    keys.push({indices,action,y,z});
  }
  const levels=new Map(), pulseUntil=new Map();
  let active=new Set(), frame=0;
  function animate(now) {
    frame=0;
    let moving=false;
    for(const action of ['up','down','left','right','a','start','back']) {
      const pulse=(pulseUntil.get(action)||0)>now;
      const target=active.has(action)||pulse?1:0;
      let level=(levels.get(action)||0);
      level+=(target-level)*0.52;
      if(Math.abs(target-level)<0.015) level=target;
      levels.set(action,level);
      moving ||= level!==target || pulse;
    }
    for(const key of keys) for(const i of key.indices) {
      let depth=levels.get(key.action)||0;
      if(key.action==='pad') {
        const dy=(rest[i*3+1]-key.y)/16,dz=(rest[i*3+2]-key.z)/16;
        depth=dy*(levels.get('up')-levels.get('down'))+dz*(levels.get('left')-levels.get('right'));
      }
      position.setX(i,rest[i*3]-depth*1.85);
    }
    position.needsUpdate=true;
    render();
    if(moving) frame=requestAnimationFrame(animate);
  }
  return (held,pressed)=>{
    active=held;
    if(pressed) pulseUntil.set(pressed,performance.now()+85);
    if(!frame) frame=requestAnimationFrame(animate);
  };
}
