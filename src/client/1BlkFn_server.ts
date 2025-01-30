//let $CL = typeof($IS_CLIENT$)!==undefined; // true for client, false on server
/*
let $$$CL_ret ->  call fn and return its return (do nothing)
let $$$CL_clone -> call fn, copy function body (rename BLOCK to _BLOCK etc.)
let $$$CL_diff -> call fn, apply returned diff
let $$$CL_local -> copy the function body, insert rpc call into $CL_rpc if exists.
$$$CL_rpc -> insert the "awake rpc(..)" call here

## why like this? 
Well i dont want the server to return a Diff for everything ($CL_diff)
- if i hold only 1 block why should i care about 99 other blocks in diff, and i dont want the server to have to hold "which blocks does each client hold"
I can also run the code locally too ($CL_clone)
- but thats error prone if i change code on server but forget on client

So if i have this build-time way of saying "clone this fn, diff this fn" then i get all benefits.
*/

const BlkFn = {
    // DeleteBlocks_unsafe(ids:Id[]):boolean{
    //     /*
    //     delete blocks without checking refCount (if referenced from other blocks)
    //     */
    //     for(let i=0,l=ids.length;i<l;i++){
    //         if(PAGES[ids[i]]) delete PAGES[ids[i]];
    //         delete BLOCKS[ids[i]];
    //     }
    //     return true;
    // },
    async RemoveTagFromBlock(blockId:Id,tagId:Id){ 
        const t = await TAGS(tagId);
        t.blocks.splice(t.blocks.indexOf(blockId),1); //remove block from tag
        t.DIRTY();
        const b = await BLOCKS(blockId);
        b.tags.splice(b.tags.indexOf(tagId),1); //remove tag from block
        b.DIRTY();
    },
    async RemoveAllTagsFromBlock(blockId:Id){  ////let $$$CL_clone;
        const b = await BLOCKS(blockId);          ////if($CL&&!b)return;
        for(let i = 0; i<b.tags.length; i++){
            const t = await TAGS(b.tags[i]);          ////if($CL&&!t)continue;
            t.blocks.splice(t.blocks.indexOf(blockId),1); //remove block from tag
            t.DIRTY();
        }
        b.tags = [];//    b.tags.splice(b.tags.indexOf(tagId),1); //remove tag from block
        b.DIRTY();
    },
    async DeleteBlockOnce(id:Id){  ////let $$$CL_diff;
        const b = await BLOCKS(id);
        b.DIRTY();
        if(--(b.refCount)>0) return;// false; //not getting fully deleted
        //deleting block.
        for(let i = 0; i<b.children.length;i++)
            await this.DeleteBlockOnce(b.children[i]);
        await this.RemoveAllTagsFromBlock(id);
        if(PAGES[id]) delete PAGES[id];
        DIRTY.mark("PAGES",id,undefined);

        // _BLOCKS[id].DIRTY_deleted();
        delete _BLOCKS[id];
        Block.DIRTY_deletedS(id);
        TODO("Delete BLOCKS and PAGES on server");
        return;// true; //got fully deleted
    },
    async DeleteBlockEverywhere(id:Id){  ////let $$$CL_diff;
        const b = await BLOCKS(id);
        b.refCount=0;
        for(let i = 0; i<b.children.length;i++)
            await this.DeleteBlockOnce(b.children[i]);
        await this.RemoveAllTagsFromBlock(id);
        if(PAGES[id]) delete PAGES[id];
        DIRTY.mark("PAGES",id,undefined);
        delete _BLOCKS[id];
        Block.DIRTY_deletedS(id);
        // Search all blocks and all tags. Remove self from children.
        
        let allBlocks = Object.keys(_BLOCKS);
        for(let i = 0; i<allBlocks.length;i++){
            const b2 = await BLOCKS(allBlocks[i]);
            b2.children = b2.children.filter((x:any)=>(x!=id));
            b2.DIRTY();
            WARN("We arent modifying array in-place (for performance), caller may hold old reference");
            /*
            let oc = b2.children;
            let nc = oc.filter((x:any)=>(x!=id));
            if(nc.length != oc.length){
                oc.splice(0,oc.length,...nc);    // in-place set new array values
            }*/
        }
        
        let allTags = Object.keys(_TAGS);
        for(let i = 0; i<allTags.length;i++){
            const t2 = await TAGS(allTags[i]);
            t2.blocks = t2.blocks.filter((x:any)=>(x!=id));
            t2.DIRTY();
            WARN("We arent modifying array in-place (for performance), caller may hold old reference");
        }
    },
    async InsertBlockChild(parent:Id, child:Id, index:number )/*:Id[]*/{  ////let $$$CL_clone;
        const p = await BLOCKS(parent);                 ////if($CL&&!p)return;
        const l = p.children;
        if(index >= l.length){
            l.push(child);
        }else{
            l.splice(index,0,child);
        }
        p.DIRTY();
        // return l;
    },
    async SearchPages(title:string,mode:'exact'|'startsWith'|'includes'='exact'):Promise<Id[]>{  ////let $$$CL_ret;
        let pages = await Promise.all(Object.keys(PAGES).map(async k=>(await BLOCKS(k))));
        if(mode=='exact'){
            return pages.filter(p=>p.pageTitle == title).map(p=>p.id);
        }else if(mode=='startsWith'){
            return pages.filter(p=>p.pageTitle?.startsWith(title)).map(p=>p.id);
        }else if(mode=='includes'){
            return pages.filter(p=>p.pageTitle?.includes(title)).map(p=>p.id);
        }
        return [];
    },
    async SearchTags(title:string,mode:'exact'|'startsWith'|'includes'='exact'):Promise<Id[]>{  //let $$$CL_ret;
        let pages = await Promise.all(Object.keys(_TAGS).map(async k => await TAGS(k)));//Object.values(TAGS);//.map(k=>BLOCKS[k]);
        if(mode=='exact'){
            return pages.filter(p=>p.name == title).map(p=>p.id);
        }else if(mode=='startsWith'){
            return pages.filter(p=>p.name?.startsWith(title)).map(p=>p.id);
        }else if(mode=='includes'){
            return pages.filter(p=>p.name?.includes(title)).map(p=>p.id);
        }
        return [];
    },
    async HasTagBlock(tagId:Id,blockId:Id/*,  $CL=false*/):Promise<boolean>{  //let $$$CL_local;
        //if(!$CL) return TAGS[tagId].blocks.indexOf(blockId)!=-1;
        //if($CL){
            if(_TAGS[tagId]) return _TAGS[tagId].blocks.indexOf(blockId)!=-1;
            if(_BLOCKS[blockId]) return _BLOCKS[blockId].tags.indexOf(tagId)!=-1;
            return (await TAGS(tagId)).blocks.indexOf(blockId)!=-1;
            //return $$$CL_rpc;
        //}
    },
    async TagBlock(tagId:Id,blockId:Id)/*:boolean*/{  //let $$$CL_clone;
        if(await this.HasTagBlock(tagId,blockId/*, $CL*/)) return;// false;
        (await TAGS(tagId)).blocks.push(blockId);
        _TAGS[tagId]!.DIRTY();
        (await BLOCKS(blockId)).tags.push(tagId);
        _BLOCKS[blockId]!.DIRTY();
        // return true;
    },
    async RemoveTagBlock(tagId:Id,blockId:Id)/*:boolean*/{   //let $$$CL_clone;
        if(await this.HasTagBlock(tagId,blockId/*, $CL*/) == false) return;// false;
        (await TAGS(tagId)).blocks.splice(_TAGS[tagId]!.blocks.indexOf(blockId),1);
        (await BLOCKS(blockId)).tags.splice(_BLOCKS[blockId]!.tags.indexOf(tagId),1);
        _TAGS[tagId]!.DIRTY();
        _BLOCKS[blockId]!.DIRTY();
        // return true;
    },

}