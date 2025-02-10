
//######################
// File: 0Common.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/0Common.ts
//######################


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

function isEmptyObject(o:any){
    for(let i in o) return false;
    return true;
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

function assert_non_null(thing:any,msg="", actuallyCheck1_OrReturn0=true){
    if(actuallyCheck1_OrReturn0 && !thing){
        msg = `Assert fail: Unexpected null${msg?(" for "+msg):''}`;
        console.error(msg); 
        throw Error(msg);
    }
    return thing;
}

//######################
// File: 1Serializer.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/1Serializer.ts
//######################


// class ClassInfo{
//     _class :any;
//     defaults : any;
// };
// let __IdToClassInfo : {[classId:string]:ClassInfo};
let __IdToClass : {[index:string]:any} = {};

function RegClass(_class:any){ 
    console.log("REGISTERING CLASS",_class);
    let id = _class.name; // + HashClass(class)
    console.log("Registering ID:" ,id);
    if(__IdToClass[id] != null) throw new Error("Clashing class names. "+id); 
    __IdToClass[id] = _class; //register class name to class object
    return id;
}
RegClass(Error);
class Unknown_SerializeClass{}
// RegClass(Unknown_SerializeClass);
function SerializeClass(originalObj:any,_class?:any){ //obj is of some class
    let cls = _class ?? Object.getPrototypeOf(originalObj).constructor;
    if(originalObj instanceof Error) cls = Error;
    if(cls == Object || (originalObj["$$C"])) return '';
    let id = cls.name;
    if(__IdToClass[id] === undefined) throw new Error("Class not registered for serialization: "+id); 
    
    return `"$$C":"${id}"`;
    
}

function ApplyClass(obj:any,_class:any){
    if(_class.prototype) // is function not class.
        Object.setPrototypeOf(obj,_class.prototype);
    else Object.setPrototypeOf(obj,_class);
    return obj;
}
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
    // console.log("serializing:",obj);
    if(obj === null) return "null";
    else if(obj === undefined) return null;  //skip
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
        // console.log("SERIALIZING OBJECT:",obj);
        if(obj.__serialize__) obj = obj.__serialize__();
        // console.log("SERIALIZING OBJECT2:",obj);
        let _class = Object.getPrototypeOf(obj).constructor;
        // console.log("CLASS:",_class,_class.name);
        let defaults = _class._serializable_default;
        // console.log("DEFAULTS:",defaults);
        // if(obj.serialize_fn) return obj.serialize_fn();
        let classId = SerializeClass(obj,_class); 
        let s = `{${classId}`;
        let k = Object.getOwnPropertyNames(obj);
        let insertComma = (classId!=''); //was class atr inserted?
        for(let i=0,l=k.length;i<l;i++){
            if(defaults){
                const d = defaults[k[i]];
                if(d!==undefined){
                    const o = obj[k[i]];
                    if(d===o) continue;
                    if(Array.isArray(d)){
                        if(Array.isArray(o) && d.length==0 && o.length == 0) continue;
                    }else if(isEmptyObject(d)){
                        if(isEmptyObject(o)) continue;
                    }else if(JSON.stringify(d)==JSON.stringify(o)) continue;
                }
            }; //skip this attribute
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
    // console.log("deserializing:",o);
    if(o === null) return null;
    if(Array.isArray(o))
        return o.map((e)=>__Deserialize(e));
    if(typeof o != 'object'){
        // console.log("Primitive:",o);
        return o; //assuming its primitive.
        
    } 
    // DeserializeClass(o);
    let classId = o.$$C;
    let _class:any = null;
    let defaults:any = {};
    if(classId !== undefined){
        _class = __IdToClass[classId];
        if(_class == null){
            if(allowUnknownClasses)
                _class = Unknown_SerializeClass.prototype;
            else
                throw new Error("Class not recognised:",classId);
        }else{
            delete o.$$C;  // we know the class, can remove.
        }
        ApplyClass(o,_class); //applies in-place to object
        defaults = _class._serializable_default ?? {};
        
    }
    // end Deserialize class

    // console.log("Deserializing object:",o,"defaults:",defaults,"class:",_class);

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
    // console.log("returning deserialized",o);

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
*********************/

//######################
// File: 2Messages.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/2Messages.ts
//######################

/************* 
Messages are mostly client -> server.
Msg = code of message
TCMsg = type of client request
TSMsg = type of server response
CMsg = send client -> server
**************/
const _MakeMsg = <Req,Resp> (msg_code:string) => 
    (async (d:Req) : Promise<Resp> => 
        ((await Server.sendMsg({n:msg_code,d})) as Resp)  );

type TCMsg_saveAll__DataOrDeleted = {path:[string,Id|undefined]} & ({data:string} | {deleted:true});
const Msg_saveAll = 'saveAll';
type TCMsg_saveAll = {hash:string,newHash:string,data:TCMsg_saveAll__DataOrDeleted[]};
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

const Msg_backup = 'backup';
type TCMsg_backup = null;
type TSMsg_backup = Error|true;
const CMsg_backup = _MakeMsg<TCMsg_backup,TSMsg_backup>(Msg_backup);



//######################
// File: client/0000DEBUG.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/0000DEBUG.ts
//######################

var DEBUG = true;



//######################
// File: client/00DIRTY.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/00DIRTY.ts
//######################

type _DIRTY_Entry = [string,Id|undefined,boolean];
var DIRTY = {
    _ : [] as _DIRTY_Entry[],
    error : null as null|Error,


    mark(singleton:string,id?:any,isDeleted=false) :void{
        // check if user didnt make mistake in strEval string: 
        try{eval(this.evalStringResolve(singleton,id));}catch(e){throw Error("Eval cant find object "+singleton+" id "+id+". :"+e);}
        
        const require_id = ["_BLOCKS","_TAGS"];
        if(require_id.includes(singleton) && id===undefined) throw Error(`${singleton} requires an ID but none provided.`);
        if(require_id.includes(singleton)==false && id!==undefined) throw Error(`${singleton} doesnt support an ID but id '${id}' was provided.`);

        this._ = this._.filter(p=>!(p[0]==singleton && p[1]==id));// && (isDeleted?(p[2]==true):(p[2]!=true))));
        //remove all which have same singleton and id.    
        // for(let i = this._.length-1; i>=0;i--){
        //         if(singleton == this._[i][0]){
        //             if(id===this._[i][1])
        //                 this._.splice(i,1);
        //             // if(id!==undefined && this._[i][1]===undefined) return; //theyre more specific than us!
        //             // if((id===this._[i][1]) || (this._[i][1]!==undefined && id===undefined)){
        //             //     this._.splice(i,1);
        //             //     break;
        //             // }
        //         }
        //     }
        
        this._.push([singleton,id,isDeleted]);
        // console.error("Marked: ",[singleton,id,isDeleted]);
    },
    evalStringResolve(singleton:string,id?:any):string{
        let finalEvalStr = singleton;
        if(id!==undefined){
            finalEvalStr += `["${id}"]`;
        }
        //else throw Error("Unexpected evalStr length: " + JSON.stringify(strEval));
        return finalEvalStr;
    }
};

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
        return ApplyClass(arr,ProxyArraySetter) as any[];
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



//######################
// File: client/0000HELP.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/0000HELP.ts
//######################



type HELP_CodeHint = { desc:string, sourceLocation:string[] };
type HELP_TOPIC = "Navigation";
const HELP = {
    topics: {
        Navigation:`
### all of these dont cycle. You wont wrap to first child if you keep going down. ###
ArrowUp : Above (any level)
ArrowUp + Shift : Above (same level)
ArrowDown : Below  (any level)
ArrowDown + Shift : Above (same level)
ArrowLeft : Select parent
ArrowRight : Select parent's sibling below
Tab : Below  (any level)
Tab + Shift: Above  (any level)

Escape (bock selection mode): Unselect block
Escape (text edit mode): Go to block selection mode

Enter (block selection mode):  Edit text  (go to text edit mode)

Delete : delete block
        `.trim(),
    } as Record<HELP_TOPIC,string>,
    // locations (and descriptions) in code to where you can find implementation of mentioned feature/topic
    codeHints:{} as { [topic in HELP_TOPIC ]?: HELP_CodeHint[] },
    logCodeHint(topic:HELP_TOPIC, description:string){
        function getCodeLocation(){
            return (new Error()).stack!.split("\n").reverse().slice(2);
            // const e = new Error();
            // const regex = /\((.*):(\d+):(\d+)\)$/
            // const match = regex.exec(e.stack!.split("\n")[2]);
            // return {
            //     filepath: match[1],
            //     line: match[2],
            //     column: match[3]
            // };
        }
        if(!(topic in this.topics))
            throw Error("Unknown topic: "+topic);
        if(this.codeHints[topic] && this.codeHints[topic].some(ch=>(ch.desc==description))){
            //code hint is already present.
            return;
        }
        
        ( // array of codeHints for topic
            (topic in this.codeHints) ? this.codeHints[topic]!  //get existing 
            : (this.codeHints[topic] = [])   // create new
        ).push(  // push codeHint object
            {desc:description,sourceLocation:getCodeLocation()}
        );
        
    }
}



//######################
// File: client/0Preferences.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/0Preferences.ts
//######################

// class PreferencesClass {
//     this.pageView_maxWidth :number;
// };
// RegClass(PreferencesClass);





//######################
// File: client/0Project.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/0Project.ts
//######################

class ProjectClass {
    running_change_hash: string;
    __runningId : number;
    version : string;

    DIRTY(){DIRTY.mark("PROJECT");}

    constructor(){
        this.running_change_hash = "-";
        this.__runningId = 1;
        this.version = "1";
    }

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
    
}
RegClass(ProjectClass);



//######################
// File: client/0Searcher.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/0Searcher.ts
//######################


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
        this.push_list(this.recentlySearched_Tags,[id,await (await TAGS(id)).getName()]);
    }
    async recentlyVisited_Pages_push(id:Id){
        this.push_list(this.recentlyVisited_Pages,[id,(await BLOCKS(id)).pageTitle!]);
    }
    async recentlyAdded_Tags_push(id:Id){
        this.push_list(this.recentlyAdded_Tags,[id,await (await TAGS(id)).getName()]);
    }
}
RegClass(SearchStatistics);




//######################
// File: client/000WebSock.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/000WebSock.ts
//######################


type ServerMsg = {n:string,d?:any,cb?:Function}; //n=name
var Server = {
    __WebSock : new WebSocket("ws://localhost:9020"),
    __SockOpen : false,
/*
new Promise((resolve, reject) => {
    WebSock.onopen(()=>resolve());
});*/

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
    // if(dataTxt.startsWith("error")){
    //     data = new Error(JSON_Deserialize(dataTxt.substring("error".length)));
    // }else{
        data = JSON_Deserialize(dataTxt);
    // }
    m.cb(data);
    // console.log(event.data);
};

// WebSock.send("Here's some text that the server is urgently awaiting!");



//######################
// File: client/1BlkFn_server.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/1BlkFn_server.ts
//######################

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
        const t = await TAGS(tagId,0);
        t.blocks.splice(t.blocks.indexOf(blockId),1); //remove block from tag
        t.DIRTY();
        const b = await BLOCKS(blockId,0);
        b.tags.splice(b.tags.indexOf(tagId),1); //remove tag from block
        b.DIRTY();
    },
    async RemoveAllTagsFromBlock(blockId:Id){  ////let $$$CL_clone;
        const b = await BLOCKS(blockId,0);          ////if($CL&&!b)return;
        for(let i = 0; i<b.tags.length; i++){
            const t = await TAGS(b.tags[i],0);          ////if($CL&&!t)continue;
            t.blocks.splice(t.blocks.indexOf(blockId),1); //remove block from tag
            t.DIRTY();
        }
        b.tags = [];//    b.tags.splice(b.tags.indexOf(tagId),1); //remove tag from block
        b.DIRTY();
    },
    async AddTagToBlock(blockId:Id,tagId:Id){
        const b = await BLOCKS(blockId,0);
        const t = await TAGS(tagId,0);
        
    },
    async DeleteBlockOnce(id:Id){  ////let $$$CL_diff;
        if(_BLOCKS[id]==undefined) return false;
        const b = await BLOCKS(id,0);
        // console.error("delete once",id,b.refCount);
        b.refCount--;
        
        if(b.refCount>0){ b.DIRTY(); return false; }// false; //not getting fully deleted
        //deleting block fully
        if(b.refCount==0)
            await BlkFn.DeleteBlockEverywhere(id);
        
        return true;// true; //got fully deleted
    },
    async DeleteBlockEverywhere(id:Id){  ////let $$$CL_diff;
        if(_BLOCKS[id]==undefined) return;
        const b = await BLOCKS(id,0);
        b.refCount=0;
        for(let i = 0; i<b.children.length;i++){
            // console.error("delete everywhere ",id,"child:",b.children[i],"i"+i,b.children.length);
            if(await this.DeleteBlockOnce(b.children[i])) i--;
        }
        await this.RemoveAllTagsFromBlock(id);
        if(PAGES[id]){ delete PAGES[id]; DIRTY.mark("PAGES"); }
        delete _BLOCKS[id];
        Block.DIRTY_deletedS(id);
        // Search all blocks and all tags. Remove self from children.
        
        let allBlocks = Object.keys(_BLOCKS);
        for(let i = 0; i<allBlocks.length;i++){
            if(_BLOCKS[allBlocks[i]]==undefined) continue;
            const b2 = await BLOCKS(allBlocks[i],0);
            if(b2.children.includes(id)){
                b2.children = b2.children.filter((x:any)=>(x!=id));
                b2.DIRTY();
            }
            WARN("We arent modifying array in-place (for performance), caller may hold old reference");
            /*
            let oc = b2.children;
            let nc = oc.filter((x:any)=>(x!=id));
            if(nc.length != oc.length){
                oc.splice(0,oc.length,...nc);    // in-place set new array values
            }*/
        }
        /*
        let allTags = Object.keys(_TAGS);
        for(let i = 0; i<allTags.length;i++){
            const t2 = await TAGS(allTags[i]);
            t2.blocks = t2.blocks.filter((x:any)=>(x!=id));
            t2.DIRTY();
            WARN("We arent modifying array in-place (for performance), caller may hold old reference");
        }*/
    },
    async InsertBlockChild(parent:Id, child:Id, index:number )/*:Id[]*/{  ////let $$$CL_clone;
        const p = await BLOCKS(parent);                 ////if($CL&&!p)return;
        const l = p.children;
        if(index >= l.length || index<0){
            l.push(child);
        }else{
            l.splice(index,0,child);
        }
        p.DIRTY();
        // return l;
    },
    async SearchPages(title:string,mode:'exact'|'startsWith'|'includes'='exact'):Promise<Id[]>{  ////let $$$CL_ret;
        let pages = await Promise.all(Object.keys(PAGES).map(async k=>(await BLOCKS(k))));
        // console.info("ALL BLOCKS LOADED FOR SEARCH: ",JSON.stringify(_BLOCKS));
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





//######################
// File: client/1client.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/1client.ts
//######################


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



//######################
// File: client/2Blocks.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/2Blocks.ts
//######################



class Block{
    static _serializable_default = {text:"",children:[],tags:[],attribs:{},refCount:1,collapsed:false};

    id:Id;
    refCount:number;
    
    pageTitle?:string;
    text:string;

    children:Id[];
    tags:Id[];
    attribs:objectA;
    collapsed: boolean;

    constructor(){
        this.id = "";
        this.text = "";
        this.refCount = 1;
        this.children = [];
        this.tags = [];
        this.attribs = {};
        this.collapsed = false;
    }
    
    DIRTY(){this.validate();DIRTY.mark("_BLOCKS",this.id);}
    DIRTY_deleted(){DIRTY.mark("_BLOCKS",this.id,true);}
    static DIRTY_deletedS(id:Id){DIRTY.mark("_BLOCKS",id,true);}
    validate(){} // nothing to validate. Maybe pageTitle cant be set if Block isnt in PAGES ?

    static async new(text="",  waitServerSave=true):Promise<Block>{
        let b = new Block();
        _BLOCKS[b.id = PROJECT.genId()] = b;
        b.text = text;
        b.DIRTY();
        if(waitServerSave)
            await SaveAll();
        return b;
    }
    static async newPage(title="" , waitServerSave=true):Promise<Block>{
        let b = new Block();
        _BLOCKS[b.id = PROJECT.genId()] = b;
        PAGES[b.id] = true;
        DIRTY.mark("PAGES");
        b.pageTitle = title;
        b.DIRTY();
        if(waitServerSave)
            await SaveAll();
        return b;
    }


    async makeVisual(parentElement?:HTMLElement, maxUncollapseDepth=999){
        let bv = (new Block_Visual(this, parentElement, this.collapsed)); // ignore collapsed since we will call updateAll anyways.
        await bv.updateAll(maxUncollapseDepth);
        return bv;
    }

};
RegClass(Block);




//######################
// File: client/3Tag.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/3Tag.ts
//######################


class Tag{ 
    static _serializable_default = {attribs:{},parentTagId:"",childrenTags:[]};
    id:Id;
    name : string | null; // null ako preuzima ime od rootBlock.
    rootBlock? : Id; //ako je tag baziran na bloku

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

    async getName(){
        if(this.name != null)
            return this.name;
        if(this.rootBlock === undefined)
            throw Error(`Tag ${this.id} has no name or rootBlock. Cant getName().`);
        let name = (await BLOCKS(this.rootBlock!)).pageTitle;
        if(name == null)throw Error(`Tag ${this.id} has rootBlock ${this.rootBlock} but it has null pageTitle. Cant getName().`);
        return name;
    }

    validate(){
        if(this.name==null)
            assert_non_null(this.rootBlock,"Tag with null name must be based on a block.");    
    }
    
    DIRTY(){this.validate();DIRTY.mark("_TAGS",this.id);}
    DIRTY_deleted(){DIRTY.mark("_TAGS",this.id,true);}
    static DIRTY_deletedS(id:Id){DIRTY.mark("_TAGS",id,true);}

    static async new(name:string,parentTagId:Id="" ,  waitServerSave=true) :Promise<Tag>{
        let t = new Tag();
        let parent :Tag|null = null;
        
        if(parentTagId!=""){
            parent = await TAGS(parentTagId);
            if(!parent) throw new Error(`Invalid parent: #${parentTagId} not found`);
        }
        
        _TAGS[t.id = PROJECT.genId()] = t;
        t.name = name;

        if(parentTagId!=""){ 
            t.parentTagId = parentTagId;
            parent!.childrenTags.push(t.id);    
        }

        t.DIRTY();

        if(waitServerSave)
            await SaveAll();
        return t;
    }
}
RegClass(Tag);



//######################
// File: client/3View/0Window.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/3View/0Window.ts
//######################

type WindowType = 'view'|'preferences'|'file-preview';

class Window_Tab {
    rootWindow : Window ;
    contentsWindow : Window ;

    constructor(
        rootWindow : Window ,
        contentsWindow : Window){
            this.rootWindow = rootWindow;
            this.contentsWindow = contentsWindow;
        }
}
class Window {
    name: string;
    tabs: Window_Tab[];

    constructor(name:string){
        this.name = name;
        this.tabs = [];
    }

    html(){
        LEEJS.div( {class:"window"},
            LEEJS.div({class:"header"}),
            LEEJS.div({class:"body"},  // is flow , so tabs can be vertical or horizontal.
                LEEJS.div({class:"tabs"}),
                LEEJS.div({class:"contents"}),
            ),
        );
    }
}

//######################
// File: client/3View/1View.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/3View/1View.ts
//######################

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

//######################
// File: client/3View/Logseq/3Page_Visual.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/3View/Logseq/3Page_Visual.ts
//######################

/*
User is viewing a single page.
*/

class Page_Visual{
    pageId : Id;
    children : Block_Visual[];
    childrenHolderEl:HTMLElement;
    alreadyRendered : boolean;
    constructor(){
        this.pageId = "";
        this.children = [];
        this.alreadyRendered = false;

        this.childrenHolderEl = null as any;
    }
    page():Block{
        return _BLOCKS[this.pageId]!;
    }
    block_():Block{
        return _BLOCKS[this.pageId]!;
    }
    block():Promise<Block>{
        return BLOCKS(this.pageId);
    }
    id():Id{
        return this.pageId;
    }
    appendChild(childBV: Block_Visual, idx=-1){
        if(idx<0){
            this.children.push(childBV);
            this.childrenHolderEl.appendChild(childBV.el!);
        }else{
            this.children.splice(idx,0,childBV);
            this.childrenHolderEl.insertBefore(childBV.el,this.childrenHolderEl.children.item(idx));
        }
        // this.renderChildren();
        this.updateBlocksById(this.pageId);
    }
    async deleteChild(childBV:Block_Visual){
        const idx = this.children.indexOf(childBV);
        if(idx>=0){
            this.children[idx].deleteSelf();
            BlkFn.DeleteBlockOnce(childBV.blockId);
            this.children.splice(idx,1);
            let b = (await this.block());
            b.children.splice(idx,1);
            b.DIRTY();
            this.renderChildren();
        }
        // if(selected_block == childBV) selectBlock(null);
        //this.updateStyle();
        this.updateBlocksById(this.pageId);
    }
    async renderChildren(maxUncollapseDepth=999){
        if(this.children.length>0){
            this.children.forEach(c=>c.deleteSelf());
        }
        this.children = [];
        this.childrenHolderEl.innerHTML = "";
        
        let b = await this.block();
        for(let i = 0; i<b.children.length; i++){
            //if(_BLOCKS[b.children[i]]==null) continue; // skip not yet loaded. [TODO] add a button to load more.
            let b2 = await BLOCKS(b.children[i],2);
            let bv2 = await b2.makeVisual(this.childrenHolderEl, maxUncollapseDepth);
            this.children.push(bv2);
            //await bv2.renderChildren();
            //await makeBlockAndChildrenIfExist(bv2);
        }   
    }

    async openPage(newPageId:Id){
        const maxUncollapseDepth = 999;

        this.childrenHolderEl = STATIC.blocks;
        await loadBlock(newPageId,maxUncollapseDepth);
        this.pageId = newPageId;
        this.children = [];
        
        await CheckAndHandle_PageNoBlocks();
        await this.makePage(maxUncollapseDepth);
    }
    async makePage(maxUncollapseDepth=0){
        if(this.alreadyRendered) throw new Error("Page is being made again. Why?");
        this.alreadyRendered = true;

        const p = this.page();
        this.children = [];
        document.title = p.pageTitle ?? "";
        this.childrenHolderEl.innerHTML = ""; // clear
        /*
        async function makeBlockAndChildrenIfExist(bv:Block_Visual){
            //bv already exists and is created. Now we need to create visuals for its children (and theirs).
            //create block_visuals for children of bv, and repeat this for them recursively
            let b = await bv.block();
            bv.children = [];
            if(bv.collapsed == false){
                for(let i = 0; i<b.children.length; i++){
                    //if(_BLOCKS[b.children[i]]==null) continue; // skip not yet loaded. [TODO] add a button to load more.
                    let b2 = await BLOCKS(b.children[i]);
                    let bv2 = b2.makeVisual(bv.childrenHolderEl);
                    bv.children.push(bv2);
                    await makeBlockAndChildrenIfExist(bv2);
                }
            }
        }*/
        
        this.renderChildren();
    }
    updateBlocksById(id:Id, action:null/*unknown*/|'deleted'|'edited'=null){
        //TODO("Iterisi sve otvorene children. Podrzi deleted.");
        /*
        function updateBlockView(bv:Block_Visual){
            if(bv.blockId != id) return;
            bv.updateAll();
        }
        this.children.forEach(c=>updateBlockView(c));
        */
    }
};

//######################
// File: client/3View/Logseq/4View.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/3View/Logseq/4View.ts
//######################

/// <reference lib="dom" />


//import {b} from "./BLOCKS.ts";
declare var TinyMDE : any;
declare var LEEJS : any;
type TMDE_InputEvent = {content:string,lines:string[]};

let view :Page_Visual = new Page_Visual();;

let selected_block :Block_Visual|null = null;
let inTextEditMode = false;


const el_to_BlockVis = {_: new WeakMap<HTMLElement,Block_Visual>(),
    get(key:HTMLElement , allowNull = false){
        let r = this._.get(key) ?? null;
        if(!allowNull) assert_non_null(key,"key");
        return r;
    },
    set(key:HTMLElement,value:Block_Visual){
        assert_non_null(key,"key"); assert_non_null(value,"value");
        this._.set(key,value);
    },
    delete(key:HTMLElement){
        assert_non_null(this._.has(key),"[Deleting nonexistent htmlElement key]");
        this._.delete(key);
    }
}
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
const STATIC = {
    _body : document.body,
    style_highlighter : document.getElementById('highlighterStyle')!,
    blocks : document.getElementById('blocks')!,
    pageView : document.getElementById('pageView')!,
};

function propagateUpToBlock(el:HTMLElement,checkSelf=true):Block_Visual|null{
    
    if(checkSelf && el.hasAttribute("data-b-id"))
        return assert_non_null(el_to_BlockVis.get(el) , "el->bv",DEBUG);
    
    while(el!=STATIC.blocks && el!=document.body){
        el = el.parentElement!;
        if(el && el.hasAttribute("data-b-id"))
            return assert_non_null(el_to_BlockVis.get(el) , "el->bv",DEBUG);
    }
    return null;

}
function updateSelectionVisual(){
    if(selected_block==null){
        STATIC.style_highlighter.innerHTML = "";
        return;
    }
    STATIC.style_highlighter.innerHTML = `div[data-b-id="${selected_block!.blockId}"]{\
    background-color: var(--block-bg-selected-color) !important;\
    /* padding-left: 0px; */\
    /*border-left: 8px solid #555555 !important;*/\
    }
    div[data-b-id="${selected_block!.blockId}"]>div.editor.TinyMDE{\
    background-color: var(--block-editor-bg-selected-color) !important;\
    }
    `;
}


/**
 * If page has 0 blocks, make one automatically.
 * we dont want pages without blocks.
 */
async function CheckAndHandle_PageNoBlocks(){
    if(view.pageId == "") return;
    let p = (await BLOCKS(view.pageId));
    if(p.children.length>0)return;
    NewBlockInside(null);
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
function ShiftFocus(bv:Block_Visual, shiftFocus:number /*SHIFT_FOCUS*/, skipCollapsed=true){
    if(bv == null) throw Error("No selection shift focus.");

    function bv_above_sameLevel(bv:Block_Visual) : Block_Visual|null {
        assert_non_null(bv);
        /* Ako smo PRVO dete vracamo null (nobody above us) */
        const i = bv.index();
        if(i == 0) return null;
        return (bv.parentChildrenArray())[i-1];
    }
    function bv_below_sameLevel(bv:Block_Visual) : Block_Visual|null {
        assert_non_null(bv);
        /* Ako smo ZADNJE dete vracamo null (nobody below us) */
        const i = bv.index();
        const arr = bv.parentChildrenArray();
        // console.error(i,arr);
        if(i >= (arr.length-1)) return null;
        return (arr)[i+1];
        
    }
    function bv_lowestChild_allLevels(bv:Block_Visual) : Block_Visual|null{
        assert_non_null(bv);
        /*
        A       <-- bv
        .. B
        .. .. H
        .. .. C
        .. .. .. S
        .. J
        .. .. L
        .. .. M     <-- return this
        */
        if(bv.collapsed || bv.children.length==0) return bv;  /* bv nema decu te je on lowest. */
        const lastChild = bv.lastChild();
        if(!lastChild) return null;
        return bv_lowestChild_allLevels(lastChild);
    }
    function bv_above_anyLevel(bv:Block_Visual) : Block_Visual|null {
        assert_non_null(bv);
        /* Iznad nas moze biti bilo ko. To zavisi dal je na nekom levelu neko iznad nas collapsed ili expanded:
        A
        .. B
        .. .. C    <-- return this
        G          <-- we are here
        
        Primecujemo da je A an istom nivou kao i G.
        dakle trebamo naci above us na nasem nivou.
        ako nema, idemo na naseg parenta i ponavljamo proces.
        */
       let above_sameLvl = bv_above_sameLevel(bv);
       
       return( (above_sameLvl == null) ?
            //nobody above us on same level. Therefore only our parent is above us (if they exist, else we are topmost of the whole page so return null anyways).
            (bv.parent()) :
            // ovaj iznad nas je ill collapsed (te nam treba on, a funkcije hendluje to), il ima (nested potencijalno) decu. Nama treba najnize dete cele hiearhije.
            (bv_lowestChild_allLevels(above_sameLvl)) );

    }
    function bv_below_anyLevel(bv:Block_Visual) : Block_Visual|null {
        assert_non_null(bv);
        /*
        // main trivial case : we have children
        A
        .. B
        .. .. C     <-- we are here
        .. .. ..  G        <-- return this

        // second trivial case: below us on same level
        A
        .. B
        .. .. C     <-- we are here
        .. .. G        <-- return this

        // non trivial:
        
        A
        .. B
        .. .. C     <-- we are here
        .. G        <-- return this
        
        or (arbitrarily deeper depth)

        A
        .. B
        .. .. C     <-- we are here
        G           <-- return this
        
        
        znaci odemo na naseg parenta.
        vratimo ako postoji neko below naseg parenta na istom nivou (njegovom).

        ponovimo proces.
        na kraju il returnujemo il je parent==null
        */

        // main trivial case : we have children therefore below us is our first child.
        if(bv.collapsed==false && bv.children.length>0)
            return bv.firstChild();

        // second trivial case:  there is someone below us on our level
        const below_sameLvl = bv_below_sameLevel(bv);
        if(below_sameLvl) return below_sameLvl;

        // No more trivial cases. We must go to our parent.
        while(true){
            const bv_par = bv.parent();
            if(bv_par==null) return null;  // if parent is null then we are on page root, and last on page (otherwise we would have had below_sameLevel). so nobody below us.
            const parent_below_sameLvl = bv_below_sameLevel(bv_par);
            if(parent_below_sameLvl)
                return parent_below_sameLvl;
            bv=bv_par;
            //repeat.
        }
    }


    //if skipCollapsed, then it wont go into children of collapsed blocks (not visible).
    let focusElement = null as Block_Visual|null;
    if(shiftFocus == SHIFT_FOCUS.above_notOut){
        focusElement = bv_above_sameLevel(bv);
    }else if(shiftFocus == SHIFT_FOCUS.below_notOut){
        focusElement = bv_below_sameLevel(bv);
    }else if(shiftFocus == SHIFT_FOCUS.above){
        focusElement = bv_above_anyLevel(bv);    
    }else if(shiftFocus == SHIFT_FOCUS.below){
        focusElement = bv_below_anyLevel(bv);
    }else if(shiftFocus == SHIFT_FOCUS.firstChild){
        focusElement = bv.firstChild();
    }else if(shiftFocus == SHIFT_FOCUS.parent){ //throw new Error("[TODO]");
        focusElement = bv.parent();
    }else throw new Error("shiftFocus value must be one of/from SHIFT_FOCUS const object.")
    
    if(focusElement){
        FocusElement(focusElement.el);
        return focusElement;
    }
    return null;
}

async function NewBlockAfter(thisBlock:Block_Visual){
    let parentBlockVis = thisBlock.parentOrPage(); //Get parent or Page of view / window.
    let parentBlock = parentBlockVis.id();
    let parentHolder = parentBlockVis.childrenHolderEl;

    const idx = thisBlock.index()+1;

    let blockVis = await (await Block.new("")).makeVisual(parentHolder);
    await BlkFn.InsertBlockChild(parentBlock,blockVis.blockId,idx);
    parentBlockVis.appendChild(blockVis,idx);
    
    selectBlock(blockVis,inTextEditMode);
    view!.updateBlocksById(parentBlock);
    return blockVis;
}
async function NewBlockInside(thisBlockVis:Block_Visual|Page_Visual|null , idx=-1){
    if(thisBlockVis==null) thisBlockVis = view!;
    let parentBlock = thisBlockVis.id();
    let parentHolder = thisBlockVis.childrenHolderEl;

    let blockVis = await (await Block.new("")).makeVisual(parentHolder);
    await BlkFn.InsertBlockChild(parentBlock,blockVis.blockId,idx);
    thisBlockVis.appendChild(blockVis,idx);
    
    selectBlock(blockVis,inTextEditMode);
    view!.updateBlocksById(parentBlock);
    return blockVis;
}
// async function NewBlockInsidePage(){
//     // let h = view.el!;//.parentElement!; //parent node
//     let blockVis = await (await Block.new("")).makeVisual();
//     await BlkFn.InsertBlockChild(view.pageId,blockVis.blockId, (await BLOCKS(view.pageId)).children.length); //as last
    
//     // thisBlock.block.children.push(blockVis.block.id);

//     view.childrenHolderEl.appendChild(blockVis.el);
//     view.children.push(blockVis);

//     selectBlock(blockVis,inTextEditMode);
//     return blockVis;
// }

STATIC._body.addEventListener('click',(e:MouseEvent)=>{
    if(!(e.target) || propagateUpToBlock(e.target as HTMLElement) == null){
        selectBlock(null);
    }
});
STATIC._body.addEventListener('keydown',(e:KeyboardEvent)=>{
    if(e.key == 'Tab'){
        SEARCHER.toggleVisible();
        e.preventDefault();
        e.stopPropagation();
    }
});
STATIC.blocks.addEventListener('keydown',async (e:KeyboardEvent)=>{
    if(ACT.isEvHandled(e)) return;
    ACT.setEvHandled(e);
    // console.log(e);

    HELP.logCodeHint("Navigation","Listeners/handlers for navigation keys.");

    let cancelEvent = true;
    
    // [TODO] if(e.ctrlKey)  then move around a block (indent,unindent , collapse,expand)
    if(e.key == 'ArrowUp'){
        if(selected_block) 
            ShiftFocus(selected_block, e.shiftKey?SHIFT_FOCUS.above_notOut:SHIFT_FOCUS.above);
    }else if(e.key == 'ArrowDown'){
        if(selected_block) 
            ShiftFocus(selected_block, e.shiftKey?SHIFT_FOCUS.below_notOut:SHIFT_FOCUS.below);
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
    }else if(e.key=='Tab'){
        if(selected_block){
            ShiftFocus(selected_block,e.shiftKey?SHIFT_FOCUS.above:SHIFT_FOCUS.below);
        }
    }else if(e.key == 'Escape'){
        selectBlock(null);
    }else if(e.key=='Enter'){

        if(selected_block){
            if(e.shiftKey){
                if(e.ctrlKey)
                    selectBlock( await NewBlockInside(selected_block.parentOrPage(),selected_block.index()) ,true);
                else
                    selectBlock(await NewBlockInside(selected_block), true);
            }
            else if(e.ctrlKey){
                selectBlock( await NewBlockAfter(selected_block) ,true);
            }
            else if(selected_block && !inTextEditMode){
                selectBlock(selected_block,true);
            }
        }
        //console.log(e);
    }else if(e.key=='Delete'){
        if(selected_block){
            //prepare things so we can later select a new element after deleting
            const parent = selected_block.parent();
            const parArr = selected_block.parentChildrenArray();
            const selfIdx = selected_block.index();

            //delete self
            selected_block.parentOrPage().deleteChild(selected_block);
            
            //select new element
            if(parArr.length == 0){
                selectBlock(parent);
            }else if(selfIdx>=parArr.length){
                selectBlock(parArr.at(-1)!);  // we were last so select last
            }else{
                selectBlock(parArr[selfIdx]);
            }
        }
    }else if(e.key==' '||e.key=='Space'){ // ' ' actually matches, 'Space' doesnt
        if(selected_block) 
            selected_block.collapseTogle();
    }else{
        cancelEvent = false;
    }

    if(cancelEvent){e.preventDefault();e.stopImmediatePropagation();}

    // console.log("BLOCKS:",e);
});




//######################
// File: client/3View/Logseq/5Blocks_Visual.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/3View/Logseq/5Blocks_Visual.ts
//######################

/// <reference lib="dom" />


declare var TinyMDE : any;
declare var LEEJS : any;


class Block_Visual{
    blockId:Id;
    children:Block_Visual[];
    
    collapsed : boolean;

    // html elements:
    el:HTMLElement;  //block element
    editor:any;  //editor inside block
    childrenHolderEl:HTMLElement;

    finished:boolean; //was it fully rendered or no (just constructed (false) or renderAll called also (true))


    constructor(b:Block,parentElement?:HTMLElement , collapsed = true){
        this.blockId = b.id;
        this.children = [];
        this.collapsed = collapsed;
        this.finished = false;
        
        this.el = LEEJS.div({
            class:"block",
            $bind:b, $bindEvents:b, "data-b-id":b.id, 
            tabindex:"-1",
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
        
        this.el.addEventListener('focus',async (ev:FocusEvent)=>{
            if(ACT.isEvHandled(ev)) return;
            ACT.setEvHandled(ev);
            selectBlock(this);
            ev.stopImmediatePropagation();
            ev.preventDefault();
        });
        this.editor.e.addEventListener('focus',async (ev:FocusEvent)=>{
            if(ACT.isEvHandled(ev)) return;
            ACT.setEvHandled(ev);
            selectBlock(this);
            ev.stopImmediatePropagation();
            ev.preventDefault();
        });
        this.editor.e.addEventListener('click',async (ev:MouseEvent)=>{
            if(ACT.isEvHandled(ev)) return;
            // console.error("editor click");
            ACT.setEvHandled(ev);

            //console.log("click e");
            let c = ACT.fn_OnClicked(this.editor.e);
            if(c==ACT.DOUBLE_CLICK){
                selectBlock(this,true);
            }else
                selectBlock(this);
        });
        this.el.addEventListener('click',async (ev:MouseEvent)=>{
            if(ACT.isEvHandled(ev)) return;
            // console.error("El click");
            ACT.setEvHandled(ev);

            //console.log("click e");
            let c = ACT.fn_OnClicked(this.editor.e);
            if(c==ACT.DOUBLE_CLICK){
                let xFromLeftEdge = ev.clientX - this.el.getBoundingClientRect().x;
                if(xFromLeftEdge<=8) //alert(xFromLeftEdge + "CLICKED");
                {
                    this.collapseTogle();
                }
                // alert("CLICKED");
                    // if(ev.x)
            //    selectBlock(this,true);
            }
            //else selectBlock(this);
        });

        this.editor.addEventListener('input',async (ev:TMDE_InputEvent)=>{
            //let {content_str,linesDirty_BoolArray} = ev;
            b.text = ev.content;//content_str;
            b.DIRTY();
        });
        this.editor.e.addEventListener('keydown',async (e:KeyboardEvent)=>{
            if(ACT.isEvHandled(e)) return;
            ACT.setEvHandled(e);

            HELP.logCodeHint("Navigation","Listeners/handlers inside Visual_Block");
            // return;
            // console.log(e);
            let cancelEvent = true;
            if(e.key == 'Escape'){
                // if(document.activeElement == this.editor.e){
                    selectBlock(this,false);
                // }else{
                //     selectBlock(null);
                // }
            }
            // else if(e.key=='Tab'){
            //     ShiftFocus(this, e.shiftKey?SHIFT_FOCUS.above:SHIFT_FOCUS.below);
            // }
            else if(e.key=='Enter'){
                if(e.ctrlKey){ //insert new block below current block
                    selectBlock(await NewBlockAfter(this), true);
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
                else if(e.shiftKey){
                    selectBlock(await NewBlockInside(this), true);
                    // e.shiftKey = false;
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    
                }else{
                    cancelEvent = false;
                }

            }else{
                cancelEvent = false;
            }
            if(cancelEvent)
                {e.preventDefault();e.stopImmediatePropagation();}
        });
    }

    
    _block() :Block|null{
        return _BLOCKS[this.blockId];
    }
    block() :Promise<Block>{
        return BLOCKS(this.blockId);
    }
    id():Id{
        return this.blockId;
    }
    
    parent():Block_Visual|null{
        return propagateUpToBlock( this.el.parentElement! );
    }
    parentOrPage():Block_Visual|Page_Visual{
        const p = this.parent();
        if(p==null) return view!;
        return p;
    }
    firstChild() : Block_Visual|null {
        if(this.children.length==0) return null;
        return this.children[0];
    }
    lastChild() : Block_Visual|null {
        if(this.children.length==0) return null;
        return this.children.at(-1)!;
    }
    index():number{
        let p = this.parent();
        if(p) return p.children.indexOf(this);
        return view!.children.indexOf(this);
    }
    parentChildrenArray() : Block_Visual[]{    
        let p = this.parent();
        if(p) return p.children;
        return view!.children;
    }
    appendChild(childBV: Block_Visual, idx=-1){
        if(idx<0){
            this.children.push(childBV);
            this.childrenHolderEl.appendChild(childBV.el!);
        }else{
            this.children.splice(idx,0,childBV);
            this.childrenHolderEl.insertBefore(childBV.el,this.childrenHolderEl.children.item(idx));
        }
        // this.renderChildren();
        this.updateStyle();
    }
    async deleteChild(childBV:Block_Visual){
        const idx = this.children.indexOf(childBV);
        if(idx>=0){
            this.children[idx].deleteSelf();
            BlkFn.DeleteBlockOnce(childBV.blockId);
            this.children.splice(idx,1);
            let b = (await this.block());
            b.children.splice(idx,1);
            b.DIRTY();
            this.renderChildren();
        }
        if(selected_block == childBV) selectBlock(null);
        this.updateStyle();
        view!.updateBlocksById(this.blockId);
    }
    
    deleteSelf(){
        el_to_BlockVis.delete(this.el);
        this.el.parentElement?.removeChild(this.el);
    }
    updateStyle(){
        if(this.collapsed)
            this.childrenHolderEl.style.display = "none";
        else
            this.childrenHolderEl.style.display = "inherit";

        if(this._block()!.children.length==0){
            this.el.classList.add("empty");   
        }else{
            this.el.classList.remove("empty");
            if(this.collapsed) this.el.classList.add("collapsed");
            else this.el.classList.remove("collapsed");
        }

    }
    async updateAll(maxUncollapseDepth=999){
        this.collapsed = (await this.block()).collapsed;
        if(maxUncollapseDepth<=0) this.collapsed = true;
        await this.renderChildren(maxUncollapseDepth);
        this.updateStyle();
        this.finished = true;
        // if(this.collapsed == false && maxUncollapseDepth>1){
        //     for(let i = 0; i < this.children.length; i++)
        //         await this.children[i].updateAll(maxUncollapseDepth-1);
        // }
    }
    async renderChildren(maxUncollapseDepth=999){
        if(this.children.length>0){
            this.children.forEach(c=>c.deleteSelf());
        }
        this.children = [];
        this.childrenHolderEl.innerHTML = "";
        if(this.collapsed == false){
            let b = await this.block();
            for(let i = 0; i<b.children.length; i++){
                //if(_BLOCKS[b.children[i]]==null) continue; // skip not yet loaded. [TODO] add a button to load more.
                let b2 = await BLOCKS(b.children[i],2);
                let bv2 = await b2.makeVisual(this.childrenHolderEl, maxUncollapseDepth);
                this.children.push(bv2);
                //await bv2.renderChildren();
                //await makeBlockAndChildrenIfExist(bv2);
            }
        }   
    }
    async collapseTogle(setValue:boolean|null=null){
        // console.error("Toggle ",this.blockId,this.collapsed);
        // console.trace();

        if(setValue!==null) this.collapsed = setValue;
        else this.collapsed = !this.collapsed;
        const b = (await this.block());
        if(b.collapsed != this.collapsed){
            b.collapsed = this.collapsed;
            b.DIRTY();
        }

        // console.error("Toggle2 ",this.blockId,this.collapsed);
        await this.renderChildren();
        this.updateStyle();
    }
}


//######################
// File: client/init.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/init.ts
//######################


setTimeout((async function InitialOpen(){ //ask user to open some page (or make a page if none exist)
    await LoadInitial();

    autosaveInterval = setInterval(()=>{ //autosave timer 
        SaveAll();
    },8000);

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
        if(pageName == null || (srch=(await BlkFn.SearchPages(pageName,'includes'))).length < 1){
            // console.error(srch);
            window.location.reload();
            return;
        }

        await view.openPage(srch[0]);
    }
}),1);



