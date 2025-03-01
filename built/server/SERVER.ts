
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
    PAGES : JSONstr<typeof PAGES>,

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
// File: server/9server.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/server/9server.ts
//######################

// import { serve } from "https://deno.land/std@0.177.0/http/mod.ts";

// import { serveDirWithTs } from "https://deno.land/x/ts_serve@v1.4.6/mod.ts";
import { serveDirWithTs } from "jsr:@ayame113/ts-serve";
//https://github.com/ayame113/ts-serve
import * as fs from "jsr:@std/fs";

//declare var Deno : any;
type ProjectClass = Error;
type SearchStatistics = Error;
declare var PAGES : any;
declare var Server : any;

const FILESPATH = `../FILES`; // we are in built/   so go up once.
const FILE = {
    PROJECT :           `${FILESPATH}/PROJECT`,
    SEARCH_STATISTICS : `${FILESPATH}/SEARCH_STATISTICS`,
    PAGES:              `${FILESPATH}/PAGES`,

    TAGS_FOLDER:        `${FILESPATH}/TAGS/`,
    TAGS:(id:Id)=>      `${FILESPATH}/TAGS/${id}`,
    BLOCKS_FOLDER:      `${FILESPATH}/BLOCKS/`,
    BLOCKS:(id:Id)=>    `${FILESPATH}/BLOCKS/${id}`,
};

var running_change_hash :string = "-";
try{    
    let PROJECT = JSON_Deserialize(readFile(FILE.PROJECT) , true);
    running_change_hash = PROJECT.running_change_hash;
}catch(e){}

const backup_cmd = ()=>`cd ${FILESPATH} && git add . && git commit -m "${(new Date()).toLocaleString()}"`;
function backup(){
    (new Deno.Command( 'bash' , {
        args: [
        "-c",
        backup_cmd(),
        ]
        // ,
        // stdin: "piped",
        // stdout: "piped",
    })).spawn();
}
Deno.serve(
{
    port:9020,
    // transport:'tcp'
}, 
async function fn(req:any){
    // console.log(req);
    console.log("URL",req.url);
    let url = (new URL(req.url));
    let path = url.pathname; //  "/API/smth/newSmt
    let opts = url.search;  //  "?x=2&y=3"
    let hash = url.hash;   //   "#abcd"h"
    // console.log(req);
    if (req.headers.get("upgrade") !== "websocket") { // is http request, not websocket.

        if(path == "/" || path==""){

            //modify request url to be "/client/index.html"
            //but deno requests are immutable, so we need to make a new request
            let newUrl = url.protocol + "//" + url.host + "/client/index.html" + opts + hash;
            console.log("Redirecting to:",newUrl);
            req = new Request(newUrl,{
                method:req.method,
                headers:req.headers,
                body:req.body,
                redirect:req.redirect,
                referrer:req.referrer,
                referrerPolicy:req.referrerPolicy,
                mode:req.mode,
                credentials:req.credentials,
                cache:req.cache,
                integrity:req.integrity,
                keepalive:req.keepalive,
                signal:req.signal,
                window:req.window,
            });
            
            // return new Response("", {
            //     status: 307,
            //     headers: { Location: "/client/index.html" },
            // });
        }
     
        if(path.startsWith("/API")){ //is api call
        }else return serveDirWithTs(req); 

        //let normalizedPath = decodeURIComponent(new URL(req.url).pathname);
        //posix.normalize(decodeURIComponent(new URL(req.url).pathname));
        
        
        
    //   return new Response(null, { status: 501 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.addEventListener("open", () => {
      console.log("a client connected!");
    });
    socket.addEventListener("message", async (event:MessageEvent) => {
        console.log("Data:",event.data);
        let t = event.data;
        if(t.length==0){ socket.send("null"); return; }
        else if(t[0]=="{"){ //is json
            let js = JSON_Deserialize(t , true);
            let resp = handleJson(js);
            if(resp instanceof Promise)
                resp = await resp;
            if(resp === undefined) resp = null;
            socket.send(JSON_Serialize(resp)!);
        }else if(t[0]=="["){ //is multiple json
            let js = JSON_Deserialize(t , true);
            let r = js.map((o:any)=>handleJson(o));
            console.log(r);
            if(r instanceof Error){
                socket.send(JSON_Serialize(r)!);
                console.error(r);
            }else{
                for(let i = 0; i<r.length; i++){
                    if(r[i] instanceof Promise)
                        r[i] = await r[i];
                    if(r[i] === undefined) r[i] = null;
                }
                socket.send(JSON_Serialize(r)!);
            }
        }else{ //is just text
            // if(t=="load_all"){
            //     socket.send(JSON.stringify(LoadAll()));
            // }
            // else socket.send("null");
        }
    });
    return response;


    function handleJson(json:{n:string,d:any}){
        const handlers = {
            [Msg_saveAll]:(r:TCMsg_saveAll):TSMsg_saveAll=>{
                const {hash,newHash,data} = r;
                if(hash != running_change_hash)
                    return Error("RCH missmatch: server: " + running_change_hash + " client: "+hash + " (clients new hash: "+newHash+" )");
                
                // TODO("save all changes to disk.");
                for(let i = 0; i<data.length;i++){
                    let p = data[i].path;
                    // let [p,d,deleted] = [data[i].path,data[i].data,data[i].deleted];
                    //,data[i].data,data[i].deleted];
                    let hasData = "data" in data[i];
                    let d = (data[i] as any).data;
                    
                    if(p[0]=="PROJECT"){
                        if(p[1]!=null || !hasData) throw Error("Unexpected for PROJECT: "+p[1]+ " , "+hasData);
                        writeFile(FILE.PROJECT,d);
                        
                    }else if(p[0]=="SEARCH_STATISTICS"){
                        if(p[1]!=null || !hasData) throw Error("Unexpected for SEARCH_STATISTICS: "+p[1]+ " , "+hasData);
                        writeFile(FILE.SEARCH_STATISTICS,d);
                    }else if(p[0]=="PAGES"){
                        if(p[1]!=null || !hasData) throw Error("Unexpected for PAGES: "+p[1]+ " , "+hasData);
                        writeFile(FILE.PAGES,d);
                    }else if(p[0]=="_TAGS"){
                        if(p[1]==null) throw Error("Unexpected TAGS: "+p[1]+ " , "+hasData);
                        const pth = FILE.TAGS(p[1]);
                        if(hasData) writeFile(pth,d);
                        else deleteFile(pth);
                    }else if(p[0]=="_BLOCKS"){
                        if(p[1]==null) throw Error("Unexpected BLOCKS: "+p[1]+ " , "+hasData);
                        const pth = FILE.BLOCKS(p[1]);
                        if(hasData) writeFile(pth,d);
                        else deleteFile(pth);
                    }else{
                        return Error("Unknown save path: "+p);
                    }
                }
                console.log("NNNNNNNNNEW HASH : ",newHash,"old:",running_change_hash);
                running_change_hash = newHash;
                return true;
            },
            [Msg_eval]:(r:TCMsg_eval):TSMsg_eval=>{
                let ret = eval(r.code);
                console.log("Eval return:",ret);
                if(ret===undefined) ret=null;
                
                return ret;
            },
            [Msg_backup]:(r:TCMsg_backup):TSMsg_backup=>{
                backup();
                return true;
            },
            [Msg_loadInitial]:(r:TCMsg_loadInitial):TSMsg_loadInitial=>{
                console.log("load initial");
                try{
                    let ids_BLOCKS = [];
                    let ids_TAGS = [];
                    for(let f of fs.walkSync(FILE.BLOCKS_FOLDER,
                        {maxDepth:1/*,exts:[".pb"]*/,includeDirs:false,includeFiles:true,includeSymlinks:false}
                        )){
                        ids_BLOCKS.push(f.name);
                    }
                    for(let f of fs.walkSync(FILE.TAGS_FOLDER,
                        {maxDepth:1/*,exts:[".pb"]*/,includeDirs:false,includeFiles:true,includeSymlinks:false}
                        )){
                        ids_TAGS.push(f.name);
                    }
                    return {
                        PROJECT           : readFile(FILE.PROJECT) as any,
                        SEARCH_STATISTICS : readFile(FILE.SEARCH_STATISTICS) as any,
                        PAGES             : readFile(FILE.PAGES) as any,

                        ids_BLOCKS,
                        ids_TAGS,
                    };
                }catch(e){
                    console.error("Failed to load initial:");
                    console.error(e);
                    return false;} // ako fale fajlovi. onda smo fresh install.
            },
            [Msg_loadBlock]:(r:TCMsg_loadBlock):TSMsg_loadBlock=>{
                return client_loadBlock(r.id,r.depth);
            },
            [Msg_loadTag]:(r:TCMsg_loadTag):TSMsg_loadTag=>{
                return client_loadTag(r.id,r.depth);
            }
        }
        try{
            let name = json.n as string;
            let data = json.d as any;
            console.log("Handling:",name,data);
            if(name in handlers){
                let resp = (handlers as any)[name](data);
                console.log("HANDLED:",name,resp);
                return resp;
            }else return Error("Unknown function to handle: '"+name+"' : "+json);
        }catch(e){
            console.log("HANDLED:",json,"\n\n\n",e);
            return e;
        }
    }


});


function writeFile(path:string,contents:string){
    Deno.writeTextFileSync(path,contents);
}
function deleteFile(path:string){
    Deno.removeSync(path);
}
function readFile(path:string){
    return Deno.readTextFileSync(path);
}


function client_loadTag(blockId:Id,depth:number){
    return {blockId:readFile(FILE.TAGS(blockId))};
}
function client_loadBlock(blockId:Id,depth:number){
    console.log("Loading block:",blockId,depth);
    // attrPath = AttrPath.parse(attrPath);
    let returnedBlocks :{[index:Id]:string} = {} ;//as TBLOCKS;
    
    function loadBlock(blockId:Id,depth:number){
        if(returnedBlocks[blockId]!==undefined) return; //already loaded
        let blockJson = readFile(FILE.BLOCKS(blockId));//= BLOCKS[blockId];
        let block = JSON_Deserialize(blockJson,true);
        returnedBlocks[blockId] = blockJson;
        if(depth<=0) return;
        if(block.children){
            for(let i = 0; i<block.children.length; i++)
                loadBlock(block.children[i],depth-1);
        }
    }
    loadBlock(blockId,depth);

    console.log("Loading block result:",returnedBlocks);

    return returnedBlocks;
}


