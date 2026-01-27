class Tabzy{
    constructor(selector, options = {}) {
        this.container = document.querySelector(selector);
        if(!this.container) {
            console.error(`Container element not found for selector: ${selector}`);
            return;
        }

        // Thiết lập tùy chọn với giá trị mặc định
        this.options = Object.assign({
            activeClassName: 'tabzy-active',
            remember: false,
            onChange: null
        }, options);

        // Tìm tất cả các tab và panel bên trong container
        this.tabs = [...this.container.querySelectorAll('a[href^="#"]')];
        if(!this.tabs.length) {
            console.error('No tabs found within the container.');
            return;
        }

        // Tìm các panel tương ứng với các tab
        this.panels = this.tabs.map(tab => 
        document.querySelector(tab.getAttribute('href'))).filter(Boolean);
        
        if(this.panels.length !== this.tabs.length) return;

        this._handles = []; // mảng lưu trữ các hàm xử lý sự kiện
        this._init(); // hàm khởi động
    }


    // Hàm xác định tab từ đầu vào
    _resolveTab(input){
        if(typeof input === 'string'){
            return this.tabs.find(tab => 
                tab.getAttribute('href') === input) ;
        }
        
        if(input instanceof HTMLElement){
            return this.tabs.includes(input) ? input : null;
        }
        
        return null;
    }


    /**  ============ state =========== */
    // Hàm kích hoạt tab và panel tương ứng
    _activeTab(tab,panel){
        if(!tab || !panel) return;
        tab.classList.add(this.options.activeClassName);
        panel.hidden = false;
    }

    // Hàm hủy kích hoạt tất cả các tab và panel
    _resetActiveTab(){
        this.tabs.forEach(tab => 
            tab.classList.remove(this.options.activeClassName)
        )
        this.panels.forEach(panel => panel.hidden = true);
    }

    /**           ============ Url =========== */
    // Hàm khôi phục tab từ URL nếu có
    _restoreFromUrl(){
        if(!this.options.remember) return false;
        const hash = window.location.hash; // Lấy phần hash từ URL
        if(!hash) return false;

        const tab = this._resolveTab(hash);
        if(!tab) return false;
        this.switch(tab);
        return true;
    }

    _updateUrl(tab){
        if(!this.options.remember) return;
        const hash = tab.getAttribute('href');
        history.replaceState(null, '', hash);
    }

    // Hàm chuyển đổi tab
    switch(input){
        const tab = this._resolveTab(input); // Xac định tab từ đầu vào
        if(!tab) {
            console.error(`[Tabzy] switch(): cannot find tab for`,
            input);
            return;
        }
        const panel = document.querySelector(tab.getAttribute('href'));
        if(!panel) return;

        this._resetActiveTab(); // Hủy kích hoạt tất cả các tab và panel
        this._activeTab(tab, panel); // Kích hoạt tab và panel được chọn
        this._updateUrl(tab); // Cập nhật URL nếu cần

        // Gọi hàm onChange nếu được cung cấp
        this.options.onChange?.({tab, panel});
    }

        // Hàm gán sự kiện cho các tab
    _bindEvents() {
        this.tabs.forEach(tab => {
            const handler = (e) =>{
                e.preventDefault();
                this.switch(tab);
            }
            tab.addEventListener('click', handler);
            this._handles.push({tab, handler});
        })
    }

        // Khởi động hệ thống tab
    _init() {
        this._bindEvents(); 
        this._restoreFromUrl() || this.switch(this.tabs[0]);
    }
    
    /**           ============ Destroy =========== */
    destroy(){
        this._handles.forEach(({tab, handler}) => {
            tab.removeEventListener('click', handler);
        });
        this.tabs.forEach(tab => 
            tab.classList.remove(this.options.activeClassName)
        );
        this.panels.forEach(panel => panel.hidden = false);
        this._handles = [];
    }
}


const tabs = new Tabzy('#fancy-tabs',{
    activeClassName: 'tabzy--active',
    remember: true, // Keeps the active tab in the URL
    onChange: function({ tab, panel }) {
        console.log(`Switched to ${tab.textContent}`);
    }
});

const tabs2 = new Tabzy('#persistent-tabs',{
    activeClassName: 'active',
    remember: false, // Does not keep the active tab in the URL   
});