interface IView {

};

contextmenuHandlers['page']=(()=>[
    ["Backup",()=>{
        alert("AYO");
    }] as const
]);
document.body.setAttribute('data-contextmenu','page');

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

        if(selected_block != null){
            if(editText || (editText===null && inTextEditMode)){
                inTextEditMode = true;    
                selected_block!.focus(inTextEditMode);
            }else{
                inTextEditMode = false;
                selected_block!.focus(inTextEditMode);
            }
        }
        updateSelectionVisual();
        resolve(null);
    },2)));
}
