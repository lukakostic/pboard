class Html_Modal{
    background_element:HTMLElement|null;
    foreground_element:HTMLElement|null;
    cb_onBgClick:Function|null;
    cb_onShow:Function|null;
    cb_onHide:Function|null;
    constructor(){
        this.background_element = null;
        this.foreground_element = null;
        this.cb_onBgClick = null;
        this.cb_onHide = null;
        this.cb_onShow = null;
    }
    createElements(foregroundElement:HTMLElement, parent?:HTMLElement, opts?:Html_Modal_opts){
        if(!parent)parent=document.body;
        this.background_element = LEEJS.div({
                ...(opts?.bgId && {id:opts.bgId}),
                class:`${(opts?.bgClass) ? opts.bgClass : ""} fixed inset-0 bg-black/50 flex items-center justify-center z-50`,
                $click:(e:MouseEvent)=>{
                    if(e.target==this.background_element)
                        this.onBgClick();
                    e.stopImmediatePropagation();
                },
                $keydown:(e:KeyboardEvent)=>{
                    e.stopImmediatePropagation();
                    if(e.key=="Escape"){
                        this.onBgClick();
                    }
                }
            },
            this.foreground_element = foregroundElement,
        )(parent);
    }
    onBgClick(){
        if(this.cb_onBgClick)
            if(this.cb_onBgClick()) return;
        this.hide();
    }
    hide(){
        if(this.cb_onHide)
            if(this.cb_onHide()) return;
        this.background_element!.style.display = "none";
    }
    show(){
        if(this.cb_onShow)
            if(this.cb_onShow()) return;
        this.background_element!.style.display = "";    
    }
}
type Html_Modal_opts = {
    bgId? : string;
    bgClass? : string;
};