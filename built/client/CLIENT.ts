
type Id = string;
type TMap<Tk,Tv> = {[index:string]:Tv};

type objectA = {[index:string]:any};

let TODO = (txt:string="")=>{throw new Error("[TODO]"+txt);};
let WARN = (txt:string="")=>{};
type Ttodo = any; //when youre too lazy to specify a full type

Array.prototype.remove = function(item:any){
    while(true){
        let idx = this.indexOf(item);
        if(idx!=-1)
            this.splice(idx,1);
        else break;
    }
    return this;
}

function cast<T> (obj: any){
    return obj as T;
}
function castIsnt(obj: any, ...isnt: any){
    for(let i=0,il=isnt.length;i<il;i++)
        if(obj === isnt[i]) throw new Error("Cast failed.");
    return obj;
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
function __Deserialize(o:objectA):any{
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
        delete o.$$C;
        _class = __IdToClass[classId];
        if(_class == null) throw new Error("Class not recognised:",classId);
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
function JSON_Deserialize(str:string):any{
    console.log(str);
    return __Deserialize( JSON.parse(str) );
}

/*******************
 LIMITATIONS TO SERIALIZATION

 NO CIRCULAR REFERENCES.
 No arrays with special properties or classes.
*********************/
type _AttrPath = string|string[];
class AttrPath{
    // path: string[];
    static parse(inp:string|string[]):string[]{
        if(typeof(inp) == 'string')
            return inp.split('.');
        else if(Array.isArray(inp))
            return inp;
        else throw new Error("Cant parse path, not string or array");
        /*
        else if(Array.isArray((inp as any).path)){
            return Object.setPrototypeOf(inp,AttrPath);
        }
        // if(typeof(inp) == 'string' || ){
        return new AttrPath(inp);
        // }else return inp;
        */
    }
    
    // static shift(path:string[]){
    //     if(path.length>0){
    //         return path.shift();
    //     }else return null;
    // }

}
// RegClass(AttrPath);
/*
What are common diff situations?
1. new (nested) key (and value)
2. (nested) key removed
3. promena vrednosti ((nested) key)

ako se menja higher level key, brise se lower level key
*/
class Diff{
    path:string[];
    value:any;
    constructor(p:_AttrPath,v:any){
        this.path = AttrPath.parse(p);
        this.value = v;
    }
}
RegClass(Diff);
class DiffList{
    list:Diff[];
    constructor(){
        this.list = [];
    }
    push(d:Diff){
        for(let i=0;i<this.list.length;i++){
            this.list[i].path
        }
        this.list.push(d);
    }
}
RegClass(DiffList);let $IS_CLIENT$ = true; // some functions check this if shared code on S and C/** Clone of some server object. */
class ServerProxyObject<Tkey,Tvalue>{
    serverObjName:string; // BLOCKS
    // objCached:TMap<Id,Tvalue|null>; // BLOCKS cached value
    objProxy:TMap<Id,Promise<Tvalue>>; // proxy to BLOCK which handles async loading
    objCached_getFn : Function;

    get objCached() :TMap<Id,Tvalue|null> {
        return this.objCached_getFn();
    }
    constructor(serverObjName:string){
        this.serverObjName = serverObjName;
        // this.objCached = {};
        this.objCached_getFn = new Function(`return _${serverObjName};`);
        //new Function()

        const SELF = this;
        this.objProxy = new Proxy({},{
            async get(target,key:string,receiver){
                if(SELF.objCached[key] === null) //no cached value present
                    SELF.objCached[key] = await rpc(`((k)=>(${SELF.serverObjName}[k]))`,key) as Tvalue;
                return SELF.objCached[key] as Tvalue;
            },
            set(target,key,newValue,receiver){
                throw new Error("Cannot set whole object value. Use the 'set' method.");
                return true;
            }
        }) as {[index:string]:Promise<Tvalue>};   
    }
    static new<Tkey,Tvalue>(serverObjName:string) :TMap<Id,Promise<Tvalue>>{
    //:[ TMap<Id,Tvalue|null>, TMap<Id,Promise<Tvalue>>, ServerProxyObject<Tkey,Tvalue> ]{
        let t = new ServerProxyObject<Tkey,Tvalue>(serverObjName);
        return t.objProxy;
        //return [t.objCached,t.objProxy,t];
    }
};async function set(path:_AttrPath,value:any){
    // path=AttrPath.parse(path);
    return (await rpc(`server_set`,path,value));
}

/**
 * Like a normal array but it mocks pop,push,splice functions, 
 * so when called it calls this.set() function of object.
 * Telling it the array was modified.
 */
class ProxyArraySetter{
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
/** same as array. */
declare type TProxyArraySetter<T> = T[];

type ServerMsg = {n:string,d?:any,cb?:Function}; //n=name
let Server = {
    __WebSock : new WebSocket("ws://localhost:9020"),
    __SockOpen : false,
/*
new Promise((resolve, reject) => {
    WebSock.onopen(()=>resolve());
});*/
    MsgType:{
        saveAll:"save_all", //data:null
        loadAll:"load_all", //data:null
        load:"load", //data: attrSelector[]
        eval:"eval", //code as string
    },
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
            this.__WebSock.send(JSON_Serialize({n:msg.n,d:msg.d}));

        if(promise!==null) return promise;
    }
};

Server.__WebSock.onopen = (event) => {
    Server.__SockOpen = true;
    for(let i = 0; i < Server.__MsgQueue.length; i++) //send unsent ones
        Server.__WebSock.send(JSON_Serialize({n:Server.__MsgQueue[i].n,d:Server.__MsgQueue[i].d}));
        

    console.log("Open");
    // WebSock.send("Here's some text that the server is urgently awaiting!");
};

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

class Block{
    static _serializable_default = {children:[],tags:[],attribs:{},refCount:1};

    /*
    pageTitle?:string;  //if has title then its a page!

    id:Id;
    refCount:number;
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
    }*/
    
    id:Id;
    
    _pageTitle?:string;  //if has title then its a page!

    _refCount:number;
    _text:string;
    //usually-empty
    _children:TProxyArraySetter<Id>;
    _tags:TProxyArraySetter<Id> ;
    _attribs:objectA;

    get pageTitle(){return this._pageTitle;}
    set pageTitle(v){this.set('_pageTitle',v);}
    //pageTitle_set(v:string){ this.set('_pageTitle',v); return v;}
    get refCount(){return this._refCount;}
    get text(){return this._text;}
    set text(v){this.set('_text',v);}
    //text_set(v:string){ this.set('_text',v); return v;}
    get children(){return this._children;}
    // set children(v:any[]){this._children.splice(0,this._children.length,...v);}
    get tags(){return this._tags;}
    // set tags(v:any[]){this._tags.splice(0,this._tags.length,...v);}
    get attribs(){return this._attribs;}

    constructor(){
        this.id = "";
        this._text = "";
        this._refCount = 1;
        this._children = ProxyArraySetter.__new(this,"_children");
        this._tags = ProxyArraySetter.__new(this,"_tags");
        this._attribs = {};
    }
    __serialize__(){ //called by serializer.
        return Object.setPrototypeOf({
            id:this.id,
            pageTitle:this._pageTitle,
            refCount:this._refCount,
            text:this._text,
            children:this._children, /*serializer handles as normal array*/
            tags:this._tags, /*serializer handles as normal array*/
            attribs:this._attribs
        },Block.prototype);
    }
    static __deserialize__(o:any){
        // for(let k in Block._serializable_default){
        //     if(o[k]===undefined)
        //         o[k] = Block._serializable_default[k];
        // }
        let b = new Block();
        b.id = o.id;
        b._pageTitle = o.pageTitle;
        b._refCount = o.refCount;
        b._text = o.text;
        b._children = ProxyArraySetter.__new(b,"_children",o.children);
        b._tags = ProxyArraySetter.__new(b,"_tags",o.tags);
        b._attribs = o.attribs;
        return b;
    }
    async set(path:_AttrPath,value:any,doAssign=true){
        path = AttrPath.parse(path);
        console.log("SETTING ",path);
        let field = path[0];
        if(field.startsWith("_")){
            if(doAssign)
                (this as any)[field] = value;
            field = field.substring(1);
            path[0] = field;
        }else{
            if(doAssign){
                if((this as any)['_'+field] !== undefined)
                    (this as any)['_'+field] = value;
            }
        }
        return await rpc(`server_set`,["BLOCKS",this.id,...path],value);
    }
    static async new(text=""):Promise<Block>{
        let b = (await rpc(`Block.new`,text)) as Block;
        _BLOCKS[b.id] = b;
        return b;
    }
    static async newPage(title=""):Promise<Block>{
        let b = await rpc(`Block.newPage`,title) as Block;
        _BLOCKS[b.id] = b;
        PAGES[b.id] = true;
        return b;
    }
    makeVisual(parentElement?:HTMLElement){
        return (new Block_Visual(this,parentElement));
    }
    // deserialize_fn(){
    //     if(this.children===undefined) this.children = [];
    //     if(this.attribs===undefined) this.attribs = {};
    // }
    // serialize_fn(){
    //     let s = `{${SerializeClass(this)
    //     },id:${this.id},text:"${EscapeStr(this.text)}"`;
    //     if(this.children.length>0) s+=`,children:${JSON_Serialize(this.children)}`;
    //     if(this.attribs!=null /*empty object*/) s+=`,attribs:${JSON_Serialize(this.attribs)}`;
    //     return s+"}";
    // }

};
RegClass(Block);

class Tag{
    static _serializable_default = {attribs:{},parentTagId:"",childrenTags:{}};
    id:Id;
    _name : string;
    _parentTagId:Id;
    _childrenTags:TProxyArraySetter<Id>;
    _blocks:TProxyArraySetter<Id>;
    _attribs:objectA;

    get name(){return this._name;}
    // set name(v:string){this.set("_name",v);}
    // async name_set(v:string){return await this.set("_name",v);}
    get parentTagId(){return this._parentTagId;}
    get childrenTags(){return this._childrenTags;}
    get blocks(){return this._blocks;}
    get attribs(){return this._attribs;}

    constructor(){
        this.id = "";
        this._name = "";
        this._parentTagId = "";
        this._childrenTags = ProxyArraySetter.__new(this,"_childrenTags");
        this._blocks = ProxyArraySetter.__new(this,"_blocks");
        this._attribs = {};
    }
    __serialize__(){
        return Object.setPrototypeOf({
            id:this.id,
            name:this._name,
            parentTagId:this._parentTagId,
            childrenTags:this._childrenTags,
            blocks:this._blocks,
            attribs:this._attribs
        },Tag.prototype);
    }
    static __deserialize__(o:any){
        let t = new Tag();
        t.id = o.id;
        t._name = o.name;
        t._parentTagId = o.parentTagId;
        t._childrenTags = ProxyArraySetter.__new(this,"_childrenTags",o.childrenTags);
        t._blocks = ProxyArraySetter.__new(this,"_blocks",o.blocks);
        t._attribs = o.attribs;
        return t;
    }
    async set(path:_AttrPath,value:any,doAssign=true){
        path = AttrPath.parse(path);
        console.log("SETTING ",path);
        let field = path[0];
        if(field.startsWith("_")){
            if(doAssign)
                (this as any)[field] = value;
            field = field.substring(1);
            path[0] = field;
        }else{
            if(doAssign){
                if((this as any)['_'+field] !== undefined)
                    (this as any)['_'+field] = value;
            }
        }
        return await rpc(`server_set`,["TAGS",this.id,...path],value);
    }
    static async new(name:string){
        let t =  await rpc(`Tag.new`,name) as Tag;
        _TAGS[t.id] = t;
        if(t._parentTagId)
            (await TAGS[t._parentTagId])._blocks.push(t.id);
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
        document.title = p.pageTitle;
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
    let p = (await BLOCKS[view.pageId]);
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
    await BlkFn.InsertBlockChild(view.pageId,blockVis.block.id, (await BLOCKS[view.pageId]).children.length); //as last
    
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
                    
                    // var keyboardEvent = new KeyboardEvent('keydown',{
                    //     key:"Enter",

                    //     // 'keydown', // event type: keydown, keyup, keypress
                    //     // true, // bubbles
                    //     // true, // cancelable
                    //     // window, // view: should be window
                    //     // false, // ctrlKey
                    //     // false, // altKey
                    //     // false, // shiftKey
                    //     // false, // metaKey
                    //     // 13, // keyCode: unsigned long - the virtual key code, else 0
                    //     // 0,
                    // });

                    // var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? 'initKeyboardEvent' : 'initKeyEvent';
                    // keyboardEvent[initMethod](
                    // 'keydown', // event type: keydown, keyup, keypress
                    // true, // bubbles
                    // true, // cancelable
                    // window, // view: should be window
                    // false, // ctrlKey
                    // false, // altKey
                    // false, // shiftKey
                    // false, // metaKey
                    // 13, // keyCode: unsigned long - the virtual key code, else 0
                    // 0, // charCode: unsigned long - the Unicode character associated with the depressed key, else 0
                    // );
                    
                    //e.target.dispatchEvent(keyboardEvent);
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
let SEARCHER = (new Searcher());
let $CL=true;
const BlkFn = {
async RemoveTagFromBlock (blockId, tagId) {
    (await rpc(`BlkFn.RemoveTagFromBlock`,blockId,tagId));  
    const t = _TAGS[tagId];
    if ($CL && !t) return;
    t._blocks.splice(t._blocks.indexOf(blockId), 1); //remove block from tag
    const b = _BLOCKS[blockId];
    if ($CL && !b) return;
    b._tags.splice(b._tags.indexOf(tagId), 1); //remove tag from block
  },
async RemoveAllTagsFromBlock (blockId) {
    (await rpc(`BlkFn.RemoveAllTagsFromBlock`,blockId));  
    const b = _BLOCKS[blockId];
    if ($CL && !b) return;
    for(let i = 0; i < b._tags.length; i++){
      const t = _TAGS[b._tags[i]];
      if ($CL && !t) continue;
      t._blocks.splice(t._blocks.indexOf(blockId), 1); //remove block from tag
    }
    b._tags = []; //    b._tags.splice(b._tags.indexOf(tagId),1); //remove tag from block
  },
async DeleteBlockOnce (id){
	(await rpc(`BlkFn.DeleteBlockOnce`,id));
	await ReLoadAllData();
},
async DeleteBlockEverywhere (id){
	(await rpc(`BlkFn.DeleteBlockEverywhere`,id));
	await ReLoadAllData();
},
async InsertBlockChild (parent, child, index) /*:Id[]*/ {
    (await rpc(`BlkFn.InsertBlockChild`,parent,child,index));  
    const p = _BLOCKS[parent];
    if ($CL && !p) return;
    const l = p._children;
    if (index >= l.length) {
      l.push(child);
    } else {
      l.splice(index, 0, child);
    }
  // return l;
  },
async SearchPages (title, mode = 'exact'){
	return (await rpc(`BlkFn.SearchPages`,title,mode));
},
async SearchTags (title, mode = 'exact'){
	return (await rpc(`BlkFn.SearchTags`,title,mode));
},
async HasTagBlock (tagId, blockId, $CL = false) {
      
    if (!$CL) return _TAGS[tagId]._blocks.indexOf(blockId) != -1;
    if ($CL) {
      if (_TAGS[tagId]) return _TAGS[tagId]._blocks.indexOf(blockId) != -1;
      if (_BLOCKS[blockId]) return _BLOCKS[blockId]._tags.indexOf(tagId) != -1;
      return (await rpc(`BlkFn.HasTagBlock`,tagId,blockId,$CL));
    }
  },
async TagBlock (tagId, blockId) /*:boolean*/ {
    (await rpc(`BlkFn.TagBlock`,tagId,blockId));  
    if (await this.HasTagBlock(tagId, blockId, $CL)) return; // false;
    _TAGS[tagId]._blocks.push(blockId);
    _BLOCKS[blockId]._tags.push(tagId);
  // return true;
  },
async RemoveTagBlock (tagId, blockId) /*:boolean*/ {
    (await rpc(`BlkFn.RemoveTagBlock`,tagId,blockId));  
    if (await this.HasTagBlock(tagId, blockId, $CL) == false) return; // false;
    _TAGS[tagId]._blocks.splice(_TAGS[tagId]._blocks.indexOf(blockId), 1);
    _BLOCKS[blockId]._tags.splice(_BLOCKS[blockId]._tags.indexOf(tagId), 1);
  // return true;
  },
};
