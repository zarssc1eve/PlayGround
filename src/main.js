import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

const canvas=document.querySelector('#game'), renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x081015);scene.fog=new THREE.FogExp2(0x081015,.014);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,800);
scene.add(new THREE.HemisphereLight(0x86aabd,0x0c1012,1.7));
const sun=new THREE.DirectionalLight(0xc9e3ea,2.1);sun.position.set(-40,70,25);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=sun.shadow.camera.bottom=-90;sun.shadow.camera.right=sun.shadow.camera.top=90;scene.add(sun);

const mat=(c,rough=.8,metal=.1)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:metal});
const ground=new THREE.Mesh(new THREE.PlaneGeometry(260,260),mat(0x11191a,.95));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
// Roads
for(let i=-100;i<=100;i+=25){const r=new THREE.Mesh(new THREE.PlaneGeometry(8,260),mat(0x1a2020,.9));r.rotation.x=-Math.PI/2;r.position.set(i,.01,0);scene.add(r);const r2=new THREE.Mesh(new THREE.PlaneGeometry(260,8),mat(0x1a2020,.9));r2.rotation.x=-Math.PI/2;r2.position.set(0,.015,i);scene.add(r2)}
// City blocks
const buildings=[];const blockColors=[0x182126,0x202a2e,0x121a1d,0x273236];
for(let gx=-100;gx<100;gx+=20){for(let gz=-100;gz<100;gz+=20){if(Math.abs(gx)<18&&Math.abs(gz)<18)continue;if((gx+gz)%40===0)continue;const w=10+Math.random()*5,d=10+Math.random()*5,h=10+Math.random()*28;const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(blockColors[Math.floor(Math.random()*blockColors.length)],.65,.25));b.position.set(gx+(Math.random()*3-1.5),h/2,gz+(Math.random()*3-1.5));b.castShadow=b.receiveShadow=true;scene.add(b);buildings.push(b);
 if(h>22){for(let y=4;y<h;y+=5){const band=new THREE.Mesh(new THREE.BoxGeometry(w+.12,.18,d+.12),mat(0x4aa1a8,.4,.4));band.position.set(b.position.x,y,b.position.z);scene.add(band)}}}}
// Landmark tower
const tower=new THREE.Mesh(new THREE.CylinderGeometry(8,11,52,8),mat(0x26353a,.5,.35));tower.position.set(58,26,-55);tower.castShadow=true;scene.add(tower);const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,8,8),new THREE.MeshBasicMaterial({color:0xff4c45}));beacon.position.set(58,56,-55);scene.add(beacon);
// Safe zone
const zone=new THREE.Mesh(new THREE.CylinderGeometry(8,8,.5,32),new THREE.MeshStandardMaterial({color:0x4de3dc,transparent:true,opacity:.25,emissive:0x267e7c,emissiveIntensity:.6}));zone.position.set(0,.25,0);scene.add(zone);
// Player
const player=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.55,1.25,4,8),mat(0x29353a,.7,.15));body.position.y=1.18;body.castShadow=true;player.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.38,12,8),mat(0x9ba3a0,.8));head.position.y=2.45;head.castShadow=true;player.add(head);const gun=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.8),mat(0x9db4b5,.25,.7));gun.position.set(.55,1.45,.45);player.add(gun);player.position.set(0,0,8);scene.add(player);

const salvage=[];for(let i=0;i<15;i++){const s=new THREE.Mesh(new THREE.OctahedronGeometry(.38),new THREE.MeshStandardMaterial({color:0x75dce2,emissive:0x31868d,emissiveIntensity:.8}));let x=(Math.random()*180)-90,z=(Math.random()*180)-90;if(Math.abs(x)<12)x+=18;s.position.set(x,.55,z);s.userData.phase=Math.random()*6;scene.add(s);salvage.push(s)}
const enemies=[];for(let i=0;i<10;i++){const g=new THREE.Group();const core=new THREE.Mesh(new THREE.DodecahedronGeometry(.72),new THREE.MeshStandardMaterial({color:0x3b1014,roughness:.3,emissive:0x9a1d20,emissiveIntensity:.7}));core.castShadow=true;g.add(core);g.position.set((Math.random()*150)-75,0.75,(Math.random()*150)-75);g.userData={hp:3,pat:(Math.random()*6),speed:.018+Math.random()*.018,alive:true};scene.add(g);enemies.push(g)}

const keys={};let yaw=0,pitch=-.38,velocityY=0,grounded=true,crouched=false,started=false,health=100,stamina=100,ammo=12,reserve=48,medkits=1,salvageCount=0,mission=0,day=.65,raining=false,mouseDown=false,lastShot=0;
const state=JSON.parse(localStorage.getItem('shadow-district-save')||'null');if(state){health=state.health;stamina=state.stamina;ammo=state.ammo;reserve=state.reserve;medkits=state.medkits;salvageCount=state.salvage;mission=state.mission;player.position.set(state.x||0,0,state.z||8)}

document.querySelector('#startBtn').onclick=()=>{document.querySelector('#start').classList.add('hidden');started=true;canvas.requestPointerLock?.()};
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyI')toggleMenu();if(e.code==='KeyE')interact();if(e.code==='KeyR')reload();if(e.code==='Escape')toggleMenu(false)});addEventListener('keyup',e=>keys[e.code]=false);
canvas.addEventListener('click',()=>{if(started&&!document.querySelector('#menu').classList.contains('show'))canvas.requestPointerLock?.()});
addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas){yaw-=e.movementX*.0022;pitch=Math.max(-1.2,Math.min(.15,pitch-e.movementY*.0017))}});
addEventListener('mousedown',()=>mouseDown=true);addEventListener('mouseup',()=>mouseDown=false);

function toast(t){const e=document.querySelector('#toast');e.textContent=t;e.style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.opacity=0,1800)}
function toggleMenu(force){const m=document.querySelector('#menu');if(force===false)m.classList.remove('show');else m.classList.toggle('show');document.exitPointerLock?.()}document.querySelector('#closeMenu').onclick=()=>toggleMenu(false);
document.querySelector('#craftMed').onclick=()=>{if(salvageCount>=2){salvageCount-=2;medkits++;toast('MEDKIT CRAFTED');updateUI()}else toast('NEED 2 SALVAGE')};document.querySelector('#useMed').onclick=()=>{if(medkits&&health<100){medkits--;health=Math.min(100,health+45);toast('VITALS RESTORE');updateUI()}else toast(medkits?'HEALTH ALREADY FULL':'NO MEDKITS')};document.querySelector('#reloadBtn').onclick=reload;
document.querySelector('#saveBtn').onclick=()=>{localStorage.setItem('shadow-district-save',JSON.stringify({health,stamina,ammo,reserve,medkits,salvage:salvageCount,mission,x:player.position.x,z:player.position.z}));document.querySelector('#saveState').textContent='Checkpoint saved';toast('PROGRESS SAVED')};
function reload(){if(ammo<12&&reserve>0){const n=Math.min(12-ammo,reserve);ammo+=n;reserve-=n;toast('WEAPON RELOADED');updateUI()}}
function interact(){if(mission===0&&salvageCount>=3){mission=1;toast('CONTRACT UPDATED: REACH THE SAFE ZONE');updateUI()}}
function updateUI(){document.querySelector('#hp').style.width=health+'%';document.querySelector('#stamina').style.width=stamina+'%';document.querySelector('#ammo').textContent=ammo;document.querySelector('#reserve').textContent=reserve;document.querySelector('#salvageCount').textContent=salvageCount+' units';document.querySelector('#medCount').textContent=medkits+' medkit'+(medkits===1?'':'s');document.querySelector('#missionName').textContent=mission===0?'Signal in the Dark':'Return to the Relay';document.querySelector('#objective').textContent=mission===0?`Collect 3 salvage units (${salvageCount}/3)`:mission===1?'Enter the illuminated safe zone':'Sector clear — explore freely';}
updateUI();

function shoot(){if(ammo<=0||performance.now()-lastShot<220)return;ammo--;lastShot=performance.now();updateUI();const dir=new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion);for(const e of enemies){if(!e.userData.alive||e.position.distanceTo(player.position)>30)continue;const to=e.position.clone().sub(player.position).normalize();if(dir.dot(to)>.75&&e.position.distanceTo(player.position)<25){e.userData.hp--;if(e.userData.hp<=0){e.userData.alive=false;e.visible=false;reserve+=8;toast('HOSTILE NEUTRALIZED · AMMO +8')}break}}}

const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;if(started&&!document.querySelector('#menu').classList.contains('show')){let mx=0,mz=0;if(keys.KeyW)mz=-1;if(keys.KeyS)mz=1;if(keys.KeyA)mx=-1;if(keys.KeyD)mx=1;const moving=mx||mz;const run=keys.ShiftLeft&&stamina>5&&!crouched;crouched=keys.KeyC;if(moving){const len=Math.hypot(mx,mz);mx/=len;mz/=len;const sin=Math.sin(yaw),cos=Math.cos(yaw);const dx=(mx*cos-mz*sin)*(run?11:7)*(crouched?.45:1)*dt,dz=(mz*cos+mx*sin)*(run?11:7)*(crouched?.45:1)*dt;const nx=THREE.MathUtils.clamp(player.position.x+dx,-118,118),nz=THREE.MathUtils.clamp(player.position.z+dz,-118,118);player.position.x=nx;player.position.z=nz;player.rotation.y=yaw;if(run)stamina=Math.max(0,stamina-dt*16)}else player.rotation.y+=THREE.MathUtils.euclideanModulo(yaw-player.rotation.y+Math.PI,Math.PI*2)-Math.PI;if(!run)stamina=Math.min(100,stamina+dt*9);if(keys.Space&&grounded){velocityY=7.2;grounded=false}velocityY-=18*dt;player.position.y+=velocityY*dt;if(player.position.y<=0){player.position.y=0;velocityY=0;grounded=true}if(mouseDown)shoot();}
 // camera
const target=player.position.clone().add(new THREE.Vector3(0,crouched?1.1:1.8,0));const dist=crouched?5.2:7.2;const camOff=new THREE.Vector3(Math.sin(yaw)*dist,2.5-Math.sin(pitch)*dist,-Math.cos(yaw)*dist);camera.position.lerp(target.clone().add(camOff),.14);camera.lookAt(target.clone().add(new THREE.Vector3(0,1.1-Math.sin(pitch)*2,0)));
 // salvage pickups
for(const s of salvage){if(!s.visible)continue;s.rotation.y+=dt;s.position.y=.55+Math.sin(t*2+s.userData.phase)*.12;if(s.position.distanceTo(player.position)<1.8){s.visible=false;salvageCount++;toast('SALVAGE ACQUIRED');updateUI()}}
 // enemies patrol/chase
for(const e of enemies){if(!e.userData.alive)continue;const d=e.position.distanceTo(player.position);if(d<18){const dir=player.position.clone().sub(e.position).setY(0).normalize();e.position.addScaledVector(dir,e.userData.speed*(d<5?1.5:1));e.lookAt(player.position.x,e.position.y,player.position.z);if(d<1.5){health=Math.max(0,health-dt*12);updateUI();if(health<=0){health=100;player.position.set(0,0,8);toast('YOU BLACKED OUT · RETURNED TO SAFE ZONE')}}}else{e.userData.pat+=dt*.35;e.position.x+=Math.sin(e.userData.pat)*dt*.45;e.position.z+=Math.cos(e.userData.pat*.7)*dt*.45}}
 // mission completion
if(mission===1&&player.position.distanceTo(zone.position)<7){mission=2;health=Math.min(100,health+20);toast('RELAY SECURED · DISTRICT OPEN');updateUI()}
 // day/weather
const cycle=(Math.sin(t*.018-.5)+1)/2;raining=Math.sin(t*.04)>.93;sun.intensity=.5+cycle*2;scene.background.setHSL(.58,.3,.025+cycle*.09);scene.fog.color.copy(scene.background);sun.position.set(Math.cos(t*.018)*70,25+cycle*55,Math.sin(t*.018)*70);beacon.visible=Math.sin(t*3)>0;
 // minimap
const mc=document.querySelector('#map'),cx=mc.getContext('2d'),scale=mc.width/240;cx.fillStyle='#091115';cx.fillRect(0,0,178,178);cx.strokeStyle='rgba(110,180,185,.12)';for(let i=0;i<240;i+=25){const p=i*scale-120*scale+89;cx.beginPath();cx.moveTo(p,0);cx.lineTo(p,178);cx.stroke();cx.beginPath();cx.moveTo(0,p);cx.lineTo(178,p);cx.stroke()}cx.strokeStyle='#67d0d6';cx.beginPath();cx.arc(89,89,8*scale,0,7);cx.stroke();cx.fillStyle='#70f0da';for(const s of salvage)if(s.visible){cx.fillRect(89+(s.position.x-player.position.x)*scale,89+(s.position.z-player.position.z)*scale,3,3)}cx.fillStyle='#ff6970';for(const e of enemies)if(e.userData.alive)cx.fillRect(89+(e.position.x-player.position.x)*scale,89+(e.position.z-player.position.z)*scale,3,3);cx.save();cx.translate(89,89);cx.rotate(-yaw);cx.fillStyle='#fff';cx.beginPath();cx.moveTo(0,-6);cx.lineTo(4,5);cx.lineTo(-4,5);cx.closePath();cx.fill();cx.restore();
renderer.render(scene,camera)}animate();

// Touch controls
const joy=document.querySelector('#joy'),stick=document.querySelector('#stick');let joyX=0,joyY=0;joy.addEventListener('pointermove',e=>{const r=joy.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),len=Math.hypot(x,y),m=Math.min(36,len);joyX=x/(len||1)*m;joyY=y/(len||1)*m;stick.style.transform=`translate(${joyX}px,${joyY}px)`});joy.addEventListener('pointerup',()=>{joyX=joyY=0;stick.style.transform=''});document.querySelector('#mobileAction').onclick=interact;
setInterval(()=>{if(Math.abs(joyX)+Math.abs(joyY)){if(joyY<0)keys.KeyW=true;else if(joyY>0)keys.KeyS=true;if(joyX<0)keys.KeyA=true;else if(joyX>0)keys.KeyD=true}else{keys.KeyW=keys.KeyS=keys.KeyA=keys.KeyD=false}},50);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
