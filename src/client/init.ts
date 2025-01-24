
setTimeout(
(async function InitialOpen(){ //ask user to open some page (or make a page if none exist)
    await LoadInitial();
    if(Object.keys(PAGES).length==0){
        let pageName = prompt("No pages exist. Enter a new page name:");// || "";
        if(pageName == null){
            window.location.reload();
            return;
        }
        let p = await Block.newPage(pageName);
        await view.openPage(p.id);
    }else{
        let pageName = prompt("No page open. Enter page name (must be exact):");// || "";
        let srch;

        //[TODO] use searcher, not this prompt.
        if(pageName == null || (srch=await BlkFn.SearchPages(pageName,'includes')).length < 1){
            window.location.reload();
            return;
        }

        await view.openPage(srch[0]);
    }
}),
1);