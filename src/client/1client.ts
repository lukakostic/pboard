
// type TBLOCKS = {[index:Id]:Block};
// type TBLOCKSn = {[index:Id]:Block|null};
// var _BLOCKS : TBLOCKSn = {}; //all blocks
// var BLOCKS = new Proxy({},{
//     async get(target,key:string,receiver){
//         if(_BLOCKS[key] === null)
//             _BLOCKS[key] = await load(["BLOCKS",key]) as Block;
//         return _BLOCKS[key] as Block;
//     },
//     set(target,key,newValue,receiver){
//         throw new Error("Cannot set whole object value.");
//         return true;
//     }
// }) as {[index:Id]:Promise<Block>};
type TBLOCKSn = {[index:Id]:Block|null};
var _BLOCKS : TBLOCKSn = {};
const BLOCKS = ServerProxyObject.new<Id,Block>("BLOCKS");

type TPAGES = {[index:Id]:true};
var PAGES : TPAGES = {}; //all pages

// type TTAGS = {[index:Id]:Tag};
// type TTAGSn = {[index:Id]:Tag|null};
// var _TAGS : TTAGSn = {}; //all blocks
// var TAGS = new Proxy({},{
//     async get(target,key:string,receiver){
//         if(_TAGS[key] === null)
//             _TAGS[key] = await load(["TAGS",key]) as Tag;
//         return _TAGS[key] as Tag;
//     },
//     set(target,key,newValue,receiver){
//         throw new Error("Cannot set whole object value.");
//         return true;
//     }
// }) as {[index:Id]:Promise<Tag>};
type TTAGSn = {[index:Id]:Tag|null};
var _TAGS : TTAGSn = {};
const TAGS = ServerProxyObject.new<Id,Tag>("TAGS");


async function SaveAll(){
    TODO();
    Server.sendMsg({n:Server.MsgType.saveAll,d:{TAGS:_TAGS,BLOCKS:_BLOCKS}});
}

async function LoadAll(){
    TODO();
    Server.sendMsg({n:Server.MsgType.loadAll,cb:((resp:any)=>{
        throwIf(resp);
        //let {_TAGS,_BLOCKS} = resp;

        _TAGS = __Deserialize(resp._TAGS ?? {});
        _BLOCKS = __Deserialize(resp._BLOCKS ?? {});
    })});

}
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
    // else{

    //     // code = `(()=>{let f =()=>${code};return f();})();`;
    //     //done like so to ensure it works even if code has ; or not,
    // }
    let resp = await Server.sendMsg({n:Server.MsgType.eval,d:code});
    console.log("rpc resp:",resp);
    throwIf(resp);
    return resp;
}
function throwIf(obj:any){
    if(obj instanceof Error){
        throw obj;
    }
}
// function newBlock(text){
//     return rpc(t=>(new Block(t)),text);
//     //return Server.sendMsg({n:Server.MsgType.eval,d:`return (new Block(${JSON.stringify(text)}))`});
// }

async function LoadInitial(){
    let initial = await rpc(`client_LoadInitial`) as any;
    PAGES =  __Deserialize(initial.PAGES);
}
async function loadBlock(blockId:Id,depth:number) {
    // path = AttrPath.parse(path);
    console.log("Loading block:",blockId);
    let newBLOCKS_partial = await rpc(`client_loadBlock`,blockId,depth);
    for(let key in newBLOCKS_partial){
        console.log("Loading block id:",key);
        _BLOCKS[key] = newBLOCKS_partial[key];
    }
   
}
