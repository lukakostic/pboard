/// <reference lib="dom" />


declare var TinyMDE : any;
declare var LEEJS : any;


class Block_Visual{
    blockId:Id;
    children:Block_Visual[];
    
    collapsed : boolean;

    // html elements:
    el:HTMLElement;  //block element
    editor:any;  //editor inside block
    childrenHolderEl:HTMLElement;

    finished:boolean; //was it fully rendered or no (just constructed (false) or renderAll called also (true))


    constructor(b:Block,parentElement?:HTMLElement , collapsed = true){
        this.blockId = b.id;
        this.children = [];
        this.collapsed = collapsed;
        this.finished = false;
        
        this.el = LEEJS.div({
            class:"block",
            $bind:b, $bindEvents:b, "data-b-id":b.id, 
            tabindex:"-1",
        },[LEEJS.div(LEEJS.$I`editor`),
            LEEJS.div(LEEJS.$I`children`)])
        .appendTo(parentElement ?? STATIC.blocks) as HTMLElement;
        
        el_to_BlockVis.set(this.el,this);

        this.childrenHolderEl = this.el.querySelector('.children')!;

        this.editor = new TinyMDE.Editor({ 
            editor:this.el.querySelector('.editor')!,
            element: this.el, 
            content: b.text 
        });
        this.editor.e.setAttribute("tabindex","-1");

        //   var commandBar = new TinyMDE.CommandBar({
        //     element: "toolbar",
        //     editor: tinyMDE,
        //   });
        
        this.el.addEventListener('focus',async (ev:FocusEvent)=>{
            if(ACT.isEvHandled(ev)) return;
            ACT.setEvHandled(ev);
            selectBlock(this);
            ev.stopImmediatePropagation();
            ev.preventDefault();
        });
        this.editor.e.addEventListener('focus',async (ev:FocusEvent)=>{
            if(ACT.isEvHandled(ev)) return;
            ACT.setEvHandled(ev);
            selectBlock(this);
            ev.stopImmediatePropagation();
            ev.preventDefault();
        });
        this.editor.e.addEventListener('click',async (ev:MouseEvent)=>{
            if(ACT.isEvHandled(ev)) return;
            // console.error("editor click");
            ACT.setEvHandled(ev);

            //console.log("click e");
            let c = ACT.fn_OnClicked(this.editor.e);
            if(c==ACT.DOUBLE_CLICK){
                selectBlock(this,true);
            }else
                selectBlock(this);
        });
        this.el.addEventListener('click',async (ev:MouseEvent)=>{
            if(ACT.isEvHandled(ev)) return;
            // console.error("El click");
            ACT.setEvHandled(ev);

            //console.log("click e");
            let c = ACT.fn_OnClicked(this.editor.e);
            if(c==ACT.DOUBLE_CLICK){
                let xFromLeftEdge = ev.clientX - this.el.getBoundingClientRect().x;
                if(xFromLeftEdge<=8) //alert(xFromLeftEdge + "CLICKED");
                {
                    this.collapseTogle();
                }
                // alert("CLICKED");
                    // if(ev.x)
            //    selectBlock(this,true);
            }
            //else selectBlock(this);
        });

        this.editor.addEventListener('input',async (ev:TMDE_InputEvent)=>{
            //let {content_str,linesDirty_BoolArray} = ev;
            b.text = ev.content;//content_str;
            b.DIRTY();
        });
        this.editor.e.addEventListener('keydown',async (e:KeyboardEvent)=>{
            if(ACT.isEvHandled(e)) return;
            ACT.setEvHandled(e);

            HELP.logCodeHint("Navigation","Listeners/handlers inside Visual_Block");
            // return;
            // console.log(e);
            let cancelEvent = true;
            if(e.key == 'Escape'){
                // if(document.activeElement == this.editor.e){
                    selectBlock(this,false);
                // }else{
                //     selectBlock(null);
                // }
            }
            // else if(e.key=='Tab'){
            //     ShiftFocus(this, e.shiftKey?SHIFT_FOCUS.above:SHIFT_FOCUS.below);
            // }
            else if(e.key=='Enter'){
                if(e.ctrlKey){ //insert new block below current block
                    selectBlock(await NewBlockAfter(this), true);
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
                else if(e.shiftKey){
                    selectBlock(await NewBlockInside(this), true);
                    // e.shiftKey = false;
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    
                }else{
                    cancelEvent = false;
                }

            }else{
                cancelEvent = false;
            }
            if(cancelEvent)
                {e.preventDefault();e.stopImmediatePropagation();}
        });
    }

    
    _block() :Block|null{
        return _BLOCKS[this.blockId];
    }
    block() :Promise<Block>{
        return BLOCKS(this.blockId);
    }
    id():Id{
        return this.blockId;
    }
    
    parent():Block_Visual|null{
        return propagateUpToBlock( this.el.parentElement! );
    }
    parentOrPage():Block_Visual|Page_Visual{
        const p = this.parent();
        if(p==null) return view!;
        return p;
    }
    firstChild() : Block_Visual|null {
        if(this.children.length==0) return null;
        return this.children[0];
    }
    lastChild() : Block_Visual|null {
        if(this.children.length==0) return null;
        return this.children.at(-1)!;
    }
    index():number{
        let p = this.parent();
        if(p) return p.children.indexOf(this);
        return view!.children.indexOf(this);
    }
    parentChildrenArray() : Block_Visual[]{    
        let p = this.parent();
        if(p) return p.children;
        return view!.children;
    }
    appendChild(childBV: Block_Visual, idx=-1){
        if(idx<0){
            this.children.push(childBV);
            this.childrenHolderEl.appendChild(childBV.el!);
        }else{
            this.children.splice(idx,0,childBV);
            this.childrenHolderEl.insertBefore(childBV.el,this.childrenHolderEl.children.item(idx));
        }
        // this.renderChildren();
        this.updateStyle();
    }
    async deleteChild(childBV:Block_Visual){
        const idx = this.children.indexOf(childBV);
        if(idx>=0){
            this.children[idx].deleteSelf();
            BlkFn.DeleteBlockOnce(childBV.blockId);
            this.children.splice(idx,1);
            let b = (await this.block());
            b.children.splice(idx,1);
            b.DIRTY();
            this.renderChildren();
        }
        if(selected_block == childBV) selectBlock(null);
        this.updateStyle();
        view!.updateBlocksById(this.blockId);
    }
    
    deleteSelf(){
        el_to_BlockVis.delete(this.el);
        this.el.parentElement?.removeChild(this.el);
    }
    updateStyle(){
        if(this.collapsed)
            this.childrenHolderEl.style.display = "none";
        else
            this.childrenHolderEl.style.display = "inherit";

        if(this._block()!.children.length==0){
            this.el.classList.add("empty");   
        }else{
            this.el.classList.remove("empty");
            if(this.collapsed) this.el.classList.add("collapsed");
            else this.el.classList.remove("collapsed");
        }

    }
    async updateAll(maxUncollapseDepth=999){
        this.collapsed = (await this.block()).collapsed;
        if(maxUncollapseDepth<=0) this.collapsed = true;
        await this.renderChildren(maxUncollapseDepth);
        this.updateStyle();
        this.finished = true;
        // if(this.collapsed == false && maxUncollapseDepth>1){
        //     for(let i = 0; i < this.children.length; i++)
        //         await this.children[i].updateAll(maxUncollapseDepth-1);
        // }
    }
    async renderChildren(maxUncollapseDepth=999){
        if(this.children.length>0){
            this.children.forEach(c=>c.deleteSelf());
        }
        this.children = [];
        this.childrenHolderEl.innerHTML = "";
        if(this.collapsed == false){
            let b = await this.block();
            for(let i = 0; i<b.children.length; i++){
                //if(_BLOCKS[b.children[i]]==null) continue; // skip not yet loaded. [TODO] add a button to load more.
                let b2 = await BLOCKS(b.children[i],2);
                let bv2 = await b2.makeVisual(this.childrenHolderEl, maxUncollapseDepth);
                this.children.push(bv2);
                //await bv2.renderChildren();
                //await makeBlockAndChildrenIfExist(bv2);
            }
        }   
    }
    async collapseTogle(setValue:boolean|null=null){
        // console.error("Toggle ",this.blockId,this.collapsed);
        // console.trace();

        if(setValue!==null) this.collapsed = setValue;
        else this.collapsed = !this.collapsed;
        const b = (await this.block());
        if(b.collapsed != this.collapsed){
            b.collapsed = this.collapsed;
            b.DIRTY();
        }

        // console.error("Toggle2 ",this.blockId,this.collapsed);
        await this.renderChildren();
        this.updateStyle();
    }
}
