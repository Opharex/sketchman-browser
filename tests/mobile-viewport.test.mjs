import test from 'node:test';
import assert from 'node:assert/strict';
import {fitViewport,bindTouchControls,renderCanvasDimensions} from '../dist/mobile.js';
test('iPhone visual viewport wins over layout viewport',()=>{
 const props=new Map(),root={style:{setProperty:(key,val)=>props.set(key,val)}};
 fitViewport(root,{visualViewport:{width:932.4,height:429.8},innerWidth:960,innerHeight:480});
 assert.equal(props.get('--viewport-width'),'932px');
 assert.equal(props.get('--viewport-height'),'430px');
});
test('resize works without visualViewport',()=>{
 const props=new Map(),root={style:{setProperty:(key,val)=>props.set(key,val)}};
 fitViewport(root,{innerWidth:390,innerHeight:844});
 assert.equal(props.get('--viewport-width'),'390px');
 assert.equal(props.get('--viewport-height'),'844px');
});
test('jump and fire fingers release separately, even on touchcancel',()=>{
 const surfaceEvents=new Map(),viewEvents=new Map(),actions=[];
 const surface={getBoundingClientRect:()=>({left:10,width:900}),
  addEventListener:(type,fn)=>surfaceEvents.set(type,fn),
  removeEventListener:(type)=>surfaceEvents.delete(type)};
 const view={addEventListener:(type,fn)=>viewEvents.set(type,fn),
  removeEventListener:(type)=>viewEvents.delete(type)};
 const dispose=bindTouchControls(surface,{active:()=>true,
  press:(id,left)=>actions.push(['press',id,left]),
  release:id=>actions.push(['release',id])},view);
 let prevented=false;
 surfaceEvents.get('touchstart')({preventDefault(){prevented=true;},
  changedTouches:[{identifier:2,clientX:100},{identifier:3,clientX:800}]});
 viewEvents.get('touchend')({changedTouches:[{identifier:2}]});
 viewEvents.get('touchcancel')({changedTouches:[{identifier:3}]});
 assert.equal(prevented,true);
 assert.deepEqual(actions,[['press','touch:2',true],['press','touch:3',false],
  ['release','touch:2'],['release','touch:3']]);
 dispose();assert.equal(surfaceEvents.size,0);assert.equal(viewEvents.size,0);
});

test('wide iPhone uses the whole screen at the right proportions with a GPU budget',()=>{
 const v=renderCanvasDimensions(932,430,{widescreen:true,mobile:true});
 assert.ok(v.logicalWidth>960);
 assert.ok(Math.abs(v.logicalWidth/640-932/430)<.01);
 assert.equal(v.padding,(v.logicalWidth-960)/2);
 assert.ok(v.pixelWidth*v.pixelHeight<=960*640*1.12);
 assert.ok(v.scale<1);
});
test('portrait and normal desktop retain native 960x640 world',()=>{
 const p=renderCanvasDimensions(390,844,{widescreen:true,mobile:true});
 assert.equal(p.logicalWidth,960);assert.equal(p.pixelWidth,960);assert.equal(p.pixelHeight,640);
 const d=renderCanvasDimensions(1200,800);
 assert.equal(d.logicalWidth,960);assert.equal(d.pixelHeight,640);
});
