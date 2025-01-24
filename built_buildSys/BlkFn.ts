#!/usr/bin/env -S deno run --allow-all
/*
See BlkFn_server header for explanations.
We transform the server functions into client functions.
*/

/*
Read BlkFn_server.ts , use eval and regex magic.
*/

let $IS_CLIENT$ = true;
declare var BlkFn : any;

// CONTENTS OF BlkFn GO BELOW "(//)INSERT_HERE" !!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//INSERT_HERE
let $CL = typeof($IS_CLIENT$)!==undefined; // true for client, false on server
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
    async RemoveTagFromBlock(blockId:Id,tagId:Id){  let $$$CL_clone;
        const t = TAGS[tagId];          if($CL&&!t)return;
        t.blocks.splice(t.blocks.indexOf(blockId),1); //remove block from tag
        const b = BLOCKS[blockId];          if($CL&&!b)return;
        b.tags.splice(b.tags.indexOf(tagId),1); //remove tag from block
    },
    async RemoveAllTagsFromBlock(blockId:Id){  let $$$CL_clone;
        const b = BLOCKS[blockId];          if($CL&&!b)return;
        for(let i = 0; i<b.tags.length; i++){
            const t = TAGS[b.tags[i]];          if($CL&&!t)continue;
            t.blocks.splice(t.blocks.indexOf(blockId),1); //remove block from tag
        }
        b.tags = [];//    b.tags.splice(b.tags.indexOf(tagId),1); //remove tag from block
    },
    async DeleteBlockOnce(id:Id){  let $$$CL_diff;
        const b = BLOCKS[id];
        if(--(b.refCount)>0) return;// false; //not getting fully deleted
        //deleting block.
        for(let i = 0; i<b.children.length;i++)
            await this.DeleteBlockOnce(b.children[i]);
        await this.RemoveAllTagsFromBlock(id);
        if(PAGES[id]) delete PAGES[id];
        delete BLOCKS[id];
        return;// true; //got fully deleted
    },
    async DeleteBlockEverywhere(id:Id){  let $$$CL_diff;
        const b = BLOCKS[id];
        b.refCount=0;
        for(let i = 0; i<b.children.length;i++)
            await this.DeleteBlockOnce(b.children[i]);
        await this.RemoveAllTagsFromBlock(id);
        if(PAGES[id]) delete PAGES[id];
        delete BLOCKS[id];
        // Search all blocks and all tags. Remove self from children.
        
        let allBlocks = Object.keys(BLOCKS);
        for(let i = 0; i<allBlocks.length;i++){
            const b2 = BLOCKS[allBlocks[i]];
            b2.children = b2.children.filter((x:any)=>(x!=id));
            WARN("We arent modifying array in-place (for performance), caller may hold old reference");
            /*
            let oc = b2.children;
            let nc = oc.filter((x:any)=>(x!=id));
            if(nc.length != oc.length){
                oc.splice(0,oc.length,...nc);    // in-place set new array values
            }*/
        }
        
        let allTags = Object.keys(TAGS);
        for(let i = 0; i<allTags.length;i++){
            const t2 = TAGS[allTags[i]];
            t2.blocks = t2.blocks.filter((x:any)=>(x!=id));
            WARN("We arent modifying array in-place (for performance), caller may hold old reference");
        }
    },
    async InsertBlockChild(parent:Id, child:Id, index:number )/*:Id[]*/{  let $$$CL_clone;
        const p = BLOCKS[parent];                 if($CL&&!p)return;
        const l = p.children;
        if(index >= l.length){
            l.push(child);
        }else{
            l.splice(index,0,child);
        }
        // return l;
    },
    async SearchPages(title:string,mode:'exact'|'startsWith'|'includes'='exact'):Promise<Id[]>{  let $$$CL_ret;
        let pages = Object.keys(PAGES).map(k=>BLOCKS[k]);
        if(mode=='exact'){
            return pages.filter(p=>p.pageTitle == title).map(p=>p.id);
        }else if(mode=='startsWith'){
            return pages.filter(p=>p.pageTitle?.startsWith(title)).map(p=>p.id);
        }else if(mode=='includes'){
            return pages.filter(p=>p.pageTitle?.includes(title)).map(p=>p.id);
        }
        return [];
    },
    async SearchTags(title:string,mode:'exact'|'startsWith'|'includes'='exact'):Promise<Id[]>{  let $$$CL_ret;
        let pages = Object.values(TAGS);//.map(k=>BLOCKS[k]);
        if(mode=='exact'){
            return pages.filter(p=>p.name == title).map(p=>p.id);
        }else if(mode=='startsWith'){
            return pages.filter(p=>p.name?.startsWith(title)).map(p=>p.id);
        }else if(mode=='includes'){
            return pages.filter(p=>p.name?.includes(title)).map(p=>p.id);
        }
        return [];
    },
    async HasTagBlock(tagId:Id,blockId:Id,  $CL=false):Promise<boolean>{  let $$$CL_local;
        if(!$CL) return TAGS[tagId].blocks.indexOf(blockId)!=-1;
        if($CL){
            if(TAGS[tagId]) return TAGS[tagId].blocks.indexOf(blockId)!=-1;
            if(BLOCKS[blockId]) return BLOCKS[blockId].tags.indexOf(tagId)!=-1;
            return $$$CL_rpc;
        }
    },
    async TagBlock(tagId:Id,blockId:Id)/*:boolean*/{  let $$$CL_clone;
        if(await this.HasTagBlock(tagId,blockId, $CL)) return;// false;
        TAGS[tagId].blocks.push(blockId);
        BLOCKS[blockId].tags.push(tagId);
        // return true;
    },
    async RemoveTagBlock(tagId:Id,blockId:Id)/*:boolean*/{   let $$$CL_clone;
        if(await this.HasTagBlock(tagId,blockId, $CL) == false) return;// false;
        TAGS[tagId].blocks.splice(TAGS[tagId].blocks.indexOf(blockId),1);
        BLOCKS[blockId].tags.splice(BLOCKS[blockId].tags.indexOf(tagId),1);
        // return true;
    },

}
let fnTypes = {
    "clone":"let $$$CL_clone;",
    "ret":"let $$$CL_ret;",
    "diff":"let $$$CL_diff;",
    "local":"let $$$CL_local;",
};
let fnType_entrs = Object.entries(fnTypes);
let getType = (fnStr:string)=>{
    let matches = fnType_entrs.filter(t=>fnStr.includes(t[1])).map(t=>t[0]);
    return matches;
}

function parseFnArgs(str:string):[string[],number]|undefined{ // "fn(a:string,b,...c){...}" -> ['a','b','...c']
    let inArgs = false; // entered first '(' of args declaration fn(..args..)
    let args:string[] = [];
    let curArg = "";
    let endCur=()=>{
        curArg = curArg.trim();
        if(curArg!="")args.push(curArg);
        curArg = "";
    }
    // let argsEndIdx = -1; // ')' closing paren of arguments declaration
    // let args = ():string=>{
    //     let argsStr = str.substring(argsStartIdx+1,argsEndIdx); // (...) without ()
    //     let ar = argsStr.split(',');
    // }
    let level_curlyBrace = 0;
    let level_parentheses = 0;
    let level = 0; // total level (added)
    let inTypeDecl = false;  // ' arg : type '
    for(let i = 0; i<str.length;i++){
        if(str[i]=='/'&&str[i+1]=='/'){ // '//' -> '\n'
            while(str[i]!='\n' && i<str.length)i++;
        }else if(str[i]=='/'&&str[i+1]=='*'){ // '/*' -> '*/'
            while(str[i]!='*' && str[i]!='/' && i<str.length)i++;
        }else{
            if(str[i]=='{'){
                // if(argsEndIdx>-1) return args();
                level_curlyBrace++;
                level++;
            }else if(str[i]=='}'){
                level_curlyBrace--;
                level--;
            }else if(str[i]=='('){
                if(level == 0) inArgs=true;
                //if(reachedEndOfArgs) return {args:args,bodyStartIdx:i+1};
                level_parentheses++;
                level++;
            }else if(str[i]==')'){
                if(level==1){ endCur(); return [args,i]; }
                level_parentheses--;
                level--;
            }else{
                if(!inTypeDecl){
                    if(str[i]==':'||str[i]=='='){
                        inTypeDecl = true;
                        endCur();
                    }else if(str[i]==','){
                        endCur();
                    }else{
                       if(level==1) curArg+=str[i];
                    }
                }else{
                    if(str[i]=='<'){
                        level++;
                    }else if(str[i]=='>'){
                        level--;
                    }else if(str[i]==','){
                        if(level==1)inTypeDecl=false;
                    }
                }
            }
            
        }
    }
    return undefined; //error.
}

let finalOutput = "\nlet $CL=true;\nconst BlkFn = {\n";

let fns = Object.keys(BlkFn);
for(let i=0;i<fns.length;i++){
    let fn = BlkFn[fns[i]];
    let fnTxt = fn.toString();
    let types = getType(fnTxt);
    // console.log(types);
    if(types.length!=1){
        let errText = `No 1 type (found ${types}):\n${fnTxt}\n\n\n\nSee BlkFn_server.ts top for explanation.`;
        console.error(errText);
        throw new Error(errText);
    }
    let type = types[0];
    fnTxt = fnTxt
    .replaceAll("BLOCKS","_BLOCKS")
    .replaceAll("TAGS","_TAGS")
    .replaceAll(".children","._children")
    .replaceAll(".blocks","._blocks")
    .replaceAll(".tags","._tags");
    let fnType_idx = fnTxt.indexOf(fnTypes[type]);
    fnTxt = fnTxt.replaceAll(fnTypes[type],"  ")+',';

    let bodyStartIdx = fnTxt.indexOf("{");
    //if(type)
    let [args,argsEndIdx] = parseFnArgs(fnTxt)!;
    let fnHeader = fnTxt.substring(0,argsEndIdx+1);
    let argsTxt = args.map(a=>(','+a)).join('');
    let rpc = `(await rpc(\`BlkFn.${fns[i]}\`${argsTxt}))`;
    
    if(type=='clone'){
        fnTxt = fnTxt.substring(0,fnType_idx) + rpc+";" + fnTxt.substring(fnType_idx);
    }else if(type=='ret'){
        fnTxt = `${fnHeader}{\n\treturn ${rpc};\n},`;
    }else if(type=='local'){
        let rpcToken = "$$$CL_rpc";
        let rpcTokIdx;
        let start = 0;
        while((rpcTokIdx = fnTxt.indexOf(rpcToken,start)) != -1){
            fnTxt = fnTxt.substring(0,rpcTokIdx) + rpc + fnTxt.substring(rpcTokIdx+rpcToken.length);
            start = rpcTokIdx+rpc.length;
        }
    }else if(type=='diff'){

        fnTxt = `${fnHeader}{\n\t${rpc};\n\tawait ReLoadAllData();\n},`;
        
        // fnTxt = fnTxt.substring(0,fnType_idx) + rpc+";" + fnTxt.substring(fnType_idx);
    }else{
        throw new Error("Unexpected.");
    }

    
    finalOutput += fnTxt + "\n";
    // console.log(fnTxt);
}

finalOutput += "};";
console.log(finalOutput);