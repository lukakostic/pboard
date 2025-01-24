let TODO = (txt = "")=>{
    throw new Error("[TODO]" + txt);
};
let WARN = (txt = "")=>{};
Array.prototype.remove = function(item) {
    while(true){
        let idx = this.indexOf(item);
        if (idx != -1) this.splice(idx, 1);
        else break;
    }
    return this;
};
function cast(obj) {
    return obj;
}
function castIsnt(obj, ...isnt) {
    for(let i = 0, il = isnt.length; i < il; i++)if (obj === isnt[i]) throw new Error("Cast failed.");
    return obj;
}
// let __SerializableClasses = [Block];
// let __classToId = new WeakMap<any,string>();
let __IdToClass = {};
// __SerializableClasses.forEach((e,i)=>{if(e)__classToId.set(e,i);});
// let __registeredClasses : {[index:string]:any} = {}; // class.name => class (obj)
/** Register class as serializable.
 * @param suffix   if 2 classes have same name, use this to differentiate. MUST BE JSON-FRINEDLY STRING.
 */ function RegClass(_class) {
    console.log("REGISTERING CLASS", _class);
    // if(__classToId.has(_class)) return __classToId.get(_class);
    let id = _class.name; // + suffix;
    console.log("Registering ID:", id);
    if (__IdToClass[id] != null) throw new Error("Clashing class names. " + id);
    // __classToId.set(_class,id);  //register class name with class
    __IdToClass[id] = _class; //register class name to class object
    return id;
}
function SerializeClass(originalObj, _class) {
    let cls = _class ?? Object.getPrototypeOf(originalObj).constructor;
    console.log(cls);
    if (cls == Object) return '';
    let id = _class.name;
    if (__IdToClass[id] === undefined) throw new Error("Class not registered for serialization: " + id);
    // let idx = __classToId.get(cls);
    // if(typeof idx != null) throw new Error("Class not registered for serialization:"+cls.name);
    return `"$$C":"${id}"`;
//originalObj.__$class$__ = idx; // __$class$__
//return originalObj;
}
// function DeserializeClass(scaffoldObj){ //obj is of no class, its an object. but it has a .__$class$__ property
// }
function EscapeStr(str) {
    let s = "";
    for(let i = 0, _il = str.length; i < _il; i++){
        if (str[i] == '"') s += '\\"';
        else if (str[i] == '\'') s += "'";
        else if (str[i] == '\\') s += '\\\\';
        else if (str[i] == '\n') s += '\\n';
        else if (str[i] == '\r') s += '\\r';
        else if (str[i] == '\t') s += '\\t';
        else if (str[i] == '\v') s += '\\v';
        else if (str[i] == '\0') s += '\\0';
        else if (str[i] == '\a') s += '\\a';
        else if (str[i] == '\b') s += '\\b';
        else if (str[i] == '\f') s += '\\f';
        else if (str[i] == '\e') s += '\\e';
        else s += str[i];
    }
    return s;
}
function JSON_Serialize(obj) {
    console.log("serializing:", obj);
    if (obj === null) return "null";
    else if (obj === undefined) return null; //skip
    else if (Array.isArray(obj)) {
        let defaults = Object.getPrototypeOf(obj).constructor._serializable_default ?? {};
        let s = "[";
        for(let i = 0, _il = obj.length; i < _il; i++){
            if (i != 0) s += ",";
            s += JSON_Serialize(obj[i]);
        }
        s += "]";
        return s;
    } else if (typeof obj == 'object') {
        console.log("SERIALIZING OBJECT:", obj);
        if (obj.__serialize__) obj = obj.__serialize__();
        console.log("SERIALIZING OBJECT2:", obj);
        let _class = Object.getPrototypeOf(obj).constructor;
        console.log("CLASS:", _class, _class.name);
        let defaults = _class._serializable_default;
        console.log("DEFAULTS:", defaults);
        // if(obj.serialize_fn) return obj.serialize_fn();
        let classId = SerializeClass(obj, _class);
        let s = `{${classId}`;
        let k = Object.getOwnPropertyNames(obj);
        let insertComma = classId != ''; //was class atr inserted?
        for(let i = 0, l = k.length; i < l; i++){
            if (defaults && defaults[k[i]] == obj[k[i]]) continue; //skip this attribute
            let ser = JSON_Serialize(obj[k[i]]);
            if (ser === null) continue; //skip.
            if (insertComma) s += ',';
            //for performance reasons, dont escape strings.
            //yes it can corrupt your json.
            //up to plugin devs to watch out for it.
            s += `"${k[i]}":${ser}`;
            insertComma = true;
        }
        s += '}';
        return s;
    }
    return JSON.stringify(obj);
}
function __Deserialize(o) {
    console.log("deserializing:", o);
    if (o === null) return null;
    if (Array.isArray(o)) return o.map((e)=>__Deserialize(e));
    if (typeof o != 'object') {
        console.log("Primitive:", o);
        return o; //assuming its primitive.
    }
    // DeserializeClass(o);
    let classId = o.$$C;
    let _class = null;
    let defaults = {};
    if (classId !== undefined) {
        delete o.$$C;
        _class = __IdToClass[classId];
        if (_class == null) throw new Error("Class not recognised:", classId);
        Object.setPrototypeOf(o, _class); //applies in-place to object
        defaults = _class._serializable_default ?? {};
    }
    // end Deserialize class
    console.log("Deserializing object:", o, "defaults:", defaults, "class:", _class);
    let keys = Object.getOwnPropertyNames(o);
    for(let k = 0, kl = keys.length; k < kl; k++){
        o[keys[k]] = __Deserialize(o[keys[k]]);
    }
    //apply defaults
    let dk = Object.keys(defaults);
    for(let i = 0, il = dk.length; i < il; i++){
        let k = dk[i];
        if (o[k] === undefined) {
            let d = defaults[k];
            // we must make copies of the defaults, not use the same object.
            if (Array.isArray(d)) o[k] = [];
            else if (d === null) o[k] = null;
            else if (typeof d == 'object') o[k] = {};
            else o[k] = d;
        }
    }
    if (_class && _class.__deserialize__) o = _class.__deserialize__(o);
    console.log("returning deserialized", o);
    // if(o.deserialize_fn) o.deserialize_fn();
    return o;
}
function JSON_Deserialize(str) {
    console.log(str);
    return __Deserialize(JSON.parse(str));
}
class AttrPath {
    // path: string[];
    static parse(inp) {
        if (typeof inp == 'string') return inp.split('.');
        else if (Array.isArray(inp)) return inp;
        else throw new Error("Cant parse path, not string or array");
    /*
        else if(Array.isArray((inp as any).path)){
            return Object.setPrototypeOf(inp,AttrPath);
        }
        // if(typeof(inp) == 'string' || ){
        return new AttrPath(inp);
        // }else return inp;
        */ }
}
// RegClass(AttrPath);
/*
What are common diff situations?
1. new (nested) key (and value)
2. (nested) key removed
3. promena vrednosti ((nested) key)

ako se menja higher level key, brise se lower level key
*/ class Diff {
    path;
    value;
    constructor(p, v){
        this.path = AttrPath.parse(p);
        this.value = v;
    }
}
RegClass(Diff);
class DiffList {
    list;
    constructor(){
        this.list = [];
    }
    push(d) {
        for(let i = 0; i < this.list.length; i++){
            this.list[i].path;
        }
        this.list.push(d);
    }
}
RegClass(DiffList);
var $IS_CLIENT$ = undefined;
let recentlySearched_Pages = [];
let recentlySearched_Tags = [];
let recentlyVisited_Pages = [];
let recentlyAdded_Tags = [];
let maxRecents = 20;
function push_list(list, id) {
    list.splice(0, 0, id);
    if (list.length > maxRecents) list.splice(maxRecents, list.length - maxRecents);
}
function recentlySearched_Pages_push(id) {
    push_list(recentlySearched_Pages, id);
}
function recentlySearched_Tags_push(id) {
    push_list(recentlySearched_Tags, id);
}
function recentlyVisited_Pages_push(id) {
    push_list(recentlyVisited_Pages, id);
}
function recentlyAdded_Tags_push(id) {
    push_list(recentlyAdded_Tags, id);
}
function recentlySearched_Pages_getNames() {
    return recentlySearched_Pages.map((id)=>[
            id,
            BLOCKS[id].pageTitle
        ]);
}
function recentlySearched_Tags_getNames() {
    return recentlySearched_Tags.map((id)=>[
            id,
            TAGS[id].name
        ]);
}
function recentlyVisited_Pages_getNames() {
    return recentlyVisited_Pages.map((id)=>[
            id,
            BLOCKS[id].pageTitle
        ]);
}
function recentlyAdded_Tags_getNames() {
    return recentlyAdded_Tags.map((id)=>[
            id,
            TAGS[id].name
        ]);
}
let $CL = typeof $IS_CLIENT$ !== undefined; // true for client, false on server
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
*/ const BlkFn = {
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
    async RemoveTagFromBlock (blockId, tagId) {
        let $$$CL_clone;
        const t = TAGS[tagId];
        if ($CL && !t) return;
        t.blocks.splice(t.blocks.indexOf(blockId), 1); //remove block from tag
        const b = BLOCKS[blockId];
        if ($CL && !b) return;
        b.tags.splice(b.tags.indexOf(tagId), 1); //remove tag from block
    },
    async RemoveAllTagsFromBlock (blockId) {
        let $$$CL_clone;
        const b = BLOCKS[blockId];
        if ($CL && !b) return;
        for(let i = 0; i < b.tags.length; i++){
            const t = TAGS[b.tags[i]];
            if ($CL && !t) continue;
            t.blocks.splice(t.blocks.indexOf(blockId), 1); //remove block from tag
        }
        b.tags = []; //    b.tags.splice(b.tags.indexOf(tagId),1); //remove tag from block
    },
    async DeleteBlockOnce (id) {
        let $$$CL_diff;
        const b = BLOCKS[id];
        if (--b.refCount > 0) return; // false; //not getting fully deleted
        //deleting block.
        for(let i = 0; i < b.children.length; i++)await this.DeleteBlockOnce(b.children[i]);
        await this.RemoveAllTagsFromBlock(id);
        if (PAGES[id]) delete PAGES[id];
        delete BLOCKS[id];
        return; // true; //got fully deleted
    },
    async DeleteBlockEverywhere (id) {
        let $$$CL_diff;
        const b = BLOCKS[id];
        b.refCount = 0;
        for(let i = 0; i < b.children.length; i++)await this.DeleteBlockOnce(b.children[i]);
        await this.RemoveAllTagsFromBlock(id);
        if (PAGES[id]) delete PAGES[id];
        delete BLOCKS[id];
        // Search all blocks and all tags. Remove self from children.
        let allBlocks = Object.keys(BLOCKS);
        for(let i = 0; i < allBlocks.length; i++){
            const b2 = BLOCKS[allBlocks[i]];
            b2.children = b2.children.filter((x)=>x != id);
            WARN("We arent modifying array in-place (for performance), caller may hold old reference");
        /*
            let oc = b2.children;
            let nc = oc.filter((x:any)=>(x!=id));
            if(nc.length != oc.length){
                oc.splice(0,oc.length,...nc);    // in-place set new array values
            }*/ }
        let allTags = Object.keys(TAGS);
        for(let i = 0; i < allTags.length; i++){
            const t2 = TAGS[allTags[i]];
            t2.blocks = t2.blocks.filter((x)=>x != id);
            WARN("We arent modifying array in-place (for performance), caller may hold old reference");
        }
    },
    async InsertBlockChild (parent, child, index) /*:Id[]*/ {
        let $$$CL_clone;
        const p = BLOCKS[parent];
        if ($CL && !p) return;
        const l = p.children;
        if (index >= l.length) {
            l.push(child);
        } else {
            l.splice(index, 0, child);
        }
    // return l;
    },
    async SearchPages (title, mode = 'exact') {
        let $$$CL_ret;
        let pages = Object.keys(PAGES).map((k)=>BLOCKS[k]);
        if (mode == 'exact') {
            return pages.filter((p)=>p.pageTitle == title).map((p)=>p.id);
        } else if (mode == 'startsWith') {
            return pages.filter((p)=>p.pageTitle?.startsWith(title)).map((p)=>p.id);
        } else if (mode == 'includes') {
            return pages.filter((p)=>p.pageTitle?.includes(title)).map((p)=>p.id);
        }
        return [];
    },
    async SearchTags (title, mode = 'exact') {
        let $$$CL_ret;
        let pages = Object.values(TAGS); //.map(k=>BLOCKS[k]);
        if (mode == 'exact') {
            return pages.filter((p)=>p.name == title).map((p)=>p.id);
        } else if (mode == 'startsWith') {
            return pages.filter((p)=>p.name?.startsWith(title)).map((p)=>p.id);
        } else if (mode == 'includes') {
            return pages.filter((p)=>p.name?.includes(title)).map((p)=>p.id);
        }
        return [];
    },
    async HasTagBlock (tagId, blockId, $CL1 = false) {
        let $$$CL_local;
        if (!$CL1) return TAGS[tagId].blocks.indexOf(blockId) != -1;
        if ($CL1) {
            if (TAGS[tagId]) return TAGS[tagId].blocks.indexOf(blockId) != -1;
            if (BLOCKS[blockId]) return BLOCKS[blockId].tags.indexOf(tagId) != -1;
            return $$$CL_rpc;
        }
    },
    async TagBlock (tagId, blockId) /*:boolean*/ {
        let $$$CL_clone;
        if (await this.HasTagBlock(tagId, blockId, $CL)) return; // false;
        TAGS[tagId].blocks.push(blockId);
        BLOCKS[blockId].tags.push(tagId);
    // return true;
    },
    async RemoveTagBlock (tagId, blockId) /*:boolean*/ {
        let $$$CL_clone;
        if (await this.HasTagBlock(tagId, blockId, $CL) == false) return; // false;
        TAGS[tagId].blocks.splice(TAGS[tagId].blocks.indexOf(blockId), 1);
        BLOCKS[blockId].tags.splice(BLOCKS[blockId].tags.indexOf(tagId), 1);
    // return true;
    }
};
class Block {
    static _serializable_default = {
        children: [],
        tags: [],
        attribs: {},
        refCount: 1
    };
    id;
    refCount;
    pageTitle;
    text;
    //usually-empty
    children;
    tags;
    attribs;
    constructor(){
        this.id = "";
        this.text = "";
        this.refCount = 1;
        this.children = [];
        this.tags = [];
        this.attribs = {};
    }
    static new(text = "") {
        let b = new Block();
        BLOCKS[b.id = genId()] = b;
        b.text = text;
        return b;
    }
    static newPage(title = "") {
        let b = new Block();
        BLOCKS[b.id = genId()] = b;
        PAGES[b.id] = true;
        b.pageTitle = title;
        return b;
    }
}
RegClass(Block);
class Tag {
    static _serializable_default = {
        attribs: {},
        parentTagId: "",
        childrenTags: {}
    };
    name;
    id;
    parentTagId;
    childrenTags;
    blocks;
    attribs;
    constructor(){
        this.id = "";
        this.name = "";
        this.parentTagId = "";
        this.childrenTags = [];
        this.blocks = [];
        this.attribs = {};
    }
    static new(name, parentTag = "") {
        let t = new Tag();
        let parent = null;
        if (parentTag != "") {
            parent = TAGS[parentTag];
            if (!parent) throw new Error(`Invalid parent: #${parentTag} not found`);
        }
        TAGS[t.id = genId()] = t;
        t.name = name;
        if (parentTag != "") {
            t.parentTagId = parentTag;
            parent.childrenTags.push(t.id);
        }
        return t;
    }
}
RegClass(Tag); // import { serve } from "https://deno.land/std@0.177.0/http/mod.ts";
// import { serveDirWithTs } from "https://deno.land/x/ts_serve@v1.4.6/mod.ts";
import { serveDirWithTs } from "jsr:@ayame113/ts-serve";
//https://github.com/ayame113/ts-serve
import * as fs from "jsr:@std/fs";
let __runningId = 0;
// var ID : {[index:Id]:any} = {}; //all everything
function genId() {
    return (++__runningId).toString();
}
var BLOCKS = {}; //all blocks
var PAGES = {}; //all pages
var TAGS = {}; //all tags
Deno.serve({
    port: 9020
}, async function fn(req) {
    // console.log(req);
    console.log("URL", req.url);
    let url = new URL(req.url);
    let path = url.pathname; //  "/API/smth/newSmt
    let opts = url.search; //  "?x=2&y=3"
    let hash = url.hash; //   "#abcd"h"
    // console.log(req);
    if (req.headers.get("upgrade") !== "websocket") {
        if (path == "/" || path == "") {
            //modify request url to be "/client/index.html"
            //but deno requests are immutable, so we need to make a new request
            let newUrl = url.protocol + "//" + url.host + "/client/index.html" + opts + hash;
            console.log("Redirecting to:", newUrl);
            req = new Request(newUrl, {
                method: req.method,
                headers: req.headers,
                body: req.body,
                redirect: req.redirect,
                referrer: req.referrer,
                referrerPolicy: req.referrerPolicy,
                mode: req.mode,
                credentials: req.credentials,
                cache: req.cache,
                integrity: req.integrity,
                keepalive: req.keepalive,
                signal: req.signal,
                window: req.window
            });
        // return new Response("", {
        //     status: 307,
        //     headers: { Location: "/client/index.html" },
        // });
        }
        if (path.startsWith("/API")) {} else return serveDirWithTs(req);
    //let normalizedPath = decodeURIComponent(new URL(req.url).pathname);
    //posix.normalize(decodeURIComponent(new URL(req.url).pathname));
    //   return new Response(null, { status: 501 });
    }
    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.addEventListener("open", ()=>{
        console.log("a client connected!");
    });
    socket.addEventListener("message", async (event)=>{
        console.log("Data:", event.data);
        let t = event.data;
        if (t.length == 0) {
            socket.send("null");
            return;
        } else if (t[0] == "{") {
            let js = JSON_Deserialize(t);
            let resp = handleJson(js);
            if (resp instanceof Promise) resp = await resp;
            if (resp === undefined) resp = null;
            socket.send(JSON_Serialize(resp));
        } else if (t[0] == "[") {
            let js = JSON_Deserialize(t);
            let r = js.map((o)=>handleJson(o));
            console.log(r);
            if (r instanceof Error) {
                socket.send("error" + JSON_Serialize(r));
                console.error(r);
            } else {
                for(let i = 0; i < r.length; i++){
                    if (r[i] instanceof Promise) r[i] = await r[i];
                    if (r[i] === undefined) r[i] = null;
                }
                socket.send(JSON_Serialize(r));
            }
        } else {
        // if(t=="load_all"){
        //     socket.send(JSON.stringify(LoadAll()));
        // }
        // else socket.send("null");
        }
    });
    return response;
    function handleJson(json) {
        try {
            let name = json.n;
            let data = json.d;
            console.log("Handling:", name, data);
            switch(name){
                case "save_all":
                    let all = data.all;
                    for(let id in all){
                        Deno.writeTextFileSync(`./pb/${id}.pb`, JSON_Serialize(all[id]));
                    }
                    return true;
                case "save":
                    return true;
                case "load_all":
                    return true;
                case "load":
                    return true;
                case 'eval':
                    let r = eval(data);
                    console.log("Eval return:", r);
                    if (r === undefined) r = null;
                    return r;
                default:
                    return null;
            }
        } catch (e) {
            return e;
        }
    }
});
// Deno.serve({
//     port:9020,
//     transport:'tcp'
// },fn);
server_init();
function server_LoadAll() {
    /*
    From FILES load following:
    */ try {
        let _PAGES = Deno.readTextFileSync("./FILES/pb/PAGES.json");
        if (_PAGES === null) throw new Error("non existant.");
        PAGES = JSON_Deserialize(_PAGES);
        for (let f of fs.walkSync("./FILES/pb/blocks", {
            maxDepth: 1,
            /*exts:[".pb"],*/ includeDirs: false,
            includeFiles: true,
            includeSymlinks: false
        })){
            let id = f.name;
            BLOCKS[id] = JSON_Deserialize(Deno.readTextFileSync(f.path));
        }
        for (let f of fs.walkSync("./FILES/pb/tags", {
            maxDepth: 1,
            /*exts:[".pb"],*/ includeDirs: false,
            includeFiles: true,
            includeSymlinks: false
        })){
            let id = f.name;
            PAGES[id] = JSON_Deserialize(Deno.readTextFileSync(f.path));
        }
    } catch (err) {}
}
function server_SaveAll() {
    /*
    From FILES save following:
    */ Deno.writeTextFileSync("./FILES/pb/PAGES.json", JSON_Serialize(PAGES));
    for(let k in BLOCKS){
        Deno.writeTextFileSync(`./FILES/pb/blocks/${k}`, JSON_Serialize(BLOCKS[k]));
    }
    for(let k in TAGS){
        Deno.writeTextFileSync(`./FILES/pb/tags/${k}`, JSON_Serialize(TAGS[k]));
    }
}
function server_init() {
    //make folders in FILES:
    // pb:  blocks, tags, extensions
    // pb_archived:  blocks, tags, extensions
    server_LoadAll();
}
function client_SaveAll(all_json) {}
function client_Save(attrPath, data) {
    attrPath = AttrPath.parse(attrPath);
}
function client_loadBlock(blockId, depth) {
    console.log("Loading block:", blockId, depth);
    // attrPath = AttrPath.parse(attrPath);
    let returnedBlocks = {};
    function loadBlock(blockId, depth) {
        if (returnedBlocks[blockId] !== undefined) return; //already loaded
        let block = BLOCKS[blockId];
        returnedBlocks[blockId] = block;
        if (depth <= 0) return;
        for(let i = 0; i < block.children.length; i++)loadBlock(block.children[i], depth - 1);
    }
    loadBlock(blockId, depth);
    console.log("Loading block result:", returnedBlocks);
    return returnedBlocks;
}
function client_LoadInitial() {
    return {
        PAGES: PAGES
    };
}
function save_TAGS() {}
function save_Tag(id) {}
function save_BLOCKS() {}
function save_Block(id) {}
function save_PAGES() {}
function client_ReLoadAllData(clientData) {
    /*
    all those which arent null, send new versions of them.
    */ let response = {
        BLOCKS: {},
        PAGES: PAGES,
        TAGS: {}
    };
    let blcks = Object.keys(BLOCKS);
    for(let i = 0; i < blcks.length; i++){
        const k = blcks[i];
        response.BLOCKS[k] = clientData.BLOCKS[k] === null ? null : BLOCKS[k];
    }
    let tags = Object.keys(TAGS);
    for(let i = 0; i < tags.length; i++){
        const k = tags[i];
        response.TAGS[k] = clientData.TAGS[k] === null ? null : TAGS[k];
    }
    return response;
}
function server_delete(path) {
    return server_set(path, undefined, false, false);
}
function server_set(path, value, createNonExistant = true, errorOnNonExistant = true) {
    path = AttrPath.parse(path);
    let id_toSave = '';
    let p1 = path.shift();
    if (p1 == "TAGS") {} else if (p1 == "BLOCKS") {} else if (p1 == "PAGES") {} else throw new Error("Uknown path " + p1);
    let p2 = path.shift(), p3 = undefined;
    let o;
    if (p2 === null) {
        if (p1 == "TAGS") {
            TAGS = value;
            save_TAGS();
        } else if (p1 == "BLOCKS") {
            BLOCKS = value;
            save_BLOCKS();
        } else if (p1 == "PAGES") {
            PAGES = value;
            save_PAGES();
        }
        return null;
    } else {
        if (p1 == "TAGS") o = TAGS;
        else if (p1 == "BLOCKS") o = BLOCKS;
        else if (p1 == "PAGES") o = PAGES;
        id_toSave = p2;
    }
    while((p3 = path.shift()) !== undefined){
        if (o[p2] === undefined) {
            if (createNonExistant == false) {
                if (errorOnNonExistant) {
                    throw new Error("Path doesnt exist.");
                } else return;
            } else o[p2] = {}; //dynamically create path.
        }
        o = o[p2];
        p2 = p3;
    }
    if (value === undefined) delete o[p2];
    else o[p2] = value;
    if (p1 == "BLOCKS") {
        save_Block(id_toSave);
    } else if (p1 == "TAGS") {
        save_Tag(id_toSave);
    } else {
        throw new Error("Unexpected path to save: " + p1);
    }
}
const MsgType = {
    saveAll: "save_all",
    loadAll: "load_all",
    load: "load",
    eval: "eval"
};

