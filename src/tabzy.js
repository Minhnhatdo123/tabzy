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
            paramKey: selector.replace(/[^a-z0-9]/gi,''), // Lấy tên tham số từ selector
            onChange: null,
            onInit:null // Hàm callback khi khởi tạo
        }, options);

        if(this.options.onChange && typeof this.options.onChange !== 'function') {
            console.error('onChange option must be a function');
            this.options.onChange = null;
        }
        
        // Tìm tất cả các tab và panel bên trong container
        this.tabs = [...this.container.querySelectorAll('a[href^="#"]')];
        if(!this.tabs.length) {
            console.error('No tabs found within the container.');
            return;
        }

        // Tìm các panel tương ứng với các tab
        this.panels = this.tabs.map(tab => 
        document.querySelector(tab.getAttribute('href'))).filter(Boolean);
        
        if(this.panels.length !== this.tabs.length){
            console.warn('Some tabs do not have corresponding panels.');
            return;
        };
        

        this._currentTab = null; // tab hiện tại
        this._handles = []; // mảng lưu trữ các hàm xử lý sự kiện
        this._popHandler = null; // hàm xử lý sự kiện popstate
        this._init(); // hàm khởi động
    }

    get currentTab()
    {
        return this._currentTab;
    }

    // Khởi động hệ thống tab
    _init() {
        this._bindEvents(); // Gán sự kiện cho các tab
        this._restoreFromUrl() || this.switch(this.tabs[0],{silent: true}); // Khôi phục tab từ URL hoặc kích hoạt tab đầu tiên 
        if(this._currentTab){
            this.options.onInit?.({tab: this._currentTab});
        }
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
        // Nếu tùy chọn remember được bật, gán sự kiện popstate để khôi phục tab khi người dùng sử dụng nút back/forward của trình duyệt
        if(this.options.remember){
            this._popHandler = () => this._restoreFromUrl();
            window.addEventListener('popstate', this._popHandler);
        }
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
        //  xử lý tham số truy vấn sau dấu ? : URLSearchParams
        // ví dụ: https://site.com/?tab=home&page=2
        // url.search = "?tab=home&page=2"
        const params = new URLSearchParams(window.location.search); 
        // ví dụ "?tab=home&mode=dark"
        // Dùng paramkey để lấy giá trị tương ứng - paramkey ="tab"
        const value = params.get(this.options.paramKey);
        if(!value) return false;

        const tab = this._resolveTab('#' + value);
        if(!tab) return false;

        this.switch(tab,{silent: true});    
        return true;
    }

    // Hàm cập nhật URL khi chuyển đổi tab
    _updateUrl(tab){
        if(!this.options.remember) return;

        const key = this.options.paramKey; 
        if(!key) return;

        // Lấy giá trị từ tab hiện tại
        const value = tab.getAttribute('href').replace('#','');

        // Tạo đối tượng URL Object có cấu trúc
        // url.href = "https://site.com/?tab=home&page=2" 
        const url = new URL(window.location.href); 
        // Cập nhật tham số trong URL : giữ nguyên param cũ và update param mới
        url.searchParams.set(key, value); 

        // Cập nhật URL mà không tải lại trang
        history.pushState(null, '', url.toString());
    }

    // Hàm chuyển đổi tab
    switch(input,options = {}){
        const {silent = false} = options;
        const tab = this._resolveTab(input); // Xac định tab từ đầu vào
        if(!tab) {
            console.error(`[Tabzy] switch(): cannot find tab for`,
            input);
            return;
        }

        if(tab === this._currentTab) return; // Nếu tab đã được kích hoạt thì không làm gì cả
        const panel = document.querySelector(tab.getAttribute('href'));
        if(!panel) return;

        this._resetActiveTab(); // Hủy kích hoạt tất cả các tab và panel
        this._activeTab(tab, panel); // Kích hoạt tab và panel được chọn
        moveActiveLine(tab); // Di chuyển active line nếu có
        this._updateUrl(tab); // Cập nhật URL nếu cần
        
        this._currentTab = tab; // Cập nhật tab hiện tại
        // Gọi hàm onChange nếu được cung cấp
        if(!silent)
        {
            this.options.onChange?.({tab, panel});
        }
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

        // Nếu tùy chọn remember được bật, gỡ bỏ sự kiện popstate
        if(this.options.remember && this._popHandler){
            window.removeEventListener('popstate', this._popHandler);
            this._popHandler = null;
        }

        if(this.options.remember && this.options.paramKey){
            const url = new URL(window.location.href);
            url.searchParams.delete(this.options.paramKey);
            history.replaceState(null, '', url.toString());
        }

        this._currentTab = null;
    }
}

function moveActiveLine(tab)
{
    const container = tab.closest('.tabzy-wrapper');
    if(!container) return;
    const line = container.querySelector('.active-line');
    if(!line) return;

    const li = tab.closest('li');
    requestAnimationFrame(() => {
        const react = li.getBoundingClientRect();
        const parentReact = li.parentElement.getBoundingClientRect();
        
        line.style.width = react.width + 'px';
        line.style.transform = `translateX(${react.left - parentReact.left}px)`;
    })
    
}

const tabs1 = new Tabzy('#fancy-tabs',{
    activeClassName: 'tabzy--active',
    remember: true, // Keeps the active tab in the URL
    paramKey:'fancy-tabs',
    onInit:({tab}) => moveActiveLine(tab)
    ,
    onChange: function({ tab, panel }) {
        moveActiveLine(tab);
        console.log(`Switched to ${tab.textContent}`);
    }
});

const tabs2 = new Tabzy('#persistent-tabs',{
    activeClassName: 'tabzy--active',
    remember: true, // Does not keep the active tab in the URL 
    paramKey:"persistent-tabs",
    onInit:({tab}) => moveActiveLine(tab),  
    onChange: function({ tab, panel }) {
        moveActiveLine(tab);
        console.log(`Switched to ${tab.textContent}`);
    }
});

// const tabs3 = new Tabzy('#sliding-tabs',{
//     activeClassName: 'tabzy--active',
//     remember: true, // Keeps the active tab in the URL
//     paramKey:'personal-tabs',
//     onChange: function({ tab, panel }) {
//         console.log(`Switched to ${tab.textContent}`);
//         moveActiveLine(tab);
//     }
// });