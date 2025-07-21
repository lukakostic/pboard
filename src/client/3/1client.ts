
var PROJECT = new ProjectClass();
var SEARCHER = (new Searcher());
var SEARCH_STATISTICS = new SearchStatistics();
var TAGGER = (new Tagger());

var PAGES : {[id:Id]:true} = {}; //all pages

var _BLOCKS : {[id:Id]:Block|null} = {};  // all blocks
function BLOCKS_assertId(id:Id){
    if(typeof(id)!='string')
        throw Error(`Invalid (typeof != string) Block id ${id}`);
    if(_BLOCKS[id]===undefined)
        throw Error(`Invalid (non existant) Block id ${id}`);
    return id;
}
async function BLOCKS( id :Id , depth=1 ):Promise<Block>{
    BLOCKS_assertId(id);
    if(_BLOCKS[id]===null) await loadBlock(id,depth);
    return _BLOCKS[id]!;
}

var _TAGS : {[id:Id]:Tag|null} = {};  // all tags
function TAGS_assertId(id:Id){
    if(typeof(id)!='string')
        throw Error(`Invalid (typeof != string) Tag id ${id}`);
    if(_TAGS[id]===undefined)
        throw Error(`Invalid (non existant) Tag id ${id}`);
    return id;
}
async function TAGS( id :Id , depth=1 ):Promise<Tag>{
    TAGS_assertId(id);
    if(_TAGS[id]===null) await loadTag(id,depth);
    return _TAGS[id]!;
}

let autosaveInterval :number|null = null;

///////////////////////////////////////////////////////////

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

window.onbeforeunload = function() {
    if (DIRTY._.length>0) {
        SaveAll();
        return 'There is unsaved data.';
    }
    return undefined;
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
    // TODO("LoadTag");
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

