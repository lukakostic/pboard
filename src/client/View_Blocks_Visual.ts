/// <reference lib="dom" />

import { Block } from "./Blocks.ts";
import { ACT, DeleteBlockVisual, el_to_BlockVis, inTextEditMode,TinyMDE, LEEJS, NewBlockAfter, NewBlockInside, propagateUpToBlock, selectBlock, selected_block, SHIFT_FOCUS, ShiftFocus, STATIC, TMDE_InputEvent, view } from "./View.ts";


STATIC.blocks.addEventListener('keydown',async (e:KeyboardEvent)=>{
    if(ACT.isEvHandled(e)) return;
    ACT.setEvHandled(e);
    // console.log(e);

    let cancelEvent = true;
    
    // [TODO] if(e.ctrlKey)  then move around a block (indent,unindent , collapse,expand)
    if(e.key == 'ArrowUp'){
        if(selected_block) 
            ShiftFocus(selected_block, e.shiftKey?SHIFT_FOCUS.above_notOut:SHIFT_FOCUS.above);
    }else if(e.key == 'ArrowLeft'){
        if(selected_block){
            ShiftFocus(selected_block, SHIFT_FOCUS.parent);
            // ShiftFocus(selected_block, SHIFT_FOCUS.above_notOut);
        }
    }else if(e.key == 'ArrowRight'){
        if(selected_block){
            ShiftFocus(selected_block, SHIFT_FOCUS.parent);
            ShiftFocus(selected_block, SHIFT_FOCUS.below_notOut);
        }
    }else if(e.key == 'ArrowDown'){
        if(selected_block) 
            ShiftFocus(selected_block, e.shiftKey?SHIFT_FOCUS.below_notOut:SHIFT_FOCUS.below);
    }else if(e.key=='Tab'){
        if(selected_block){
            ShiftFocus(selected_block,e.shiftKey?SHIFT_FOCUS.above:SHIFT_FOCUS.below);
        }
    }else if(e.key=='Enter'){
        if(e.shiftKey){
            if(selected_block)
                NewBlockInside(selected_block);
        }
        else if(e.ctrlKey){
            if(selected_block)
                selectBlock( await NewBlockAfter(selected_block) ,true);
        }
        else if(selected_block && !inTextEditMode){
            selectBlock(selected_block,true);
        }
        //console.log(e);
    }else if(e.key=='Delete'){
        DeleteBlockVisual(selected_block!);   
    }else if(e.key=='Space'){
        throw new Error("[TODO] open options");   
    }else{
        cancelEvent = false;
    }

    if(cancelEvent){e.preventDefault();e.stopPropagation();}

    // console.log("BLOCKS:",e);
});


export class Block_Visual{
    block:Block;
    children:Block_Visual[];
    
    collapsed : boolean;

    // html elements:
    el:HTMLElement;  //block element
    editor:any;  //editor inside block
    childrenHolderEl:HTMLElement;

    constructor(b:Block,parentElement?:HTMLElement){
        this.block = b;
        this.children = [];
        this.collapsed = false;
        
        this.el = LEEJS.div({
            class:"block",
            $bind:b, $bindEvents:b, "data-b-id":b.id, 
            tabindex:0,
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

        this.el.addEventListener('focus',(ev:FocusEvent)=>{
            if(ACT.isEvHandled(ev)) return;
            ACT.setEvHandled(ev);
            selectBlock(this);
        });
        this.editor.e.addEventListener('focus',(ev:FocusEvent)=>{
            if(ACT.isEvHandled(ev)) return;
            ACT.setEvHandled(ev);
            selectBlock(this);
        });
        this.editor.e.addEventListener('click',(ev:MouseEvent)=>{
            if(ACT.isEvHandled(ev)) return;
            ACT.setEvHandled(ev);

            //console.log("click e");
            let c = ACT.fn_OnClicked(this.editor.e);
            if(c==ACT.DOUBLE_CLICK)
                selectBlock(this,true);
            else
                selectBlock(this);
        });
        this.editor.addEventListener('input',(ev:TMDE_InputEvent)=>{
            //let {content_str,linesDirty_BoolArray} = ev;
            b.text = ev.content;//content_str;
        });
        this.editor.e.addEventListener('keydown',(e:KeyboardEvent)=>{
            if(ACT.isEvHandled(e)) return;
            ACT.setEvHandled(e);

            // console.log(e);
            let cancelEvent = true;
            if(e.key == 'Escape'){
                selectBlock(this,false);
            }else if(e.key=='Tab'){
                ShiftFocus(this, e.shiftKey?SHIFT_FOCUS.above:SHIFT_FOCUS.below);
            }else if(e.key=='Enter'){
                if(e.ctrlKey){ //insert new block below current block
                    NewBlockAfter(this);
                }
                else if(e.shiftKey){
                    NewBlockInside(this);
                    // e.shiftKey = false;
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // var keyboardEvent = new KeyboardEvent('keydown',{
                    //     key:"Enter",

                    //     // 'keydown', // event type: keydown, keyup, keypress
                    //     // true, // bubbles
                    //     // true, // cancelable
                    //     // window, // view: should be window
                    //     // false, // ctrlKey
                    //     // false, // altKey
                    //     // false, // shiftKey
                    //     // false, // metaKey
                    //     // 13, // keyCode: unsigned long - the virtual key code, else 0
                    //     // 0,
                    // });


                    // var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? 'initKeyboardEvent' : 'initKeyEvent';
                    // keyboardEvent[initMethod](
                    // 'keydown', // event type: keydown, keyup, keypress
                    // true, // bubbles
                    // true, // cancelable
                    // window, // view: should be window
                    // false, // ctrlKey
                    // false, // altKey
                    // false, // shiftKey
                    // false, // metaKey
                    // 13, // keyCode: unsigned long - the virtual key code, else 0
                    // 0, // charCode: unsigned long - the Unicode character associated with the depressed key, else 0
                    // );
                    
                    //e.target.dispatchEvent(keyboardEvent);
                }else{
                    cancelEvent = false;
                }

            }else{
                cancelEvent = false;
            }
            if(cancelEvent)
                {e.preventDefault();e.stopPropagation();}
        });
    }
    parent():Block_Visual|null{
        return propagateUpToBlock( this.el.parentElement! );
    }
    index():number{
        let p = this.parent();
        if(p) return p.children.indexOf(this);
        return view!.children.indexOf(this);
    }
    collapseTogle(setValue:boolean|null=null){
        if(setValue!==null) this.collapsed = setValue;
        else this.collapsed = !this.collapsed;

        if(this.collapsed)
            this.childrenHolderEl.style.display = "none";
        if(this.collapsed)
            this.childrenHolderEl.style.display = "auto";
    }
}
