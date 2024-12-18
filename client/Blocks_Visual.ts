//import {b} from "./BLOCKS.ts";
declare var TinyMDE : any;
declare var LEEJS : any;
type TMDE_InputEvent = {content:string,lines:string[]};

let TODO = ()=>{throw new Error("[TODO]");};

let selected_block :Block_Visual|null = null;
let inTextEditMode = false;

let el_to_BlockVis = new WeakMap<HTMLElement,Block_Visual>();


let ACT /*"Actions"*/ = {
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
let STATIC = {
    style_highlighter : document.getElementById('highlighterStyle')!,
    blocks : document.getElementById('blocks')!,
};

function propagateUpToBlock(el,checkSelf=true):Block_Visual|null{
    let atr = null;
    if(checkSelf) if((atr = el.getAttribute("data-b-id"))) return el_to_BlockVis.get(el)!;
    while(el!=STATIC.blocks && el!=document.body){
        el = el.parentNode;
        if((atr = el.getAttribute("data-b-id"))) return el_to_BlockVis.get(el)!;
    }
    return null;

}
function updateSelectionVisual(){
    STATIC.style_highlighter.innerHTML = `div[data-b-id="${selected_block!.block.id}"]{\
    background-color: red !important;\
    padding-left: 0px;\
    border-left: 4px solid #555555 !important;\
    }`;
}

function selectBlock(b:Block_Visual,editText:boolean|null=null){
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

const SHIFT_FOCUS = {
    firstChild:0,
    parent:1,
    above:2, //allows jumping to children
    below:3, //allows jumping to children
    above_notOut:4,
    below_notOut:5,
}
function ShiftFocus(block:Block_Visual, shiftFocus:number /*SHIFT_FOCUS*/, skipCollapsed=true){
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
function NewBlockAfter(afterThisBlock:Block_Visual){
    const b = afterThisBlock; //alias

    let h = b.el!.parentElement!; //parent node
    let block = new Block("").makeVisual(h);
    
    let next = b.el!.nextSibling;
    if(next!=null)
        h.insertBefore(block.el!, next);
    
    selectBlock(block,inTextEditMode);

    return block;
}
function NewBlockInside(afterThisBlock:Block_Visual){
    const b = afterThisBlock; //alias

    let h = b.el!;//.parentElement!; //parent node
    let block = new Block("").makeVisual(h);
    
    afterThisBlock.block.children.push(block.block.id);

    afterThisBlock.childrenHolderEl.appendChild(block.el);
    afterThisBlock.children.push(block);

    /*
    let next = b.el!.nextSibling;
    if(next!=null)
        h.insertBefore(block.el!, next);
    */
    selectBlock(block,inTextEditMode);

    return block;
}
function DeleteBlockVisual(blockVis:Block_Visual,delete_list:Id[]|null=null){
    function DeleteBlock(block:Block,delete_list:Id[]){
        if((--block.refCount)==0)
            delete_list.push(block.id);
        for(let i=0,l=block.children.length;i<l;i++)
            DeleteBlock(BLOCKS[block.children[i]]!,delete_list);
    }
    if(delete_list===null){
        blockVis.el.parentNode?.removeChild(blockVis.el!);
        delete_list = [];
    }
    DeleteBlock(blockVis.block,delete_list);
    DeleteBlocks_unsafe(delete_list);
}