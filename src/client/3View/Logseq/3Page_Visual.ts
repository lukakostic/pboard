/*
User is viewing a single page.
*/

class Page_Visual{
    pageId : Id;
    children : Block_Visual[];
    childrenHolderEl:HTMLElement;
    alreadyRendered : boolean;
    constructor(){
        this.pageId = "";
        this.children = [];
        this.alreadyRendered = false;

        this.childrenHolderEl = null as any;
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

        this.childrenHolderEl = STATIC.blocks;
        await loadBlock(newPageId,maxUncollapseDepth);
        this.pageId = newPageId;
        this.children = [];
        
        await CheckAndHandle_PageNoBlocks();
        await this.makePage(maxUncollapseDepth);
    }
    async makePage(maxUncollapseDepth=0){
        if(this.alreadyRendered) throw new Error("Page is being made again. Why?");
        this.alreadyRendered = true;

        const p = this.page();
        this.children = [];
        document.title = p.pageTitle ?? "";
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