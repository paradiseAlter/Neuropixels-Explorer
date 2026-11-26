// SPDX-License-Identifier: MIT
// Numeric settings keep their native spinner, text entry and form validation.
(() => {
  let drag=null;
  const emit=(field,type)=>field.dispatchEvent(new Event(type,{bubbles:true}));
  function onGrip(field,x){
    const style=getComputedStyle(field);
    const right=field.getBoundingClientRect().right-parseFloat(style.borderRightWidth)-parseFloat(style.paddingRight)-parseFloat(style.getPropertyValue('--number-spinner'));
    return x>=right-parseFloat(style.getPropertyValue('--number-grip')) && x<right;
  }
  const fieldAt=e=>e.target.closest?.('input[type=number]:not(:disabled):not([readonly])');
  document.addEventListener('pointerover',e=>{
    const field=fieldAt(e);if(field)field.classList.toggle('over-number-grip',onGrip(field,e.clientX));
  });
  function end(cancel){
    const d=drag;drag=null;
    if(!d)return;
    const {field}=d;
    field.classList.remove('over-number-grip');
    if(field.hasPointerCapture(d.id))field.releasePointerCapture(d.id);
    if(!d.moved)return;
    if(cancel)field.value=d.original;
    if(field.isConnected && (field.value!==d.original || cancel && d.live)){
      emit(field,'input');if(!cancel || d.speed)emit(field,'change');
    }
  }
  document.addEventListener('pointerdown',e=>{
    const field=fieldAt(e);
    if(!field || drag || !e.isPrimary || e.button!==0 || !onGrip(field,e.clientX))return;
    const value=Number.isFinite(field.valueAsNumber)?field.valueAsNumber:Number(field.min)||0;
    const step=field.step==='any'?10**(Math.floor(Math.log10(Math.max(.001,Math.abs(value)||1)))-1):Number(field.step)||1;
    const speed=field.id==='video-custom-speed';
    drag={field,id:e.pointerId,x:e.clientX,original:field.value,value,step,speed,live:speed||field.id==='text-size'};
    e.preventDefault();field.focus({preventScroll:true});field.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove',e=>{
    if(!drag){
      const field=fieldAt(e);if(field)field.classList.toggle('over-number-grip',onGrip(field,e.clientX));
      return;
    }
    if(e.pointerId!==drag.id)return;
    const d=drag,f=d.field,dx=e.clientX-d.x;
    if(!d.moved && Math.abs(dx)<3)return;
    if(!f.isConnected){end(true);return;}
    d.moved=true;
    e.preventDefault();
    const units=Math.round(dx/(e.shiftKey?22:6)),base=f.min===''?0:Number(f.min);
    const next=d.speed?d.value+Math.round(dx)*(e.shiftKey?.001:.01)
      :f.step==='any'?d.value+units*d.step:base+(Math.round((d.value-base)/d.step)+units)*d.step;
    const value=Math.min(f.max===''?Infinity:Number(f.max),Math.max(f.min===''?-Infinity:Number(f.min),next));
    const formatted=String(Number(value.toPrecision(12)));if(f.value===formatted)return;
    f.value=formatted;if(d.live)emit(f,d.speed?'change':'input');
  },{passive:false});
  document.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId)end(false);},true);
  document.addEventListener('pointercancel',e=>{if(drag?.id===e.pointerId)end(true);},true);
  document.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)end(true);},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && drag){e.preventDefault();e.stopImmediatePropagation();end(true);}},true);
  window.addEventListener('blur',()=>end(true));
})();
