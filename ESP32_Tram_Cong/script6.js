
    let toolsMenuTimeout = null;
    function toggleToolsMenu() {
        const menu = document.getElementById('tools-menu');
        const overlay = document.getElementById('tools-menu-overlay');
        const btn = document.getElementById('nav-tools');
        
        if (toolsMenuTimeout) clearTimeout(toolsMenuTimeout);

        if (menu.classList.contains('hidden')) {
            // Định vị menu đổ xuống ngay dưới nút Công Cụ TRƯỚC KHI hiển thị
            if (btn) {
                const rect = btn.getBoundingClientRect();
                menu.style.top = (rect.bottom + 6) + 'px';
                let leftPos = rect.left + (rect.width / 2) - 112;
                if (leftPos + 230 > window.innerWidth) {
                    leftPos = window.innerWidth - 235;
                }
                menu.style.left = Math.max(10, leftPos) + 'px';
                menu.style.right = 'auto';
            }

            menu.classList.remove('hidden');
            overlay.classList.remove('hidden');

            toolsMenuTimeout = setTimeout(() => {
                menu.classList.remove('scale-95', 'opacity-0');
                menu.classList.add('scale-100', 'opacity-100');
            }, 10);
        } else {
            menu.classList.remove('scale-100', 'opacity-100');
            menu.classList.add('scale-95', 'opacity-0');
            toolsMenuTimeout = setTimeout(() => {
                menu.classList.add('hidden');
                overlay.classList.add('hidden');
            }, 150);
        }
    }
