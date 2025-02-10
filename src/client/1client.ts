
var PROJECT = new ProjectClass();
var SEARCH_STATISTICS = new SearchStatistics();

type TBLOCKSn = {[id:Id]:Block|null};
var _BLOCKS : TBLOCKSn = {};  // all blocks
async function BLOCKS( idx :Id , depth :number = 1 ):Promise<Block>{
    if(_BLOCKS[idx]===null)
        await loadBlock(idx,depth);
    return _BLOCKS[idx]!;
}

type TPAGES = {[id:Id]:true};
var PAGES : TPAGES = {}; //all pages

type TTAGSn = {[id:Id]:Tag|null};
var _TAGS : TTAGSn = {};  // all tags
async function TAGS( idx :Id , depth :number = 1 ):Promise<Tag>{
    if(_TAGS[idx]===null)
        await loadTag(idx,depth);
    return _TAGS[idx]!;
}

let autosaveInterval :number|null = null;

/*
async function LoadAll(){
    TODO();
    Server.sendMsg({n:Server.MsgType.loadAll,cb:((resp:any)=>{
        throwIf(resp);

        _TAGS = __Deserialize(resp._TAGS ?? {});
        _BLOCKS = __Deserialize(resp._BLOCKS ?? {});
    })});

}*/
async function ReLoadAllData(){
    let newData = await rpc(`client_ReLoadAllData`,{
        BLOCKS:_BLOCKS,
        PAGES:PAGES,
        TAGS:_TAGS,
    });
    _BLOCKS = newData.BLOCKS;
    PAGES = newData.PAGES;
    _TAGS = newData.TAGS;
}

async function rpc(code:string|Function, ...fnArgs:any):Promise<any>{
    console.log("rpc:",code,fnArgs);
    
    if(typeof(code) == 'function')
        code = `(${code}).apply(null,__Deserialize(${JSON_Serialize(fnArgs)}));`;
    else if(typeof(code)=='string'){
        code = `(${code}).apply(null,__Deserialize(${JSON_Serialize(fnArgs)}));`;
    }
    console.log("rpc after:",code);

    const resp = await CMsg_eval({code});
    console.log("rpc resp:",resp);
    throwIf(resp);
    return resp;
}
function throwIf(obj:any){
    if(obj instanceof Error){
        throw obj;
    }
}

async function LoadInitial(){

    /*
    Load:  PROJECT , SEARCH_STATISTICS , PAGES
    all ids for:  _BLOCKS, _TAGS
    on demand objects for: _BLOCKS, _TAGS.
    */
    const resp = await CMsg_loadInitial(null);
    console.log("LOAD INITIAL:",resp);
    if(resp instanceof Error)
        throw resp;
    else if(resp === false){ // server has no saved state (fresh install) 

    }else{
        //let json = resp;//__Deserialize(resp);
        PAGES =  JSON_Deserialize(resp.PAGES as any);
        SEARCH_STATISTICS =  JSON_Deserialize(resp.SEARCH_STATISTICS as any);
        PROJECT =  JSON_Deserialize(resp.PROJECT as any);   
    
        _BLOCKS = {};
        // console.log("LOAD INITIAL:",JSON.stringify(resp.ids_BLOCKS));
        resp.ids_BLOCKS.forEach(id=>_BLOCKS[id] = null);
        _TAGS = {};
        resp.ids_TAGS.forEach(id=>_TAGS[id] = null);
        
        console.log("LOAD INITIAL OVER:",PAGES,SEARCH_STATISTICS,PROJECT);
        // console.log("LOAD INITIAL _BLOCKS:",JSON.stringify(_BLOCKS));
    }
}
async function SaveAll(){
    //    Server.sendMsg({n:Server.MsgType.saveAll,d:{TAGS:_TAGS,BLOCKS:_BLOCKS}});
    if(DIRTY._.length==0 || DIRTY.error!==null){
        if(DIRTY.error) throw DIRTY.error;
        return;
    }
        
    // send to server all dirty objects.
    // most importantly also send the ""
    const oldHash = PROJECT.running_change_hash;
    if(oldHash == (new ProjectClass()).running_change_hash){ // initial save
        SEARCH_STATISTICS.DIRTY(); 
        PROJECT.DIRTY();
        DIRTY.mark("PAGES");
        // console.error("Initial save.");
        // console.error(JSON.stringify(DIRTY._))
    }

    const newHash = PROJECT.genChangeHash();
    
    //let packet : TMsg_saveAll_C2S["d"] = {hash:oldChangeHash,data:[]};
    let packet : TCMsg_saveAll__DataOrDeleted[] = [];
    for(let i = DIRTY._.length-1; i >= 0; i--){
        const p = DIRTY._[i];
        // console.error(p);
        if(p[2]){ // thing was deleted.
            packet.push({path:[p[0],p[1]],deleted:true});
        }else{
            let evalStr = DIRTY.evalStringResolve(p[0],p[1]);
            try{
                packet.push({path:[p[0],p[1]],data:JSON_Serialize(eval(evalStr))!});
            }catch(e){
                DIRTY.error = e as Error;
                throw e;
            }
        }
        DIRTY._.splice(i,1);
    }
    const resp = await CMsg_saveAll({hash:oldHash,newHash,data:packet});
    if(resp instanceof Error){
        DIRTY.error = resp;
        throw resp; // !!!!!!!!!!!!!!
    }
}

async function Backup(){
    let r = await CMsg_backup(null);
    throwIf(r);
}

async function loadBlock(blockId:Id,depth:number) {
    // path = AttrPath.parse(path);
    console.log("Loading block:",blockId);
    let newBLOCKS_partial = await CMsg_loadBlock({id:blockId,depth});//rpc(`client_loadBlock`,blockId,depth);
    //throwIf(newBLOCKS_partial);
    if(newBLOCKS_partial instanceof Error){throw newBLOCKS_partial}else
    for(let key in newBLOCKS_partial){
        console.log("Loading block id:",key);
        _BLOCKS[key] = JSON_Deserialize( newBLOCKS_partial[key] );
        console.info("Loaded block: ",key,_BLOCKS[key]);
    }  
}
async function loadTag(blockId:Id,depth:number) {
    TODO("LoadTag");
    // path = AttrPath.parse(path);
    console.log("Loading tag:",blockId);
    let newBLOCKS_partial = await CMsg_loadTag({id:blockId,depth});//await rpc(`client_loadBlock`,blockId,depth);
    //throwIf(newBLOCKS_partial);
    if(newBLOCKS_partial instanceof Error){throw newBLOCKS_partial}else
    for(let key in newBLOCKS_partial){
        console.log("Loading tag id:",key);
        _TAGS[key] = JSON_Deserialize( newBLOCKS_partial[key] );
    }  
}

