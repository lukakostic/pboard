/*
User is viewing a single page.
*/

const STATIC = {
    _body : document.body,
    style_highlighter : document.getElementById('highlighterStyle')!,
    blocks : document.getElementById('blocks')!,
    pageView : document.getElementById('pageView')!,
    pageView_Title : document.getElementById('pageView-title')!,
};
class Page_Visual{
    pageId : Id;
    children : Block_Visual[];
    childrenHolderEl : HTMLElement;
    alreadyRendered : boolean;

    titleEl : HTMLInputElement|null = null; // title element, if board has a title.

    reactRoot : ReactDOM.Root;//|null = null; // React root for this page
    constructor(){
        this.pageId = "";
        this.children = [];
        this.alreadyRendered = false;

        this.childrenHolderEl = null as any;


        // const toolbarRoot = ReactDOM.createRoot(document.getElementById('toolbar'));
        // toolbarRoot.render(React.createElement(Toolbar));
        // const treeRoot = ReactDOM.createRoot(document.getElementById('blocks'));
        // treeRoot.render(React.createElement(TreeView));

        this.reactRoot = ReactDOM.createRoot(STATIC.pageView);
        return React.createElement('div', null,
            React.createElement(TitleBar),
            // React.createElement('h2', null, 'Global Object Tree'),
        
            // Render all objects as roots
            objects.map((obj, index) =>
              React.createElement(ObjectNode, { key: obj.id, index })
            )
          );
        this.reactRoot.render(React.createElement(TitleBar));
    }

    setDocumentURI(){
        // change document url to have hash "#?pageId=<pageId>"
        // let url = new URL(document.location.href);
        // url.hash = "#?pageId="+this.pageId;
        // history.pushState({}, '', url.href);
        document.location.hash = "?pageId="+this.pageId;
    }
    getDocumentURI(){
        let url = new URL(document.location.href);
        let pageId = url.hash.match(/pageId=(\w+)/);
        if(pageId){
            this.pageId = pageId[1];
            return this.pageId;
        }
        return null;
    }
    page():Block{
        return _BLOCKS[this.pageId]!;
    }
    block_():Block{
        return _BLOCKS[this.pageId]!;
    }
    block():Promise<Block>{
        return BLOCKS(this.pageId);
    }
    id():Id{
        return this.pageId;
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
        this.updateBlocksById(this.pageId);
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
        // if(selected_block == childBV) selectBlock(null);
        //this.updateStyle();
        this.updateBlocksById(this.pageId);
    }
    async renderChildren(maxUncollapseDepth=999){
        if(this.children.length>0){
            this.children.forEach(c=>c.deleteSelf());
        }
        this.children = [];
        this.childrenHolderEl.innerHTML = "";
        
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

    async openPage(newPageId:Id){
        const maxUncollapseDepth = 999;

        await loadBlock(newPageId,maxUncollapseDepth);
        this.pageId = newPageId;
        this.children = [];
        
        await CheckAndHandle_PageNoBlocks();
        await this.makePage(maxUncollapseDepth);
    }
    async makePage(maxUncollapseDepth=0){
        //if(this.alreadyRendered) throw new Error("Page is being made again. Why?");
        this.alreadyRendered = true;

        const p = this.page();
        this.children = [];
        document.title = p.pageTitle ?? "";

        this.childrenHolderEl = STATIC.blocks;
        this.childrenHolderEl.innerHTML = ""; // clear


        /*
        async function makeBlockAndChildrenIfExist(bv:Block_Visual){
            //bv already exists and is created. Now we need to create visuals for its children (and theirs).
            //create block_visuals for children of bv, and repeat this for them recursively
            let b = await bv.block();
            bv.children = [];
            if(bv.collapsed == false){
                for(let i = 0; i<b.children.length; i++){
                    //if(_BLOCKS[b.children[i]]==null) continue; // skip not yet loaded. [TODO] add a button to load more.
                    let b2 = await BLOCKS(b.children[i]);
                    let bv2 = b2.makeVisual(bv.childrenHolderEl);
                    bv.children.push(bv2);
                    await makeBlockAndChildrenIfExist(bv2);
                }
            }
        }*/
        if(p.pageTitle !== undefined){
            
            this.titleEl = STATIC.pageView_Title as HTMLInputElement;
            STATIC.pageView_Title.style.display = "inline-block"; // show title input if page has a title.            
            
            this.titleEl.value = p.pageTitle;
            let changeEv = async (e:Event)=>{
                if(p.pageTitle == this.titleEl!.value) return; // no change.
                p.pageTitle = this.titleEl!.value;
                console.log("Page title changed to:", p.pageTitle);
                p.DIRTY();
                this.setDocumentURI();
            };
            this.titleEl.oninput = changeEv;
            this.titleEl.onchange = changeEv;
            this.titleEl.onblur = changeEv;
        }else{
            this.titleEl = null;
            STATIC.pageView_Title.style.display = "none"; // hide title input if no title.
        }

        this.renderChildren();
    }
    updateBlocksById(id:Id, action:null/*unknown*/|'deleted'|'edited'=null){
        //TODO("Iterisi sve otvorene children. Podrzi deleted.");
        /*
        function updateBlockView(bv:Block_Visual){
            if(bv.blockId != id) return;
            bv.updateAll();
        }
        this.children.forEach(c=>updateBlockView(c));
        */
    }
};