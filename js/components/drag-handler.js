class DragHandler {
    constructor(shadowHost) {
        this.shadowHost = shadowHost;
        this.panel = shadowHost.shadowRoot.querySelector('.arbitron-panel');
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.init();
    }
    init() {
        const header = this.panel.querySelector('.arbitron-header');
        header.style.cursor = 'move';
        header.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
    }
    startDrag(e) {
        if (e.target.closest('.arbitron-controls') || e.target.closest('button')) {
            return;
        }
        this.isDragging = true;
        const rect = this.shadowHost.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        this.shadowHost.style.transition = 'none';
        e.preventDefault();
        e.stopPropagation();
    }
    drag(e) {
        if (!this.isDragging) return;
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        const maxX = Math.max(0, window.innerWidth - this.shadowHost.offsetWidth);
        const maxY = Math.max(0, window.innerHeight - this.shadowHost.offsetHeight);
        const boundedX = Math.max(0, Math.min(x, maxX));
        const boundedY = Math.max(0, Math.min(y, maxY));
        this.shadowHost.style.setProperty('left', boundedX + 'px', 'important');
        this.shadowHost.style.setProperty('top', boundedY + 'px', 'important');
        this.shadowHost.style.setProperty('right', 'auto', 'important');
        e.preventDefault();
    }
    stopDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.shadowHost.style.transition = '';
            this.savePosition();
        }
    }
    async savePosition() {
        const rect = this.shadowHost.getBoundingClientRect();
        await StorageManager.savePosition({ x: rect.left, y: rect.top });
    }
}