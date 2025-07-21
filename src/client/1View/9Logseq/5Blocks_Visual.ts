/// <reference lib="dom" />


// declare var TinyMDE : any;
type Quill = any;
declare var Quill : Quill;
declare var LEEJS : any;


let showEditorToolbar = false;

contextmenuHandlers["block"] = (target:EventTarget)=>{
    if(!target) return null;
    let blockId_el = (target as HTMLElement).closest('[data-b-id]') as HTMLElement;
    if(!blockId_el) return null;
    let blockVisual = el_to_BlockVis.get(blockId_el);
    if(!blockVisual) return null;
    let blockId = blockVisual.blockId;
    let block = _BLOCKS[blockId];
    if(!block) return null;
    return [
        ["Copy id",()=>{
            navigator.clipboard.writeText(blockId);
        }],
        ["Collapse/Expand",()=>blockVisual.collapseTogle()],
        ["Tags",()=>TAGGER.toggleVisible(true,blockVisual),{tooltip:"Open tag manager for this block."}],
        
        ["Toggle toolbar",()=>{
            showEditorToolbar = !showEditorToolbar;

        }],
        ["PageView this",()=>view.openPage(block.id)],
        ["GetText as json",()=>alert(JSON.stringify(block.text)),{tooltip:"See text of this block as json."}],
        ["GetText",()=>alert(blockVisual.editor.getText()),{tooltip:"See text of this block."}],
        ["Delete (!!)",()=>blockVisual.DeleteBlock(true),{tooltip:"Delete this instance.</br>Other references to this block wont be deleted.",classMod:((c:string)=>c.replace('btn-outline-light','btn-outline-danger'))}],
        ["Delete all copies (!!)",()=>blockVisual.DeleteBlockEverywhere(true),{tooltip:"Delete any and all copies of this block.",classMod:((c:string)=>c.replace('btn-outline-light','btn-outline-danger'))}],
    ];
};
contextmenuHandlers["block-editor"] = (target:EventTarget)=>{
    if(inTextEditMode) return null;
    return contextmenuHandlers["block"]!(target);
};
// RegClass(Delta);
class Block_Visual{
    blockId:Id;
    children:Block_Visual[];
    
    collapsed : boolean;

    // html elements:
    el:HTMLElement;  //block element
    editor:Quill;  //editor inside block
    childrenHolderEl:HTMLElement;

    finished:boolean; //was it fully rendered or no (just constructed (false) or renderAll called also (true))

    editor_inner_el(){ // first child of "editor" element. With TinyMDE its editor.e but on quill its:
        // return this.editor.e; // TinyMDE
        return this.editor.root as HTMLElement; //Quill.js
        //return this.el.querySelector('.editor > .ql-editor')! as HTMLElement | null; // Quill.js
    }
    editor_firstEl(){ 
        let arrayOrLeaf = this.editor.getLeaf(0);
        let node : Node|null = null;
        if(Array.isArray(arrayOrLeaf)) node = arrayOrLeaf[0].domNode; // domNode returns text node instead of <p>
        else node = arrayOrLeaf.domNode;  // domNode returns text node instead of <p>
        while(node?.nodeType == Node.TEXT_NODE)
            node = node.parentNode;
        return node as HTMLElement;
    }
    constructor(b:Block,parentElement?:HTMLElement , collapsed = true){
        this.blockId = b.id;
        this.children = [];
        this.collapsed = collapsed;
        this.finished = false;
        
        this.el = LEEJS.div({
            class:"block",
            $bind:b, $bindEvents:b, "data-b-id":b.id, 
            tabindex:"-1",
            "data-contextmenu":"block",
        },[ 
            LEEJS.div(LEEJS.$I`editor`,{"data-contextmenu":"block-editor"}),
            LEEJS.div(LEEJS.$I`children`)
        ])(parentElement ?? STATIC.blocks) as HTMLElement;
        
        el_to_BlockVis.set(this.el,this);

        this.childrenHolderEl = this.el.querySelector('.children')!;

        this.editor = new Quill(this.el.querySelector('.editor')!, {
            modules: {
            //   toolbar: true,
                toolbar: [
                    [{ header: [1, 2, false] }],
                    ["bold", "italic", "underline"],
                    ["image", "video"]
                ],
                blotFormatter2: {
                    //     align: {
                    //       allowAligning: true,
                    //     },
                    video: {
                        registerCustomVideoBlot: true
                    },
                    resize: {
                        //       allowResizing: true,
                        useRelativeSize: true,
                        allowResizeModeChange: true,
                        imageOversizeProtection: true
                    },
                    //     delete: {
                    //       allowKeyboardDelete: true,
                    //     },
                    image: {
                        //       allowAltTitleEdit: true,
                        registerImageTitleBlot: true,
                        allowCompressor: true,
                        compressorOptions: {
                            jpegQuality: 0.7,
                            maxWidth: 1000
                        }
                    }
                },
            },
            placeholder: "" ,
            theme: 'snow', // 'bubble'
          });

          let toolbar = this.editor.getModule('toolbar');
          toolbar.addHandler('attachment', () => {
          
              const range = this.editor.getSelection(true);
              const value = { url: "Link", text: "text" }
              
              this.editor.insertEmbed(range.index, 'attachment', value);
              this.editor.setSelection(range.index + value.text.length);
          });
          console.log(toolbar);
          
        if(typeof (b.text) == 'string')
            this.editor.setText(b.text);
        else
            this.editor.setContents(b.text);

        // const value = { url: "getBtn(event.target).style.minHeight='300px';", text: "text" }
        // this.editor.insertEmbed(0, 'lineBtn', value);

        //   new TinyMDE.Editor({ 
        //     editor:this.el.querySelector('.editor')!,
        //     element: this.el, 
        //     content: b.text 
        // });

        // this.editor_inner_el()!.setAttribute("tabindex","-1");
        
        //   var commandBar = new TinyMDE.CommandBar({
        //     element: "toolbar",
        //     editor: tinyMDE,
        //   });

        this.editor.root.addEventListener('keydown', async (event : KeyboardEvent)=>{
            // Check if the key is an arrow key
            console.log("editor keydown",event);
            const markEventHandled = ()=>{
                ACT.setEvHandled(event);
                console.log("editor keydown MARKED HANDLED");
                //event.stopPropagation(); // Prevent it from bubbling up
            };

            // if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            //   event.stopPropagation(); // Prevent it from bubbling up
            // }
            
            if (event.key === 'F4') {
                markEventHandled();
                const range = this.editor.getSelection(true);
                if (range) {
                    let id = prompt("Enter Pboard board id:");
                    BLOCKS_assertId(id);

                    const value = { collapsed: true, id: id }; // Default to collapsed
                    this.editor.insertEmbed(range.index, 'inline-pboard-block', value);
                    this.editor.setSelection(range.index /*+ value.text.length*/ + 1); // Move cursor after inserted text
                }
            }else if (event.key === 'F2') {
                markEventHandled();
                const range = this.editor.getSelection(true);
                console.log("F2 pressed",range);
                if (range) {
                    let pre = this.editor.getContents(0, range.index);
                    let aft = this.editor.getContents(range.index);
                    console.log("pre",pre);
                    console.log("aft",aft);
                    let blVis = await NewBlockInside(this.parentOrPage(),this.index()+1);
                    console.log("New block visual",blVis);
                    blVis.editor.setContents(aft);
                    this.editor.setContents(pre);

                    // const value = { collapsed: true, text: "OOGA BOOGA" }; // Default to collapsed
                    // this.editor.insertEmbed(range.index, 'expandable', value);
                    // this.editor.setSelection(range.index + value.text.length + 1); // Move cursor after inserted text
                }
            }else{ //other events which shouldnt propagate to the block visual
                //dont handle a few shortcuts
                if(event.ctrlKey && event.key === 'Enter'){
                }else if(event.key === 'Escape'){
                }else{ // handle all other keys
                    markEventHandled();
                }
                // if(event.key === 'Tab' || event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight'){
                //     markEventHandled();
                // }
                   
            }
            
            
        });
        
        this.el.addEventListener('focus',async (ev:FocusEvent)=>{
            if(ACT.isEvHandled(ev)) return;
            ACT.setEvHandled(ev);
            selectBlock(this);
            ev.stopImmediatePropagation();
            ev.preventDefault();
        });
        // this.editor.e.addEventListener('focus',async (ev:FocusEvent)=>{
        //     if(ACT.isEvHandled(ev)) return;
        //     ACT.setEvHandled(ev);
        //     selectBlock(this);
        //     ev.stopImmediatePropagation();
        //     ev.preventDefault();
        // });
        this.editor_inner_el()!.addEventListener('click',async (ev:MouseEvent)=>{
            if(ACT.isEvHandled(ev)) return;
            // console.error("editor click");
            ACT.setEvHandled(ev);

            //console.log("click e");
            let c = ACT.fn_OnClicked(this.editor_inner_el()!);
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
            let c = ACT.fn_OnClicked(this.el);
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

        this.editor.on('text-change',(e:any)=>{
            console.log("TEXT_CHANGE ",e);
            //let {content_str,linesDirty_BoolArray} = ev;
            b.text = Object.setPrototypeOf(this.editor.getContents(),Object.prototype);//content_str;
            b.DIRTY();
        });
        this.el.addEventListener('keydown',async (e:KeyboardEvent)=>{
            if(ACT.isEvHandled(e)) return;

            const markEventHandled = ()=>{
                ACT.setEvHandled(e);
                e.preventDefault();
                e.stopImmediatePropagation();
                //e.stopPropagation(); // Prevent it from bubbling up
            };

            console.log("KEYDOWN",e);

            HELP.logCodeHint("Navigation","Listeners/handlers inside Visual_Block");
            
            if(e.key == 'Escape'){
                // if(document.activeElement == this.editor.e){
                console.log("ESCAPE block_visual");
                markEventHandled();
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
                    markEventHandled();
                    selectBlock(await NewBlockAfter(this), true);
                }
                else if(e.shiftKey){
                    markEventHandled();
                    selectBlock(await NewBlockInside(this), true);
                }
            }
            else if(e.key=='T'||e.key=='t'){
                markEventHandled();
                TAGGER.toggleVisible(true,this);
            }
            else if(e.key=='Q'||e.key=='q'){
                markEventHandled();
                openContextMenu(this.el,this.el.clientLeft,this.el.clientTop);
            }
            // console.log(cancelEvent);
            // if(cancelEvent)
            //     {
            //         markEventHandled();
            //         ACT.setEvHandled(e);e.preventDefault();e.stopImmediatePropagation();
            //     }
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

    focus(focusEditor:boolean|null=null){
        if(focusEditor===null)focusEditor=inTextEditMode;
        let el = focusEditor? (this.editor as any /*call quill.focus()*/) : this.el; 
        /*
        Check if currently active element is already "el" or some child of el. If so, return.
        Else, blur currently active, and focus to el instead.
        */console.log("FOCUS",el);
        if(document.activeElement){
            if(document.activeElement == el)
                return;
    
            if(this.el.contains(document.activeElement)){
                // is textbox selected?
                if(this.editor_inner_el()!.contains(document.activeElement)){
                    if(inTextEditMode){
                        return; // its ok to select it
                    }
                    else
                    {} // blur it!
                }
            }
            
            (document.activeElement! as HTMLElement).blur();
        }
        
        // el.dispatchEvent(new FocusEvent("focus"));
        // console.error("FOCUSING ",el);
        el.focus();
    }
    
    deleteSelf(){
        el_to_BlockVis.delete(this.el);
        this.el.parentElement?.removeChild(this.el);
    }
    async DeleteBlock(doConfirm=true){
        if(doConfirm && !confirm(`Delete block?`)) return;
        await BlkFn.DeleteBlockOnce(this.blockId);
        //TODO: update all copies of this block.
        this.deleteSelf();
    }
    async DeleteBlockEverywhere(doConfirm=true){
        if(doConfirm && !confirm(`Delete block everywhere?\nThis will delete ALL instances of this block, everywhere (embeded).`)) return;
        await BlkFn.DeleteBlockEverywhere(this.blockId);
        //TODO: update all copies of this block.
        this.deleteSelf();
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
