
setTimeout((async function InitialOpen(){ //ask user to open some page (or make a page if none exist)
    await LoadInitial();

    autosaveInterval = setInterval(()=>{ //autosave timer 
        SaveAll();
        if(view.pageId) view.setDocumentURI();
    },5000);

    if(Object.keys(PAGES).length==0){
        let pageName = prompt("No pages exist. Enter a new page name:");// || "";
        if(pageName == null){
            window.location.reload();
            return;
        }
        let p = await Block.newPage(pageName);
        await view.openPage(p.id);
    }else{
        let loadedPageId = view.getDocumentURI();
        if(loadedPageId){
            await view.openPage(view.pageId);
        }else{
            let pages = (await BlkFn.SearchPages("","includes")).map(id=>"\n"+(_BLOCKS[id]?.pageTitle));
            let pageName = prompt("No page open. Enter page name (must be exact):"+pages);// || "";
            let srch;

            //[TODO] use searcher, not this prompt.
            if(pageName == null || (srch=(await BlkFn.SearchPages(pageName,'includes'))).length < 1){
                // console.error(srch);
                window.location.reload();
                return;
            }

            await view.openPage(srch[0]);
        }
    }
}),1);

