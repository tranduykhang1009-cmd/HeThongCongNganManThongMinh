/**
 * Sonner Toast Engine for SCADA IoT (Vanilla JS implementation inspired by Emil Kowalski)
 * Supports stacked notifications, spring animations, auto-dismiss, and hover expand.
 */
(function() {
    let toaster = null;
    let toasts = [];
    const DEFAULT_DURATION = 3200;

    function getToaster() {
        if (!toaster || !document.body.contains(toaster)) {
            toaster = document.getElementById('sonner-toaster');
            if (!toaster) {
                toaster = document.createElement('div');
                toaster.id = 'sonner-toaster';
                toaster.className = 'sonner-toaster fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[99999] pointer-events-none flex flex-col items-end gap-2 w-full max-w-[380px] px-4 sm:px-0';
                document.body.appendChild(toaster);
            }
        }
        return toaster;
    }

    function createToastElement(id, message, type = 'success', options = {}) {
        const el = document.createElement('div');
        el.id = `sonner-toast-${id}`;
        el.className = `sonner-toast pointer-events-auto relative flex items-center gap-3 w-full p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-xl border shadow-[0_12px_32px_-6px_rgba(0,0,0,0.6)] cursor-pointer select-none transition-all duration-200`;
        
        let borderClass = 'border-slate-700/80 text-slate-100';
        let iconHtml = '';
        
        if (type === 'success') {
            borderClass = 'border-emerald-500/30 text-emerald-300';
            iconHtml = `<div class="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                <i data-lucide="check-circle-2" class="w-4 h-4"></i>
            </div>`;
        } else if (type === 'error') {
            borderClass = 'border-rose-500/30 text-rose-300';
            iconHtml = `<div class="w-7 h-7 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 text-rose-400">
                <i data-lucide="alert-circle" class="w-4 h-4"></i>
            </div>`;
        } else if (type === 'warning') {
            borderClass = 'border-amber-500/30 text-amber-300';
            iconHtml = `<div class="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                <i data-lucide="alert-triangle" class="w-4 h-4"></i>
            </div>`;
        } else {
            borderClass = 'border-sky-500/30 text-sky-300';
            iconHtml = `<div class="w-7 h-7 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 text-sky-400">
                <i data-lucide="info" class="w-4 h-4"></i>
            </div>`;
        }

        el.classList.add(...borderClass.split(' '));

        el.innerHTML = `
            ${iconHtml}
            <div class="flex-1 min-w-0 pr-1">
                ${options.title ? `<div class="text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono">${options.title}</div>` : ''}
                <div class="text-xs font-semibold leading-snug text-slate-100 break-words">${message}</div>
            </div>
            <button type="button" class="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg transition-colors" onclick="event.stopPropagation(); window.toast.dismiss('${id}')">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
        `;

        el.style.transform = 'translateY(16px) scale(0.96)';
        el.style.opacity = '0';
        el.style.transition = 'transform 220ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease';

        return el;
    }

    function updateStack() {
        const active = toasts.slice(-3); // Show up to 3 stacked
        const count = active.length;
        
        active.forEach((t, idx) => {
            const el = document.getElementById(`sonner-toast-${t.id}`);
            if (!el) return;
            const posFromTop = count - 1 - idx; // 0 is newest (bottom)
            
            if (posFromTop === 0) {
                el.style.transform = 'translateY(0) scale(1)';
                el.style.opacity = '1';
                el.style.zIndex = '30';
            } else if (posFromTop === 1) {
                el.style.transform = 'translateY(-10px) scale(0.96)';
                el.style.opacity = '0.9';
                el.style.zIndex = '20';
            } else if (posFromTop === 2) {
                el.style.transform = 'translateY(-20px) scale(0.92)';
                el.style.opacity = '0.75';
                el.style.zIndex = '10';
            }
        });

        // Remove any element not in active
        toasts.slice(0, -3).forEach(t => {
            const oldEl = document.getElementById(`sonner-toast-${t.id}`);
            if (oldEl) oldEl.remove();
        });
    }

    function addToast(message, type = 'info', options = {}) {
        const host = getToaster();
        const id = 't_' + Math.random().toString(36).substring(2, 9);
        const duration = options.duration || DEFAULT_DURATION;

        const el = createToastElement(id, message, type, options);
        host.appendChild(el);
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons({ root: el });
        }

        const toastObj = { id, el, timer: null };

        // Animate entrance
        requestAnimationFrame(() => {
            el.style.transform = 'translateY(0) scale(1)';
            el.style.opacity = '1';
            toasts.push(toastObj);
            updateStack();
        });

        // Auto dismiss
        toastObj.timer = setTimeout(() => {
            dismissToast(id);
        }, duration);

        // Pause on hover
        el.addEventListener('mouseenter', () => {
            if (toastObj.timer) clearTimeout(toastObj.timer);
        });
        el.addEventListener('mouseleave', () => {
            toastObj.timer = setTimeout(() => dismissToast(id), 1500);
        });

        return id;
    }

    function dismissToast(id) {
        const idx = toasts.findIndex(t => t.id === id);
        if (idx === -1) return;
        const toastObj = toasts[idx];
        toasts.splice(idx, 1);

        const el = document.getElementById(`sonner-toast-${id}`);
        if (el) {
            el.style.transition = 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1), opacity 150ms ease';
            el.style.transform = 'translateY(12px) scale(0.94)';
            el.style.opacity = '0';
            setTimeout(() => {
                if (el.parentNode) el.remove();
                updateStack();
            }, 160);
        } else {
            updateStack();
        }
    }

    const toast = function(msg, opts) { return addToast(msg, 'info', opts); };
    toast.success = (msg, opts) => addToast(msg, 'success', opts);
    toast.error = (msg, opts) => addToast(msg, 'error', opts);
    toast.info = (msg, opts) => addToast(msg, 'info', opts);
    toast.warning = (msg, opts) => addToast(msg, 'warning', opts);
    toast.dismiss = (id) => dismissToast(id);

    // Expose globally
    window.toast = toast;
    
    // Provide backwards-compatibility wrapper for showToast()
    window.showToast = function(message, type = 'success') {
        if (type === 'error' || type === 'danger') {
            toast.error(message);
        } else if (type === 'warning') {
            toast.warning(message);
        } else if (type === 'info') {
            toast.info(message);
        } else {
            toast.success(message);
        }
    };
})();
