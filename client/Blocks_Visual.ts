/// <reference lib="dom" />

import { BlkFn, Block, PAGES } from "./Blocks.ts";
import { Block_Visual } from "./Blocks_Visual2.ts";
import { rpc} from "./client.ts"
import { View_Page } from "./View_Page.ts";

//import {b} from "./BLOCKS.ts";
export declare var TinyMDE : any;
export declare var LEEJS : any;
export type TMDE_InputEvent = {content:string,lines:string[]};

export let TODO = ()=>{throw new Error("[TODO]");};

export let view :View_Page|null;

export let selected_block :Block_Visual|null = null;
export let inTextEditMode = false;

export let el_to_BlockVis = new WeakMap<HTMLElement,Block_Visual>();

(async function InitialOpen(){ //ask user to open some page (or make a page if none exist)
    if(Object.keys(PAGES).length==0){
        let pageName = prompt("No pages exist. Enter a new page name:");// || "";
        if(pageName == null){
            window.location.reload();
            return;
        }
        let p = await Block.newPage(pageName);
        view = new View_Page(p.id);
        view.render();
    }else{
        let pageName = prompt("No page open. Enter page name (must be exact):");// || "";
        let srch;

        //[TODO] use searcher, not this prompt.
        if(pageName == null || (srch=await BlkFn.SearchPages(pageName,'includes')).length < 1){
            window.location.reload();
            return;
        }

        view = new View_Page(srch[0]);
        view.render();
    }
})();

export let ACT /*"Actions"*/ = {
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
    __handledEvents : new Array<Event>(10),  //set of already handled events.
    __handledEvents_circularIdx : 0    as number, // it wraps around so handledEvents is a circular buffer
    // new events get added like so:  handledEvents[circIdx=(++circIdx %n)]=ev;  so it can keep at most n last events.
    setEvHandled(ev:Event){
        this.__handledEvents[
            this.__handledEvents_circularIdx=( ++this.__handledEvents_circularIdx %this.__handledEvents.length)
        ] = ev;
    },
    isEvHandled(ev:Event){
        return this.__handledEvents.indexOf(ev)!==-1;
    }

};
export let STATIC = {
    style_highlighter : document.getElementById('highlighterStyle')!,
    blocks : document.getElementById('blocks')!,
};

export function propagateUpToBlock(el:HTMLElement,checkSelf=true):Block_Visual|null{
    let atr = null;
    if(checkSelf) if(el.hasAttribute("data-b-id")) return el_to_BlockVis.get(el)!;
    while(el!=STATIC.blocks && el!=document.body){
        el = el.parentElement!;
        if(el && el.hasAttribute("data-b-id")) return el_to_BlockVis.get(el)!;
    }
    return null;

}
export function updateSelectionVisual(){
    STATIC.style_highlighter.innerHTML = `div[data-b-id="${selected_block!.block.id}"]{\
    background-color: red !important;\
    padding-left: 0px;\
    border-left: 4px solid #555555 !important;\
    }`;
}

export function selectBlock(b:Block_Visual,editText:boolean|null=null){
    let _prevSelection = selected_block;

    selected_block = b;
    if(editText || (editText===null && inTextEditMode)){
        inTextEditMode = true;
        b.editor!.e.focus();
        // console.log('focusing e')
    }else{
        if(editText!==null) inTextEditMode = false;
        b.el!.focus();
        // console.log('focusing el')
    }
    updateSelectionVisual();
}


// LEEJS.shared()("#root"); //not really needed
/*
l.$E(
    l.shared(),
    l.p(`Test`),
    l.button({onclick:"mojaFN()"},"KLIKNIME"),
)("#root"); //hostElement, write function
//(null,"write") //hostElement, write function
*/

export const SHIFT_FOCUS = {
    firstChild:0,
    parent:1,
    above:2, //allows jumping to children
    below:3, //allows jumping to children
    above_notOut:4,
    below_notOut:5,
}
export function ShiftFocus(block:Block_Visual, shiftFocus:number /*SHIFT_FOCUS*/, skipCollapsed=true){
    //if skipCollapsed, then it wont go into children of collapsed blocks (not visible).
    let focusElement = null as Block_Visual|null|undefined;
    if(shiftFocus == SHIFT_FOCUS.above_notOut){
        focusElement = el_to_BlockVis.get(block.el!.previousElementSibling as HTMLElement);
    }else if(shiftFocus == SHIFT_FOCUS.below_notOut){
        focusElement = el_to_BlockVis.get(block.el!.nextElementSibling as HTMLElement);
    }else if(shiftFocus == SHIFT_FOCUS.above){
        // case 1: check siblings
        focusElement = el_to_BlockVis.get(block.el!.previousElementSibling as HTMLElement);
        if(focusElement){
            // ok we go to earlier sibling, but we need to go to last nested child since thats whats above us (child is below their parent)
            while(true){
                if(skipCollapsed && focusElement.collapsed) break;
                if(focusElement.children.length>0){
                    focusElement = focusElement!.children[focusElement!.children.length-1];
                }else{
                    break;
                }
            }
        }
        // case 2: no siblings earlier than us, go to parent
        if(!focusElement)
            focusElement = block.parent();
        
        //focusElement = propagateUpToBlock(block.el!.previousSibling,true);
    }else if(shiftFocus == SHIFT_FOCUS.below){
        // case 1: check siblings
        //focusElement = el_to_BlockVis.get(block.el!.nextElementSibling as HTMLElement);
        // case 2: no siblings after us, go to element below us
        if(!focusElement){
            /* What element is below us?
            {
                {
                    {
                        .. previous siblings ..
                        <-- we are here
                    }
                }
            }
            {}  <-- we need to jump to this

            so the algorithm is:
            keep going up (seeking parent)
            get index of parent (in parent's parent list of children)
            as long as parent is last, keep repeating

            once parent isnt last index, we jump to whatever is after parent.

            if we reach root (no parent) then we are last globally and no blocks are below us.
            */
            let p = block,pp:Block_Visual|null=null;
            do{
                pp = p.parent()!;
                if(pp){
                    let index = pp.children.indexOf(p);
                    if(index==-1) throw new Error("unexpected");
                    if(index != (pp.children.length-1)) //not last!
                    {
                        focusElement = pp.children[index+1];
                        break;
                    }
                }else{ //p is root.

                    break;
                }
                p = pp;

            }while(p=p.parent()!);

            focusElement = p!.children[0]!;
            
        }
            focusElement = block.parent();

        
        //focusElement = propagateUpToBlock(block.el!.nextSibling,true);
    }else if(shiftFocus == SHIFT_FOCUS.firstChild){// throw new Error("[TODO]");
        focusElement = block.children[0]!;
        //focusElement = block.el!.nextSibling!;
    }else if(shiftFocus == SHIFT_FOCUS.parent){ //throw new Error("[TODO]");
        focusElement = block.parent();
        //focusElement = block.el!.nextSibling!;
    }else throw new Error("shiftFocus value must be one of/from SHIFT_FOCUS const object.")
    
    if(focusElement){
        focusElement.el.dispatchEvent(new FocusEvent("focus"));
        return focusElement;
    }
    return null;
}

export async function NewBlockAfter(thisBlock:Block_Visual){
    let h = thisBlock.el!.parentElement!; //parent node
    let parentBlockVis = propagateUpToBlock(h); //Get parent or Page of view / window.
    let parentBlock = (parentBlockVis == null)? (view!.pageId) : (parentBlockVis.block.id);

    let thisBlockIdx = Array.from(h.children).indexOf(thisBlock.el!);
    if(thisBlockIdx<0)throw new Error("Could not determine new index.");
    let blockVis = (await Block.new("")).makeVisual(h);
    await BlkFn.InsertBlockChild(parentBlock,blockVis.block.id,thisBlockIdx+1);
    let next = thisBlock.el!.nextSibling;
    if(next!=null)
        h.insertBefore(blockVis.el!, next);
    
    selectBlock(blockVis,inTextEditMode);
    return blockVis;
}
export async function NewBlockInside(thisBlock:Block_Visual){
    let h = thisBlock.el!;//.parentElement!; //parent node
    let blockVis = (await Block.new("")).makeVisual(h);
    await BlkFn.InsertBlockChild(thisBlock.block.id,blockVis.block.id,thisBlock.block.children.length); //as last
    
    // thisBlock.block.children.push(blockVis.block.id);

    thisBlock.childrenHolderEl.appendChild(blockVis.el);
    thisBlock.children.push(blockVis);

    selectBlock(blockVis,inTextEditMode);
    return blockVis;
}

export async function DeleteBlockVisual(blockVis:Block_Visual,delete_list:Block_Visual[]|null=null){
    function DeleteBlock(block:Block_Visual){
        if((--block.block.refCount)==0)
            delete_list!.push(block);
        for(let i=0,l=block.children.length;i<l;i++)
            DeleteBlock(block.children[i]!);
    }
    if(delete_list===null){
        blockVis.el.parentNode?.removeChild(blockVis.el!);
        delete_list = [];
    }
    DeleteBlock(blockVis);

    for(let i = 0, il=delete_list.length;i<il;i++){
        let els = document.querySelectorAll(`div[data-id="${delete_list[i].block.id}"]`);
        for(let j=0,jl=els.length;j<jl;j++)
            els[j].parentNode?.removeChild(els[j]);
    }
    await BlkFn.DeleteBlocks_unsafe(delete_list.map(b=>b.block.id));   
}


