interface IView {

};


async function selectBlock(b:Block_Visual|null,editText:boolean|null=null){
    // if(selected_block==b && editText===inTextEditMode) return;

    if(b===null){
        selected_block = null;
        if(document.activeElement)
            (document.activeElement! as HTMLElement).blur();
        //document.body.focus();
        inTextEditMode = false;
        updateSelectionVisual();
    return; }
    // if(b===null) return;
    // selectBlock(null);
    //let _prevSelection = selected_block;
    // console.error(document.activeElement,b,editText,inTextEditMode);
    
    //selected_block = b;
    // posto pri renderAll za Block_Visual mi obrisemo svu decu i rekreiramo, selekcija nam se gubi. Ali svi block-visual imaju unique id recimo. Tako da mozemo po tome selektovati.
    // mozda bolje da zapravo generisem unique block visual id umesto da se oslanjam na block id al jbg.
    const id = b.id();
    selected_block = null;

    await (new Promise(resolve => setTimeout(()=>{
        const foundSelectBlock = STATIC.pageView.querySelector(`div.block[data-b-id="${id}"]`) as HTMLElement;
        if(foundSelectBlock)
            selected_block = el_to_BlockVis.get(foundSelectBlock);
        else
            selected_block = null;

        if(editText || (editText===null && inTextEditMode)){
            inTextEditMode = true;
            if(document.activeElement != b.editor!.e){
                if(document.activeElement)
                    (document.activeElement! as HTMLElement).blur();    
                FocusElement(selected_block!.editor!.e);
            }
            // console.log('focusing e')
        }else{
            inTextEditMode = false;
            if(document.activeElement != b.el!){
                if(document.activeElement)
                    (document.activeElement! as HTMLElement).blur();
                FocusElement(selected_block!.el!);
            }
            // console.log('focusing el')
        }
        updateSelectionVisual();
    },2)));
}

function FocusElement(el:HTMLElement){
    // el.dispatchEvent(new FocusEvent("focus"));
    // console.error("FOCUSING ",el);
    el.focus();

    
}