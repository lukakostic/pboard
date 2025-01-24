/*
User is viewing a single page.
*/

class Page_Visual{
    pageId : Id;
    children : Block_Visual[];
    childrenHolderEl:HTMLElement;
    
    constructor(){
        this.pageId = "";
        this.children = [];

        this.childrenHolderEl = null as any;
    }
    page():Block{
        return _BLOCKS[this.pageId]!;
    }
    async openPage(newPageId:Id){
        this.childrenHolderEl = STATIC.blocks;
        await loadBlock(newPageId,3);
        this.pageId = newPageId;
        this.children = [];
        
        await CheckAndHandle_PageNoBlocks();
        this.render();
    }
    render(){
        const p = this.page();
        this.children = [];
        document.title = p.pageTitle;
        this.childrenHolderEl.innerHTML = ""; // clear
        function makeBlockAndChildrenIfExist(bv:Block_Visual){
            //bv already exists and is created. Now we need to create visuals for its children (and theirs).
            //create block_visuals for children of bv, and repeat this for them recursively
            let b = bv.block;
            bv.children = [];
            for(let i = 0; i<b.children.length; i++){
                if(_BLOCKS[b.children[i]]===undefined) continue; // skip not yet loaded. [TODO] add a button to load more.
                let b2 = _BLOCKS[b.children[i]]!;
                let bv2 = b2.makeVisual(bv.childrenHolderEl);
                bv.children.push(bv2);
                makeBlockAndChildrenIfExist(bv2);
            }
        }
        for(let i = 0; i<p.children.length; i++){
            let b = _BLOCKS[p.children[i]]!;
            let bv = b.makeVisual(this.childrenHolderEl);
            this.children.push(bv);
            makeBlockAndChildrenIfExist(bv);
        }
    }
};