
type Id = string;
type TMap<Tk,Tv> = {[index:string]:Tv};

type objectA = {[index:string]:any};

let TODO = (txt:string="")=>{throw new Error("[TODO]"+txt);};
let WARN = (txt:string="")=>{};
type Ttodo = any; //when youre too lazy to specify a full type

/** json string <--> T  strong type class */ 
type JSONstr<T> = {
    parse : T;
    json : string;
}

(Array.prototype as any).remove = function(item:any){
    while(true){
        let idx = this.indexOf(item);
        if(idx!=-1)
            this.splice(idx,1);
        else break;
    }
    return this;
}

function cast<T> (obj: any) : T{
    return obj as T;
}
function castIsnt(obj: any, ...isnt: any){
    for(let i=0,il=isnt.length;i<il;i++)
        if(obj === isnt[i]) throw new Error("Cast failed.");
    return obj;
}

/** num to base 92 string (35[#]-126[~] ascii) */
function numToShortStr(n :number) :string{
    let s = "";
    if(n<0){s="-";n=-n;}
    while(true){
        s+=String.fromCharCode((n%92)+35);
        if(n<92) break;
        n/=92;
    }
    return s;
}

function filterNullMap( mapObj :any ) :any{
    const m = {} as any;
    for(let k in mapObj){
        const v = mapObj[k];
        if(v!==null)
            m[k] = mapObj[k];
    }
    return m;
}
// let __SerializableClasses = [Block];
// let __classToId = new WeakMap<any,string>();
let __IdToClass : {[index:string]:any} = {};
// __SerializableClasses.forEach((e,i)=>{if(e)__classToId.set(e,i);});
// let __registeredClasses : {[index:string]:any} = {}; // class.name => class (obj)

/** Register class as serializable.
 * @param suffix   if 2 classes have same name, use this to differentiate. MUST BE JSON-FRINEDLY STRING.
 */
function RegClass(_class:any){ /*Serialize class.*/
    console.log("REGISTERING CLASS",_class);
    // if(__classToId.has(_class)) return __classToId.get(_class);
    let id = _class.name;// + suffix;
    console.log("Registering ID:" ,id);
    if(__IdToClass[id] != null) throw new Error("Clashing class names. "+id); 
    // __classToId.set(_class,id);  //register class name with class
    __IdToClass[id] = _class; //register class name to class object
    return id;
}
class Unknown_SerializeClass{}
function SerializeClass(originalObj:any,_class?:any){ //obj is of some class
    let cls = _class ?? Object.getPrototypeOf(originalObj).constructor;
    console.log(cls);
    if(cls == Object) return '';
    let id = _class.name;
    if(__IdToClass[id] === undefined) throw new Error("Class not registered for serialization: "+id); 
    // let idx = __classToId.get(cls);
    // if(typeof idx != null) throw new Error("Class not registered for serialization:"+cls.name);
    return `"$$C":"${id}"`;
    //originalObj.__$class$__ = idx; // __$class$__
    //return originalObj;
}
// function DeserializeClass(scaffoldObj){ //obj is of no class, its an object. but it has a .__$class$__ property
// }

function EscapeStr(str:string){
    let s = "";
    for(let i=0,_il=str.length;i<_il;i++ ){
        if(str[i]=='"') s+='\\"';
        else if(str[i]=='\'') s+="'";
        else if(str[i]=='\\') s+='\\\\';
        else if(str[i]=='\n') s+='\\n';
        else if(str[i]=='\r') s+='\\r';
        else if(str[i]=='\t') s+='\\t';
        else if(str[i]=='\v') s+='\\v';
        else if(str[i]=='\0') s+='\\0';
        else if(str[i]=='\a') s+='\\a';
        else if(str[i]=='\b') s+='\\b';
        else if(str[i]=='\f') s+='\\f';
        else if(str[i]=='\e') s+='\\e';
        else s+=str[i];
    }
    return s;
}

function JSON_Serialize(obj:any){//,  key?:string,parent?:any){
    console.log("serializing:",obj);
    if(obj === null) return "null";
    else if(obj === undefined) return null;  //skip
    //return "null";
    //else if(typeof obj ==='string') return `"${EscapeStr(obj)}"`;
    else if(Array.isArray(obj)){
        let defaults = Object.getPrototypeOf(obj).constructor._serializable_default ?? {};

        let s = "[";
        for(let i=0,_il=obj.length; i<_il; i++){
            if(i!=0)s+=",";
            s+=JSON_Serialize(obj[i]);
        }
        s += "]";
        return s;
    }else if(typeof obj == 'object') {
        console.log("SERIALIZING OBJECT:",obj);
        if(obj.__serialize__) obj = obj.__serialize__();
        console.log("SERIALIZING OBJECT2:",obj);
        let _class = Object.getPrototypeOf(obj).constructor;
        console.log("CLASS:",_class,_class.name);
        let defaults = _class._serializable_default;
        console.log("DEFAULTS:",defaults);
        // if(obj.serialize_fn) return obj.serialize_fn();
        let classId = SerializeClass(obj,_class); 
        let s = `{${classId}`;
        let k = Object.getOwnPropertyNames(obj);
        let insertComma = (classId!=''); //was class atr inserted?
        for(let i=0,l=k.length;i<l;i++){
            if(defaults && defaults[k[i]] == obj[k[i]]) continue; //skip this attribute
            let ser = JSON_Serialize(obj[k[i]]);
            if(ser === null) continue; //skip.

            if(insertComma) s+=',';
            //for performance reasons, dont escape strings.
            //yes it can corrupt your json.
            //up to plugin devs to watch out for it.
            s+=`"${k[i]/*EscapeStr(k[i])*/}":${ser}`;
            insertComma = true;
        }
        s+='}';
        return s;
    }
    return JSON.stringify(obj);
}
function __Deserialize(o:objectA ,allowUnknownClasses=false):any{
    console.log("deserializing:",o);
    if(o === null) return null;
    if(Array.isArray(o))
        return o.map((e)=>__Deserialize(e));
    if(typeof o != 'object'){
        console.log("Primitive:",o);
        return o; //assuming its primitive.
        
    } 
    // DeserializeClass(o);
    let classId = o.$$C;
    let _class:any = null;
    let defaults:any = {};
    if(classId !== undefined){
        _class = __IdToClass[classId];
        delete o.$$C;
        if(_class == null){
            if(allowUnknownClasses)
                _class = Unknown_SerializeClass.prototype;
            else
                throw new Error("Class not recognised:",classId);
        }
        Object.setPrototypeOf(o,_class); //applies in-place to object
        defaults = _class._serializable_default ?? {};
        
    }
    // end Deserialize class

    console.log("Deserializing object:",o,"defaults:",defaults,"class:",_class);

    let keys = Object.getOwnPropertyNames(o);
    for(let k=0,kl=keys.length;k<kl;k++){
        o[keys[k]] = __Deserialize(o[keys[k]]);
    }

    //apply defaults
    let dk = Object.keys(defaults);
    for(let i = 0,il=dk.length;i<il;i++){
        let k = dk[i];
        if(o[k] === undefined){
            let d = defaults[k];
            // we must make copies of the defaults, not use the same object.
            if(Array.isArray(d)) o[k] = [];
            else if(d===null) o[k] = null;
            else if(typeof d == 'object') o[k] = {};
            else o[k] = d;
        }
    }

    if(_class && _class.__deserialize__) o = _class.__deserialize__(o);
    console.log("returning deserialized",o);

    // if(o.deserialize_fn) o.deserialize_fn();
    return o;
}
function JSON_Deserialize(str:string,allowUnknownClasses=false):any{
    console.log(str);
    return __Deserialize( JSON.parse(str) , allowUnknownClasses);
}

/*******************
 LIMITATIONS TO SERIALIZATION

 NO CIRCULAR REFERENCES.
 No arrays with special properties or classes.
*********************//************* 
Messages are mostly client -> server.
Msg = code of message
TCMsg = type of client request
TSMsg = type of server response
CMsg = send client -> server
**************/
/** */

const _MakeMsg = <Req,Resp> (msg_code:string) => 
    (async (d:Req) : Promise<Resp> => 
        (await Server.sendMsg({n:msg_code,d})) as Resp  );

type TCMsg_saveAll__DataOrDeleted = {path:[string,Id|undefined]} & ({data:string} | {deleted:true});
const Msg_saveAll = 'saveAll';
type TCMsg_saveAll = {hash:string,data:TCMsg_saveAll__DataOrDeleted[]};
type TSMsg_saveAll = Error|true;
const CMsg_saveAll = _MakeMsg<TCMsg_saveAll,TSMsg_saveAll>(Msg_saveAll);

const Msg_eval = 'eval';
type TCMsg_eval = {code:string};
type TSMsg_eval = Error|any;
const CMsg_eval = _MakeMsg<TCMsg_eval,TSMsg_eval>(Msg_eval);

const Msg_loadInitial = 'loadInitial';
type TCMsg_loadInitial = null;
type TSMsg_loadInitial = Error|false|{ // false if nothing already saved (fresh install)
    PROJECT : JSONstr<ProjectClass>,
    SEARCH_STATISTICS : JSONstr<SearchStatistics>,
    PAGES : JSONstr<TPAGES>,

    ids_BLOCKS : Id[],
    ids_TAGS : Id[],
};
const CMsg_loadInitial = _MakeMsg<TCMsg_loadInitial,TSMsg_loadInitial>(Msg_loadInitial);

const Msg_loadBlock = 'loadBlock';
type TCMsg_loadBlock = {id:Id,depth:number};
type TSMsg_loadBlock = Error|{[index:Id]:string};//JSONstr<Block>};
const CMsg_loadBlock = _MakeMsg<TCMsg_loadBlock,TSMsg_loadBlock>(Msg_loadBlock);

const Msg_loadTag = 'loadTag';
type TCMsg_loadTag = {id:Id,depth:number};
type TSMsg_loadTag = Error|{[index:Id]:string};//JSONstr<Tag>};
const CMsg_loadTag = _MakeMsg<TCMsg_loadTag,TSMsg_loadTag>(Msg_loadTag);

type ServerMsg = {n:string,d?:any,cb?:Function}; //n=name
var Server = {
    __WebSock : new WebSocket("ws://localhost:9020"),
    __SockOpen : false,
/*
new Promise((resolve, reject) => {
    WebSock.onopen(()=>resolve());
});*/
    /*
    MsgType:{
        saveAll:"saveAll", //data:null
        load:"load", //data: attrSelector[]
        eval:"eval", //code as string
    },*/
    __MsgQueue : [] as {n:string,d?:any,cb:Function}[], // 
// let msgId = 0;
// msg: {text:null,cb:null}         //
// msg: {promise:true, text:null}   //promisify automatically
    sendMsg(msg:ServerMsg){
        // msgId++;
        // msg.id = msgId;

        let promise:any = null;
        if(msg.cb === undefined)
            promise = new Promise((resolve,reject)=>{
                msg.cb = resolve; 
            });

        this.__MsgQueue.push(msg as any);
        
        if(this.__SockOpen)
            this.__WebSock.send(JSON_Serialize({n:msg.n,d:msg.d})!);

        if(promise!==null) return promise;
    }
};

Server.__WebSock.onopen = (event) => {
    Server.__SockOpen = true;
    for(let i = 0; i < Server.__MsgQueue.length; i++) //send unsent ones
        Server.__WebSock.send(JSON_Serialize({n:Server.__MsgQueue[i].n,d:Server.__MsgQueue[i].d})!);
        

    console.log("Open");
    // WebSock.send("Here's some text that the server is urgently awaiting!");
};

WARN("Da ne radim .shift nego attachujem ID na sent message i uklonim appropriate ID.")
Server.__WebSock.onmessage = (event) => {
    let m = Server.__MsgQueue.shift()!;
    let dataTxt = event.data as string;
    console.log("websock recv:",dataTxt);
    let data;
    if(dataTxt.startsWith("error")){
        data = new Error(JSON_Deserialize(dataTxt.substring("error".length)));
    }else{
        data = JSON_Deserialize(dataTxt);
    }
    m.cb(data);
    // console.log(event.data);
};

// WebSock.send("Here's some text that the server is urgently awaiting!");
type _DIRTY_Entry = [string,Id|undefined,false|undefined];
var DIRTY = {
    _ : [] as _DIRTY_Entry[],
    error : null as null|Error,

    mark(singleton:string,id?:any,isDeleted:false|undefined=false) :void{
        // check if user didnt make mistake in strEval string: 
        try{eval(this.evalStringResolve(singleton,id));}catch(e){throw Error("Eval cant find object "+singleton+" id "+id+". :"+e);}
    
        while(true){ //remove same or longer/more-specific already marked  (["BLOCKS",1] should shadow ["BLOCKS",1,2,3] as its more general)
            
            for(let i = 0; i<this._.length;i++){
                if(this._[i][0] == singleton){
                    if(id!==undefined && this._[i][1]===undefined) return; //theyre more specific than us!
                    if((id===this._[i][1]) || (this._[i][1]!==undefined && id===undefined)){
                        this._.splice(i,1);
                        break;
                    }
                }
            }
            // let idx = this.findAnyMatch(singleton,id);
            // if(idx==-1) break;
            // if(id===undefined && this._[idx][1]!==undefined)
            // // if(this._[idx].length>strEval.length) // we are less specific than existing, delete existing
            //     this._.splice(idx,1);
            // else if(this._[idx][id] === id)
            // // else if(this._[idx].length==strEval.length && this._[idx][1] == strEval[1])
            //     return;  // exact copy of us is already saved. quit.
            // else return; // its actually less specific than us!! we should quit.
        }
        this._.push([singleton,id,isDeleted]);
    },
    // findAnyMatch(singleton:string,id?:any){
    //     for(let i = 0; i<this._.length;i++){
    //         if(this._[i][0] == singleton){
    //             //if(this._[i][1]===undefined)
    //                 return i;
    //         }
    //         // let len = this._[i].length; if(len>strEval.length) len=strEval.length;
    //         // let matchesAll = true;
    //         // for(let j=0;j<len;j++){
    //         //     if(this._[i][j] != strEval[j])
    //         //         matchesAll = false;
    //         // }
    //         // if(matchesAll) return i;
    //     }
    //     return -1;
    // },
    evalStringResolve(singleton:string,id?:any):string{
        let finalEvalStr = singleton;
        if(id!==undefined){
            finalEvalStr += `["${id}"]`;
        }
        //else throw Error("Unexpected evalStr length: " + JSON.stringify(strEval));
        return finalEvalStr;
    }
};

// function unmark_DIRTY(strEval:[string,...any]) :void{
//     if(_DIRTY[strEval])
//         delete _DIRTY[strEval];
//}
/*async function set(path:_AttrPath,value:any){
    // path=AttrPath.parse(path);
    return (await rpc(`server_set`,path,value));
}*/

/**
 * Like a normal array but it mocks pop,push,splice functions, 
 * so when called it calls this.set() function of object.
 * Telling it the array was modified.
 */
/*
class ProxyArraySetter_NO{
    __obj:any; __field:string;
    constructor(obj:any,field:string){
        this.__obj = obj;
        this.__field = field;
    }
    static __new(obj:any,field:string,existingArray:any[]|null=null){
        let arr;
        if(existingArray===null){
            arr = [];
            // arr.push(...obj[field]);
        }else arr = existingArray;
        let p = new ProxyArraySetter(obj,field);
        Object.assign(arr,p);
        return Object.setPrototypeOf(arr,ProxyArraySetter.prototype) as any[];
    }
    push(...items:any){
        let r = Array.prototype.push.apply(this,items);
        this.__obj.set(this.__field,this,false);
        return r;
    }
    pop(...items:any){
        let r = Array.prototype.pop.apply(this,items);
        this.__obj.set(this.__field,this,false);
        return r;
    }
    splice(...items:any){
        let r = Array.prototype.splice.apply(this,items);
        this.__obj.set(this.__field,this,false);
        return r;
    }
}
*/
/** same as array. */
//declare type TProxyArraySetter_NO<T> = T[];
class ProjectClass {
    running_change_hash: string;
    __runningId : number;

    DIRTY(){DIRTY.mark("PROJECT");}

    genChangeHash():string{
        this.running_change_hash = numToShortStr(
                (Date.now() - (new Date(2025,0,1)).getTime())*1000 +
                Math.floor(Math.random()*1000)
            );
        this.DIRTY();
        return this.running_change_hash;
    }
    
    genId():string{
        ++this.__runningId;
        this.DIRTY();
        return this.__runningId.toString();
    }
    
    constructor(){
        this.running_change_hash = "-";
        this.__runningId = 1;
    }
}
RegClass(ProjectClass);

declare var LEEJS : any;

const SearcherMode = {
    __at0_pages:1, // [0]1 = pages
    __at0_tags:2,  // [0]2 = tags
    __at1_find:0,  // [1]0 = find
    __at1_add:1,   // [1]1 = add
    pages_find : [1,0],
    tags_find : [2,0],
    tags_add : [2,1]
}
class Searcher {
    visible:boolean;
    input:HTMLInputElement;
    finder:HTMLElement;
    direct:HTMLElement;recent:HTMLElement;

    directs:string[];
    recents:string[];
    mode:  null|any;

    constructor(){
        this.visible = true;
        this.directs = [];
        this.recents = [];
        this.mode = null;
        ///   MakeVisible {
        let L = LEEJS;
        // let inp,direct,recent;
        // div($I`window`,[
          this.finder = L.div(L.$I`finder`,[
            this.input = L.input(L.$I`finderSearch`,{type:"text"})(),
            L.div(L.$I`finderSuggestions`,{
                $bind:this, $click:this.__ItemClick
            },[
                this.direct = L.div(L.$I`direct`,[
                    L.div("Item"),L.div("Item"),L.div("Item"),
                ])(),
                this.recent = L.div(L.$I`recent`,[
                    L.div("Item"),L.div("Item"),
                ])(),
            ])
          ]).a('#finderRoot');
        // ]);
        ///   MakeVisible }

        this.toggleVisible(false);
    }
    toggleVisible(setValue?:boolean){
        if(setValue!==undefined)
            this.visible = setValue;
        else this.visible = !this.visible;
        
        this.finder.style.display = this.visible?'block':'none';
    }
    async Search(){
        let last = this.input.value.trim();
        if(last.indexOf(',')!=-1)
            last = last.split(',').at(-1)!.trim();
        if(this.mode[0]==SearcherMode.__at0_pages){
            this.directs = await BlkFn.SearchPages(last,'includes');
        }else if(this.mode[0]==SearcherMode.__at0_tags){
            this.directs = await BlkFn.SearchTags(last,'includes');
        }
        // this.directs = TAGS.filter(t=>t.name.includes(this.input.value));
    }
    async Submit(){
        let items = this.input.value.trim().split(',').map(v=>v.trim());
        if(this.mode[0]==SearcherMode.__at0_pages){
        
        }else if(this.mode[0]==SearcherMode.__at0_tags){
        
        }
    }
    AddRecent(){

    }
    ItemSelected(){

    }
    __ItemClick(event:MouseEvent){
        let item:HTMLElement = event.target as HTMLElement;
        if(item == this.recent || item == this.direct) return;
        
    }
}
var SEARCHER = (new Searcher());

class SearchStatistics{

    maxRecents : 20;
    recentlySearched_Pages: [Id,string][];
    recentlySearched_Tags: [Id,string][];
    recentlyVisited_Pages: [Id,string][];
    recentlyAdded_Tags: [Id,string][];

    constructor(){
        this.maxRecents = 20; 
        this.recentlySearched_Pages = [];
        this.recentlySearched_Tags = [];
        this.recentlyVisited_Pages = [];
        this.recentlyAdded_Tags = [];
    }

    DIRTY(){DIRTY.mark("SEARCH_STATISTICS");}
        

    
    push_list(list:[Id,string][],id_name:[Id,string]){
        list.splice(0,0,id_name); // add as first
        if(list.length>this.maxRecents) // limit max length
            list.splice(this.maxRecents,list.length-this.maxRecents);
        this.DIRTY();
    }
    async recentlySearched_Pages_push(id:Id){
        this.push_list(this.recentlySearched_Pages,[id,(await BLOCKS(id)).pageTitle!]);
    }
    async recentlySearched_Tags_push(id:Id){
        this.push_list(this.recentlySearched_Tags,[id,(await TAGS(id)).name]);
    }
    async recentlyVisited_Pages_push(id:Id){
        this.push_list(this.recentlyVisited_Pages,[id,(await BLOCKS(id)).pageTitle!]);
    }
    async recentlyAdded_Tags_push(id:Id){
        this.push_list(this.recentlyAdded_Tags,[id,(await TAGS(id)).name]);
    }
}
RegClass(SearchStatistics);//let $CL = typeof($IS_CLIENT$)!==undefined; // true for client, false on server
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
var PROJECT = new ProjectClass();
var SEARCH_STATISTICS = new SearchStatistics();

type TBLOCKSn = {[index:Id]:Block|null};
var _BLOCKS : TBLOCKSn = {};  // all blocks
async function BLOCKS( idx :Id , depth :number = 1 ):Promise<Block>{
    if(_BLOCKS[idx]===null)
        await loadBlock(idx,depth);
    return _BLOCKS[idx]!;
}

type TPAGES = {[index:Id]:true};
var PAGES : TPAGES = {}; //all pages

type TTAGSn = {[index:Id]:Tag|null};
var _TAGS : TTAGSn = {};  // all tags
async function TAGS( idx :Id , depth :number = 1 ):Promise<Tag>{
    if(_TAGS[idx]===null)
        await loadTag(idx,depth);
    return _TAGS[idx]!;
}

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
    if(resp instanceof Error)
        throw resp;
    else if(resp === false){ // server has no saved state (fresh install) 

    }else{
        //let json = resp;//__Deserialize(resp);
        PAGES =  JSON_Deserialize(resp.PAGES as any);
        SEARCH_STATISTICS =  JSON_Deserialize(resp.SEARCH_STATISTICS as any);
        PROJECT =  JSON_Deserialize(resp.PROJECT as any);   
    
        _BLOCKS = {};
        for(let k in resp.ids_BLOCKS)
            _BLOCKS[k] = null;
        _TAGS = {};
        for(let k in resp.ids_TAGS)
            _TAGS[k] = null;
    
    }
}
async function SaveAll(){
    //    Server.sendMsg({n:Server.MsgType.saveAll,d:{TAGS:_TAGS,BLOCKS:_BLOCKS}});
    if(DIRTY._.length==0 || DIRTY.error!==null) return;
        
    // send to server all dirty objects.
    // most importantly also send the ""
    let oldChangeHash = PROJECT.running_change_hash;
    PROJECT.genChangeHash();
    //let packet : TMsg_saveAll_C2S["d"] = {hash:oldChangeHash,data:[]};
    let packet : TCMsg_saveAll__DataOrDeleted[] = [];
    DIRTY._.forEach(p=>{
        if(p[2]===undefined){ // thing was deleted.
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
    });
    const resp = await CMsg_saveAll({hash:oldChangeHash,data:packet});
    if(resp instanceof Error){
        DIRTY.error = resp;
        throw resp; // !!!!!!!!!!!!!!
    }
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

class Block{
    static _serializable_default = {children:[],tags:[],attribs:{},refCount:1};

    id:Id;
    refCount:number;
    
    pageTitle?:string;  //if has title then its a page!
    text:string;

    //usually-empty
    children:Id[];
    tags:Id[];
    attribs:objectA;

    constructor(){
        this.id = "";
        this.text = "";
        this.refCount = 1;
        this.children = [];
        this.tags = [];
        this.attribs = {};
    }
    DIRTY(){DIRTY.mark("_BLOCKS",this.id);}
    DIRTY_deleted(){DIRTY.mark("_BLOCKS",this.id,undefined);}
    static DIRTY_deletedS(id:Id){DIRTY.mark("_BLOCKS",id,undefined);}
    static new(text=""):Block{
        let b = new Block();
        _BLOCKS[b.id = PROJECT.genId()] = b;
        b.text = text;
        b.DIRTY();
        return b;
    }
    static newPage(title=""):Block{
        let b = new Block();
        _BLOCKS[b.id = PROJECT.genId()] = b;
        PAGES[b.id] = true;
        b.pageTitle = title;
        b.DIRTY();
        return b;
    }

    makeVisual(parentElement?:HTMLElement){
        return (new Block_Visual(this,parentElement));
    }

};
RegClass(Block);

class Tag{ 
    static _serializable_default = {attribs:{},parentTagId:"",childrenTags:{}};
    name : string;
    id:Id;
    parentTagId:Id;
    childrenTags:Id[];
    blocks:Id[];
    attribs:objectA;

    constructor(){
        this.id = "";
        this.name = "";
        this.parentTagId = "";
        this.childrenTags = [];
        this.blocks = [];
        this.attribs = {};
    }
    DIRTY(){DIRTY.mark("_TAGS",this.id);}
    DIRTY_deleted(){DIRTY.mark("_TAGS",this.id,undefined);}
    static DIRTY_deletedS(id:Id){DIRTY.mark("_TAGS",id,undefined);}
    static async new(name:string,parentTag:Id=""){
        let t = new Tag();
        let parent :Tag|null = null;
        
        if(parentTag!=""){
            parent = await TAGS(parentTag);
            if(!parent) throw new Error(`Invalid parent: #${parentTag} not found`);
        }
        
        _TAGS[t.id = PROJECT.genId()] = t;
        t.name = name;

        if(parentTag!=""){ 
            t.parentTagId = parentTag;
            parent!.childrenTags.push(t.id);    
        }

        t.DIRTY();
        return t;
    }
}
RegClass(Tag);/*
User is viewing a single page.
*/

class Page_Visual{
    pageId : Id;
    children : Block_Visual[];
    childrenHolderEl:HTMLElement;
    
    constructor(){
        this.pageId = "";
        this.children = [];

        this.childrenHolderEl = null as any;
    }
    page():Block{
        return _BLOCKS[this.pageId]!;
    }
    async openPage(newPageId:Id){
        this.childrenHolderEl = STATIC.blocks;
        await loadBlock(newPageId,3);
        this.pageId = newPageId;
        this.children = [];
        
        await CheckAndHandle_PageNoBlocks();
        this.render();
    }
    render(){
        const p = this.page();
        this.children = [];
        document.title = p.pageTitle ?? "";
        this.childrenHolderEl.innerHTML = ""; // clear
        function makeBlockAndChildrenIfExist(bv:Block_Visual){
            //bv already exists and is created. Now we need to create visuals for its children (and theirs).
            //create block_visuals for children of bv, and repeat this for them recursively
            let b = bv.block;
            bv.children = [];
            for(let i = 0; i<b.children.length; i++){
                if(_BLOCKS[b.children[i]]===undefined) continue; // skip not yet loaded. [TODO] add a button to load more.
                let b2 = _BLOCKS[b.children[i]]!;
                let bv2 = b2.makeVisual(bv.childrenHolderEl);
                bv.children.push(bv2);
                makeBlockAndChildrenIfExist(bv2);
            }
        }
        for(let i = 0; i<p.children.length; i++){
            let b = _BLOCKS[p.children[i]]!;
            let bv = b.makeVisual(this.childrenHolderEl);
            this.children.push(bv);
            makeBlockAndChildrenIfExist(bv);
        }
    }
};/// <reference lib="dom" />

//import {b} from "./BLOCKS.ts";
declare var TinyMDE : any;
declare var LEEJS : any;
type TMDE_InputEvent = {content:string,lines:string[]};

let view :Page_Visual = new Page_Visual();;

let selected_block :Block_Visual|null = null;
let inTextEditMode = false;

let el_to_BlockVis = new WeakMap<HTMLElement,Block_Visual>();

let ACT /*"Actions"*/ = {
    //double click handling (since if i blur an element it wont register dbclick)
    lastElClicked : null as HTMLElement|null,
    clickTimestamp: 0      as number,
    // consts:
        DOUBLE_CLICK:2,
        SINGLE_CLICK:1,
    fn_OnClicked(el :HTMLElement){
        let sameClicked = (this.lastElClicked==el);
        this.lastElClicked = el;
        let t = (new Date()).getTime();
        let dt = t-this.clickTimestamp;
        this.clickTimestamp = t;
        if(dt<340 && sameClicked){ //double or single click
            return this.DOUBLE_CLICK;
        }
        return this.SINGLE_CLICK;
    },

    // marking already handled events when they bubble
    __handledEvents : new Array<Event>(10),  //set of already handled events.
    __handledEvents_circularIdx : 0    as number, // it wraps around so handledEvents is a circular buffer
    // new events get added like so:  handledEvents[circIdx=(++circIdx %n)]=ev;  so it can keep at most n last events.
    setEvHandled(ev:Event){
        this.__handledEvents[
            this.__handledEvents_circularIdx=( ++this.__handledEvents_circularIdx %this.__handledEvents.length)
        ] = ev;
    },
    isEvHandled(ev:Event){
        return this.__handledEvents.indexOf(ev)!==-1;
    }

};
let STATIC = {
    style_highlighter : document.getElementById('highlighterStyle')!,
    blocks : document.getElementById('blocks')!,
};

function propagateUpToBlock(el:HTMLElement,checkSelf=true):Block_Visual|null{
    let atr = null;
    if(checkSelf) if(el.hasAttribute("data-b-id")) return el_to_BlockVis.get(el)!;
    while(el!=STATIC.blocks && el!=document.body){
        el = el.parentElement!;
        if(el && el.hasAttribute("data-b-id")) return el_to_BlockVis.get(el)!;
    }
    return null;

}
function updateSelectionVisual(){
    STATIC.style_highlighter.innerHTML = `div[data-b-id="${selected_block!.block.id}"]{\
    background-color: red !important;\
    padding-left: 0px;\
    border-left: 4px solid #555555 !important;\
    }`;
}

function selectBlock(b:Block_Visual,editText:boolean|null=null){
    let _prevSelection = selected_block;

    selected_block = b;
    if(editText || (editText===null && inTextEditMode)){
        inTextEditMode = true;
        b.editor!.e.focus();
        // console.log('focusing e')
    }else{
        if(editText!==null) inTextEditMode = false;
        b.el!.focus();
        // console.log('focusing el')
    }
    updateSelectionVisual();
}

/**
 * If page has 0 blocks, make one automatically.
 * we dont want pages without blocks.
 */
async function CheckAndHandle_PageNoBlocks(){
    if(view.pageId == "") return;
    let p = (await BLOCKS(view.pageId));
    if(p.children.length>0)return;
    NewBlockInsidePage();
}

// LEEJS.shared()("#pageView"); //not really needed
/*
l.$E(
    l.shared(),
    l.p(`Test`),
    l.button({onclick:"mojaFN()"},"KLIKNIME"),
)("#pageView"); //hostElement, write function
//(null,"write") //hostElement, write function
*/

const SHIFT_FOCUS = {
    firstChild:0,
    parent:1,
    above:2, //allows jumping to children
    below:3, //allows jumping to children
    above_notOut:4,
    below_notOut:5,
}
function ShiftFocus(block:Block_Visual, shiftFocus:number /*SHIFT_FOCUS*/, skipCollapsed=true){
    //if skipCollapsed, then it wont go into children of collapsed blocks (not visible).
    let focusElement = null as Block_Visual|null|undefined;
    if(shiftFocus == SHIFT_FOCUS.above_notOut){
        focusElement = el_to_BlockVis.get(block.el!.previousElementSibling as HTMLElement);
    }else if(shiftFocus == SHIFT_FOCUS.below_notOut){
        focusElement = el_to_BlockVis.get(block.el!.nextElementSibling as HTMLElement);
    }else if(shiftFocus == SHIFT_FOCUS.above){
        // case 1: check siblings
        focusElement = el_to_BlockVis.get(block.el!.previousElementSibling as HTMLElement);
        if(focusElement){
            // ok we go to earlier sibling, but we need to go to last nested child since thats whats above us (child is below their parent)
            while(true){
                if(skipCollapsed && focusElement.collapsed) break;
                if(focusElement.children.length>0){
                    focusElement = focusElement!.children[focusElement!.children.length-1];
                }else{
                    break;
                }
            }
        }
        // case 2: no siblings earlier than us, go to parent
        if(!focusElement)
            focusElement = block.parent();
        
        //focusElement = propagateUpToBlock(block.el!.previousSibling,true);
    }else if(shiftFocus == SHIFT_FOCUS.below){
        // case 1: check siblings
        //focusElement = el_to_BlockVis.get(block.el!.nextElementSibling as HTMLElement);
        // case 2: no siblings after us, go to element below us
        if(!focusElement){
            /* What element is below us?
            {
                {
                    {
                        .. previous siblings ..
                        <-- we are here
                    }
                }
            }
            {}  <-- we need to jump to this

            so the algorithm is:
            keep going up (seeking parent)
            get index of parent (in parent's parent list of children)
            as long as parent is last, keep repeating

            once parent isnt last index, we jump to whatever is after parent.

            if we reach root (no parent) then we are last globally and no blocks are below us.
            */
            let p = block,pp:Block_Visual|null=null;
            do{
                pp = p.parent()!;
                if(pp){
                    let index = pp.children.indexOf(p);
                    if(index==-1) throw new Error("unexpected");
                    if(index != (pp.children.length-1)) //not last!
                    {
                        focusElement = pp.children[index+1];
                        break;
                    }
                }else{ //p is root.

                    break;
                }
                p = pp;

            }while(p=p.parent()!);

            focusElement = p!.children[0]!;
            
        }
            focusElement = block.parent();

        
        //focusElement = propagateUpToBlock(block.el!.nextSibling,true);
    }else if(shiftFocus == SHIFT_FOCUS.firstChild){// throw new Error("[TODO]");
        focusElement = block.children[0]!;
        //focusElement = block.el!.nextSibling!;
    }else if(shiftFocus == SHIFT_FOCUS.parent){ //throw new Error("[TODO]");
        focusElement = block.parent();
        //focusElement = block.el!.nextSibling!;
    }else throw new Error("shiftFocus value must be one of/from SHIFT_FOCUS const object.")
    
    if(focusElement){
        focusElement.el.dispatchEvent(new FocusEvent("focus"));
        return focusElement;
    }
    return null;
}

async function NewBlockAfter(thisBlock:Block_Visual){
    let h = thisBlock.el!.parentElement!; //parent node
    let parentBlockVis = propagateUpToBlock(h); //Get parent or Page of view / window.
    let parentBlock = (parentBlockVis == null)? (view!.pageId) : (parentBlockVis.block.id);

    let thisBlockIdx = Array.from(h.children).indexOf(thisBlock.el!);
    if(thisBlockIdx<0)throw new Error("Could not determine new index.");
    let blockVis = (await Block.new("")).makeVisual(h);
    await BlkFn.InsertBlockChild(parentBlock,blockVis.block.id,thisBlockIdx+1);
    let next = thisBlock.el!.nextSibling;
    if(next!=null)
        h.insertBefore(blockVis.el!, next);
    
    selectBlock(blockVis,inTextEditMode);
    return blockVis;
}
async function NewBlockInside(thisBlock:Block_Visual){
    let h = thisBlock.el!;//.parentElement!; //parent node
    let blockVis = (await Block.new("")).makeVisual(h);
    await BlkFn.InsertBlockChild(thisBlock.block.id,blockVis.block.id,thisBlock.block.children.length); //as last
    
    // thisBlock.block.children.push(blockVis.block.id);

    thisBlock.childrenHolderEl.appendChild(blockVis.el);
    thisBlock.children.push(blockVis);

    selectBlock(blockVis,inTextEditMode);
    return blockVis;
}
async function NewBlockInsidePage(){
    // let h = view.el!;//.parentElement!; //parent node
    let blockVis = (await Block.new("")).makeVisual();
    await BlkFn.InsertBlockChild(view.pageId,blockVis.block.id, (await BLOCKS(view.pageId)).children.length); //as last
    
    // thisBlock.block.children.push(blockVis.block.id);

    view.childrenHolderEl.appendChild(blockVis.el);
    view.children.push(blockVis);

    selectBlock(blockVis,inTextEditMode);
    return blockVis;
}

async function DeleteBlockVisual(blockVis:Block_Visual){
    // delete one visual instance of this block
    let parent = blockVis.parent();
    if(parent === null){
        STATIC.blocks.removeChild(blockVis.el);
    }else{
        blockVis.el.parentElement?.removeChild(blockVis.el);
    }
    BlkFn.DeleteBlockOnce(blockVis.block.id);
    
    // let els = document.querySelectorAll(`div[data-id="${delete_list[i].block.id}"]`);
    // for(let j=0,jl=els.length;j<jl;j++)
    //     els[j].parentNode?.removeChild(els[j]);
}
async function DeleteBlockEverywhere(blockVis:Block_Visual){
       
    // let els = document.querySelectorAll(`div[data-id="${delete_list[i].block.id}"]`);
    // for(let j=0,jl=els.length;j<jl;j++)
    //     els[j].parentNode?.removeChild(els[j]);
}

/// <reference lib="dom" />

declare var TinyMDE : any;
declare var LEEJS : any;

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

class Block_Visual{
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