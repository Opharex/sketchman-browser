// TIOS_Swipe_Control uses 0.01 * elapsed-ms easing and a 2px snap threshold.
export class CarouselMotion{
 constructor(index=0){this.position=this.target=index;this.dragging=false;this.remainder=0;}
 go(index){this.target=Math.max(0,Math.min(9,index));this.dragging=false;}
 drag(position){this.dragging=true;this.position=Math.max(-.3,Math.min(9.3,position));}
 release(velocity=0){let index=Math.round(this.position);if(Math.abs(velocity)>37.5)index+=Math.sign(velocity)*Math.ceil(Math.abs(velocity)/75);this.go(index);return this.target;}
 advance(dt){if(this.dragging)return;this.remainder+=dt;while(this.remainder>=1/60-1e-9){this.remainder-=1/60;const dx=(this.target-this.position)*450;if(Math.abs(dx)<2)this.position=this.target;else this.position+=dx*(.01*1000/60)/450;}}
 get settled(){return !this.dragging&&this.position===this.target;}
}
