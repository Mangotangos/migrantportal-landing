let _confResolve=null;
function showConfirmModal({title='Confirm',message='',confirmText='Confirm',danger=true}={}){
  document.getElementById('confTitle').textContent=title;
  document.getElementById('confMsg').textContent=message;
  const btn=document.getElementById('confOkBtn'),icon=document.getElementById('confIcon'),cls=danger?'danger':'teal';
  btn.textContent=confirmText;btn.className='conf-btn-ok '+cls;
  icon.className='conf-icon '+cls;
  icon.innerHTML=danger
    ?'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>'
    :'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  document.getElementById('confOverlay').classList.add('open');
  return new Promise(res=>{_confResolve=res;});
}
function _confOk(){document.getElementById('confOverlay').classList.remove('open');if(_confResolve){_confResolve(true);_confResolve=null;}}
function _confCancel(){document.getElementById('confOverlay').classList.remove('open');if(_confResolve){_confResolve(false);_confResolve=null;}}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('confOverlay').classList.contains('open'))_confCancel();});
