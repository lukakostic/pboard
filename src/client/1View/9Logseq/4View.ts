/// <reference lib="dom" />


//import {b} from "./BLOCKS.ts";
//declare var TinyMDE : any;
declare var LEEJS : any;
type TMDE_InputEvent = {content:string,lines:string[]};

let view :Page_Visual = new Page_Visual();

let selected_block :Block_Visual|null = null;
let inTextEditMode = false;


var el_to_BlockVis = {_: new WeakMap<HTMLElement,Block_Visual>(),
    get(key:HTMLElement , allowNull = false){
        let r = this._.get(key) ?? null;
        if(!allowNull) assert_non_null(key,"key");
        return r;
    },
    set(key:HTMLElement,value:Block_Visual){
        assert_non_null(key,"key"); assert_non_null(value,"value");
        this._.set(key,value);
    },
    delete(key:HTMLElement){
        assert_non_null(this._.has(key),"[Deleting nonexistent htmlElement key]");
        this._.delete(key);
    }
}
const ACT /*"Actions"*/ = {
    //double click handling (since if i blur an element it wont register dbclick)
    lastElClicked : null as HTMLElement|null,
    clickTimestamp: 0      as number,
    // consts:
        DOUBLE_CLICK:2,
        SINGLE_CLICK:1,
    fn_OnClicked(el :HTMLElement){
        let sameClicked = (this.lastElClicked==el);
        this.lastElClicked = el;
        let t = (new Date()).getTime();
        let dt = t-this.clickTimestamp;
        this.clickTimestamp = t;
        if(dt<340 && sameClicked){ //double or single click
            return this.DOUBLE_CLICK;
        }
        return this.SINGLE_CLICK;
    },

    // marking already handled events when they bubble
    // __handledEvents : new Array<Event>(10),  //set of already handled events.
    // __handledEvents_circularIdx : 0    as number, // it wraps around so handledEvents is a circular buffer
    
    // new events get added like so:  handledEvents[circIdx=(++circIdx %n)]=ev;  so it can keep at most n last events.
    setEvHandled(ev:Event){
        // this.__handledEvents[
        //     this.__handledEvents_circularIdx=( ++this.__handledEvents_circularIdx %this.__handledEvents.length)
        // ] = ev;
        (ev as any).handled_already = true;
    },
    isEvHandled(ev:Event){
        return (ev as any).handled_already;// || (this.__handledEvents.indexOf(ev)!==-1);
    }

};
const STATIC = {
    _body : document.body,
    style_highlighter : document.getElementById('highlighterStyle')!,
    blocks : document.getElementById('blocks')!,
    pageView : document.getElementById('pageView')!,
    pageView_Title : document.getElementById('pageView-title')!,
};

function propagateUpToBlock(el:HTMLElement,checkSelf=true):Block_Visual|null{
    // ovo bi moglo putem el.closest(query) umesto da rucno idem parentElement

    if(checkSelf && el.hasAttribute("data-b-id"))
        return assert_non_null(el_to_BlockVis.get(el) , "el->bv",DEBUG);
    
    while(el!=STATIC.blocks && el!=document.body){
        el = el.parentElement!;
        if(el && el.hasAttribute("data-b-id"))
            return assert_non_null(el_to_BlockVis.get(el) , "el->bv",DEBUG);
    }
    return null;

}
function updateSelectionVisual(){
    if(selected_block==null){
        STATIC.style_highlighter.innerHTML = "";
        return;
    }
    STATIC.style_highlighter.innerHTML = `div[data-b-id="${selected_block!.blockId}"]{\
    background-color: var(--block-bg-selected-color) !important;\
    /* padding-left: 0px; */\
    /*border-left: 8px solid #555555 !important;*/\
    }
    div[data-b-id="${selected_block!.blockId}"]>div.editor.TinyMDE{\
    background-color: var(--block-editor-bg-selected-color) !important;\
    }`
    +(inTextEditMode?
    `
    div[data-b-id="${selected_block!.blockId}"]>div[role="toolbar"]{
        display:contents; /*ili block*/
    }
    `:"");
}


/**
 * If page has 0 blocks, make one automatically.
 * we dont want pages without blocks.
 */
async function CheckAndHandle_PageNoBlocks(){
    if(view.pageId == "") return;
    let p = (await BLOCKS(view.pageId));
    if(p.children.length>0)return;
    console.log("CheckAndHandle_PageNoBlocks",view.pageId);
    NewBlockInside(null);
}


// LEEJS.shared()("#pageView"); //not really needed
/*
l.$E(
    l.shared(),
    l.p(`Test`),
    l.button({onclick:"mojaFN()"},"KLIKNIME"),
)("#pageView"); //hostElement, write function
//(null,"write") //hostElement, write function
*/

const SHIFT_FOCUS = {
    firstChild:0,
    parent:1,
    above:2, //allows jumping to children
    below:3, //allows jumping to children
    above_notOut:4,
    below_notOut:5,
}
async function ShiftFocus(bv:Block_Visual, shiftFocus:number /*SHIFT_FOCUS*/, skipCollapsed=true){
    if(bv == null) throw Error("No selection shift focus.");

    function bv_above_sameLevel(bv:Block_Visual) : Block_Visual|null {
        assert_non_null(bv);
        /* Ako smo PRVO dete vracamo null (nobody above us) */
        const i = bv.index();
        if(i == 0) return null;
        return (bv.parentChildrenArray())[i-1];
    }
    function bv_below_sameLevel(bv:Block_Visual) : Block_Visual|null {
        assert_non_null(bv);
        /* Ako smo ZADNJE dete vracamo null (nobody below us) */
        const i = bv.index();
        const arr = bv.parentChildrenArray();
        // console.error(i,arr);
        if(i >= (arr.length-1)) return null;
        return (arr)[i+1];
        
    }
    function bv_lowestChild_allLevels(bv:Block_Visual) : Block_Visual|null{
        assert_non_null(bv);
        /*
        A       <-- bv
        .. B
        .. .. H
        .. .. C
        .. .. .. S
        .. J
        .. .. L
        .. .. M     <-- return this
        */
        if(bv.collapsed || bv.children.length==0) return bv;  /* bv nema decu te je on lowest. */
        const lastChild = bv.lastChild();
        if(!lastChild) return null;
        return bv_lowestChild_allLevels(lastChild);
    }
    function bv_above_anyLevel(bv:Block_Visual) : Block_Visual|null {
        assert_non_null(bv);
        /* Iznad nas moze biti bilo ko. To zavisi dal je na nekom levelu neko iznad nas collapsed ili expanded:
        A
        .. B
        .. .. C    <-- return this
        G          <-- we are here
        
        Primecujemo da je A an istom nivou kao i G.
        dakle trebamo naci above us na nasem nivou.
        ako nema, idemo na naseg parenta i ponavljamo proces.
        */
       let above_sameLvl = bv_above_sameLevel(bv);
       
       return( (above_sameLvl == null) ?
            //nobody above us on same level. Therefore only our parent is above us (if they exist, else we are topmost of the whole page so return null anyways).
            (bv.parent()) :
            // ovaj iznad nas je ill collapsed (te nam treba on, a funkcije hendluje to), il ima (nested potencijalno) decu. Nama treba najnize dete cele hiearhije.
            (bv_lowestChild_allLevels(above_sameLvl)) );

    }
    function bv_below_anyLevel(bv:Block_Visual) : Block_Visual|null {
        assert_non_null(bv);
        /*
        // main trivial case : we have children
        A
        .. B
        .. .. C     <-- we are here
        .. .. ..  G        <-- return this

        // second trivial case: below us on same level
        A
        .. B
        .. .. C     <-- we are here
        .. .. G        <-- return this

        // non trivial:
        
        A
        .. B
        .. .. C     <-- we are here
        .. G        <-- return this
        
        or (arbitrarily deeper depth)

        A
        .. B
        .. .. C     <-- we are here
        G           <-- return this
        
        
        znaci odemo na naseg parenta.
        vratimo ako postoji neko below naseg parenta na istom nivou (njegovom).

        ponovimo proces.
        na kraju il returnujemo il je parent==null
        */

        // main trivial case : we have children therefore below us is our first child.
        if(bv.collapsed==false && bv.children.length>0)
            return bv.firstChild();

        // second trivial case:  there is someone below us on our level
        const below_sameLvl = bv_below_sameLevel(bv);
        if(below_sameLvl) return below_sameLvl;

        // No more trivial cases. We must go to our parent.
        while(true){
            const bv_par = bv.parent();
            if(bv_par==null) return null;  // if parent is null then we are on page root, and last on page (otherwise we would have had below_sameLevel). so nobody below us.
            const parent_below_sameLvl = bv_below_sameLevel(bv_par);
            if(parent_below_sameLvl)
                return parent_below_sameLvl;
            bv=bv_par;
            //repeat.
        }
    }


    //if skipCollapsed, then it wont go into children of collapsed blocks (not visible).
    let focusElement = null as Block_Visual|null;
    if(shiftFocus == SHIFT_FOCUS.above_notOut){
        focusElement = bv_above_sameLevel(bv);
    }else if(shiftFocus == SHIFT_FOCUS.below_notOut){
        focusElement = bv_below_sameLevel(bv);
    }else if(shiftFocus == SHIFT_FOCUS.above){
        focusElement = bv_above_anyLevel(bv);    
    }else if(shiftFocus == SHIFT_FOCUS.below){
        focusElement = bv_below_anyLevel(bv);
    }else if(shiftFocus == SHIFT_FOCUS.firstChild){
        focusElement = bv.firstChild();
    }else if(shiftFocus == SHIFT_FOCUS.parent){ //throw new Error("[TODO]");
        focusElement = bv.parent();
    }else throw new Error("shiftFocus value must be one of/from SHIFT_FOCUS const object.")
    
    //console.log("BV SSSS",focusElement);
    if(focusElement){
        await selectBlock(focusElement);
        // FocusElement(focusElement.el);
        // updateSelectionVisual();
        return focusElement;
    }
    return null;
}

async function NewBlockAfter(thisBlock:Block_Visual){
    let parentBlockVis = thisBlock.parentOrPage(); //Get parent or Page of view / window.
    let parentBlock = parentBlockVis.id();
    let parentHolder = parentBlockVis.childrenHolderEl;

    const idx = thisBlock.index()+1;

    let blockVis = await (await Block.new("")).makeVisual(parentHolder);
    await BlkFn.InsertBlockChild(parentBlock,blockVis.blockId,idx);
    parentBlockVis.appendChild(blockVis,idx);
    
    selectBlock(blockVis,inTextEditMode);
    view!.updateBlocksById(parentBlock);
    return blockVis;
}
async function NewBlockInside(thisBlockVis:Block_Visual|Page_Visual|null , idx=-1){
    console.log("NewBlockInside",thisBlockVis,idx);
    if(thisBlockVis==null) thisBlockVis = view!;
    let parentBlock = thisBlockVis.id();
    let parentHolder = thisBlockVis.childrenHolderEl;

    let blockVis = await (await Block.new("")).makeVisual(parentHolder);
    await BlkFn.InsertBlockChild(parentBlock,blockVis.blockId,idx);
    thisBlockVis.appendChild(blockVis,idx);
    
    selectBlock(blockVis,inTextEditMode);
    view!.updateBlocksById(parentBlock);
    return blockVis;
}
// async function NewBlockInsidePage(){
//     // let h = view.el!;//.parentElement!; //parent node
//     let blockVis = await (await Block.new("")).makeVisual();
//     await BlkFn.InsertBlockChild(view.pageId,blockVis.blockId, (await BLOCKS(view.pageId)).children.length); //as last
    
//     // thisBlock.block.children.push(blockVis.block.id);

//     view.childrenHolderEl.appendChild(blockVis.el);
//     view.children.push(blockVis);

//     selectBlock(blockVis,inTextEditMode);
//     return blockVis;
// }

STATIC._body.addEventListener('click',(e:MouseEvent)=>{
    if(!(e.target) || propagateUpToBlock(e.target as HTMLElement) == null){
        if(e.target.closest(".doesnt-cancel-selection")!== null) return; // if clicked on something that should not cancel selection, then do not cancel.
        selectBlock(null);
    }
});
STATIC._body.addEventListener('keydown',(e:KeyboardEvent)=>{
    if(e.key == 'F1'){// && e.ctrlKey){
        SEARCHER.toggleVisible();
        e.preventDefault();
        e.stopImmediatePropagation();
    }
});
STATIC.blocks.addEventListener('keydown',async (e:KeyboardEvent)=>{
    console.log("BLOCKS KEYDOWN11",e, ACT.isEvHandled(e));
    if(ACT.isEvHandled(e)) return;
    ACT.setEvHandled(e);
    console.log("BLOCKS KEYDOWN22",e);

    HELP.logCodeHint("Navigation","Listeners/handlers for navigation keys.");

    let cancelEvent = true;
    
    // [TODO] if(e.ctrlKey)  then move around a block (indent,unindent , collapse,expand)
    if(e.key == 'ArrowUp'){
        if(selected_block) 
            ShiftFocus(selected_block, e.shiftKey?SHIFT_FOCUS.above_notOut:SHIFT_FOCUS.above);
    }else if(e.key == 'ArrowDown'){
        if(selected_block) 
            ShiftFocus(selected_block, e.shiftKey?SHIFT_FOCUS.below_notOut:SHIFT_FOCUS.below);
    }else if(e.key == 'ArrowLeft'){
        if(selected_block){
            ShiftFocus(selected_block, SHIFT_FOCUS.parent);
            // ShiftFocus(selected_block, SHIFT_FOCUS.above_notOut);
        }
    }else if(e.key == 'ArrowRight'){
        if(selected_block){
            (async ()=>{
                console.log("Cur selected:",selected_block);
                await ShiftFocus(selected_block, SHIFT_FOCUS.parent);
                console.log("1 selected:",selected_block);
                await ShiftFocus(selected_block, SHIFT_FOCUS.below_notOut);
                console.log("2 selected:",selected_block);
            })();
        }
    }else if(e.key=='Tab'){
        if(selected_block){
            ShiftFocus(selected_block,e.shiftKey?SHIFT_FOCUS.above:SHIFT_FOCUS.below);
        }
    }else if(e.key == 'Escape'){
        console.log("ESCAPE view");
        selectBlock(null);
    }else if(e.key=='Enter'){

        if(selected_block){
            if(e.shiftKey){
                if(e.ctrlKey)
                    selectBlock( await NewBlockInside(selected_block.parentOrPage(),selected_block.index()) ,true);
                else
                    selectBlock(await NewBlockInside(selected_block), true);
            }
            else if(e.ctrlKey){
                selectBlock( await NewBlockAfter(selected_block) ,true);
            }
            else if(selected_block && !inTextEditMode){
                selectBlock(selected_block,true);
            }
        }
        //console.log(e);
    }else if(e.key=='Delete'){
        if(selected_block){
            //prepare things so we can later select a new element after deleting
            const parent = selected_block.parent();
            const parArr = selected_block.parentChildrenArray();
            const selfIdx = selected_block.index();

            //delete self
            selected_block.parentOrPage().deleteChild(selected_block);
            
            //select new element
            if(parArr.length == 0){
                selectBlock(parent);
            }else if(selfIdx>=parArr.length){
                selectBlock(parArr.at(-1)!);  // we were last so select last
            }else{
                selectBlock(parArr[selfIdx]);
            }
        }
    }else if(e.key==' '||e.key=='Space'){ // ' ' actually matches, 'Space' doesnt
        if(selected_block) 
            selected_block.collapseTogle();
    }else{
        cancelEvent = false;
    }

    if(cancelEvent){e.preventDefault();e.stopImmediatePropagation();}

    // console.log("BLOCKS:",e);
});


