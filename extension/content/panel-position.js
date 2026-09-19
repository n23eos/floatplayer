"use strict";
var YTFP = globalThis.YTFP || (globalThis.YTFP = {});
YTFP.panelPosition = (() => {
  const clamp = value => Math.max(0, Math.min(1, value));
  function attach(panel, handle, root) {
    let position = null, drag = null, disposed = false, changed = false;
    const win = panel.ownerDocument.defaultView;
    function layout() {
      if (drag) return;
      const parent = root.getBoundingClientRect(), rect = panel.getBoundingClientRect();
      if (position) {
        panel.style.transform = 'none'; panel.style.bottom = 'auto';
        panel.style.left = `${Math.max(0, parent.width - rect.width) * position.x}px`;
        panel.style.top = `${Math.max(0, parent.height - rect.height) * position.y}px`;
      } else {
        panel.style.left = '50%'; panel.style.top = ''; panel.style.transform = 'translateX(-50%)';
        const controls = root.querySelector('.ytp-chrome-bottom')?.getBoundingClientRect();
        panel.style.bottom = `${controls?.height ? Math.max(12, parent.bottom - controls.top + 10) : 76}px`;
      }
      panel.dataset.menuBelow = String(panel.getBoundingClientRect().top - parent.top < parent.height / 2);
    }
    chrome.storage.local.get('pagePanelPosition').then(data => {
      if (disposed || changed) return;
      const item = data.pagePanelPosition;
      if (Number.isFinite(item?.x) && Number.isFinite(item?.y)) position = { x:clamp(item.x), y:clamp(item.y) };
      layout();
    }).catch(() => {});
    function down(event) {
      if (event.button !== 0) return;
      event.preventDefault();
      const rect = panel.getBoundingClientRect();
      drag = { dx:event.clientX - rect.left, dy:event.clientY - rect.top, id:event.pointerId, previous:position };
      handle.setPointerCapture?.(event.pointerId);
    }
    function move(event) {
      if (!drag || event.pointerId !== drag.id) return;
      const rect = root.getBoundingClientRect(), own = panel.getBoundingClientRect();
      position = { x:clamp((event.clientX - rect.left - drag.dx) / Math.max(1, rect.width - own.width)), y:clamp((event.clientY - rect.top - drag.dy) / Math.max(1, rect.height - own.height)) };
      const saved = drag; drag = null; layout(); drag = saved;
    }
    async function up(event) {
      if (!drag) return;
      if (event.type === 'pointercancel') position = drag.previous;
      drag = null; changed = true; layout();
      try { await chrome.storage.local.set({ pagePanelPosition:position }); handle.title = YTFP.surfaceControls.t('dragPanel','Move panel'); }
      catch { handle.title = YTFP.surfaceControls.t('optSaveError', 'Could not save'); }
    }
    handle.addEventListener('pointerdown', down); handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
    const observer = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(layout) : null;
    observer?.observe(root); observer?.observe(panel); win.addEventListener('resize', layout);
    return { layout, async reset() { changed = true; position = null; drag = null; layout(); await chrome.storage.local.remove('pagePanelPosition'); }, cleanup() {
      disposed = true; observer?.disconnect(); win.removeEventListener('resize', layout);
      handle.removeEventListener('pointerdown',down); handle.removeEventListener('pointermove',move); handle.removeEventListener('pointerup',up); handle.removeEventListener('pointercancel',up);
    } };
  }
  return { attach };
})();
