// import { serve } from "https://deno.land/std@0.177.0/http/mod.ts";

// import { serveDirWithTs } from "https://deno.land/x/ts_serve@v1.4.6/mod.ts";
import { serveDirWithTs } from "jsr:@ayame113/ts-serve";
//https://github.com/ayame113/ts-serve
import * as fs from "jsr:@std/fs";

declare var Deno : any;

let __runningId = 0;
// var ID : {[index:Id]:any} = {}; //all everything
function genId(){return (++__runningId).toString();}

type TBLOCKS = {[index:Id]:Block};
type TBLOCKSn = {[index:Id]:Block|null};
var BLOCKS : TBLOCKS = {}; //all blocks
type TPAGES = {[index:Id]:true};
var PAGES : TPAGES = {}; //all pages
type TTAGS = {[index:Id]:Tag};
type TTAGSn = {[index:Id]:Tag|null};
var TAGS : TTAGS = {}; //all tags



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
            let js = JSON_Deserialize(t);
            let resp = handleJson(js);
            if(resp instanceof Promise)
                resp = await resp;
            if(resp === undefined) resp = null;
            socket.send(JSON_Serialize(resp));
        }else if(t[0]=="["){ //is multiple json
            let js = JSON_Deserialize(t);
            let r = js.map((o:any)=>handleJson(o));
            console.log(r);
            if(r instanceof Error){
                socket.send("error"+JSON_Serialize(r));
                console.error(r);
            }else{
                for(let i = 0; i<r.length; i++){
                    if(r[i] instanceof Promise)
                        r[i] = await r[i];
                    if(r[i] === undefined) r[i] = null;
                }
                socket.send(JSON_Serialize(r));
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
        try{
            let name = json.n;
            let data = json.d;
            console.log("Handling:",name,data);
            switch(name){
                case "save_all":
                    let all = data.all;
                    for(let id in all){
                        Deno.writeTextFileSync(`./pb/${id}.pb`,JSON_Serialize(all[id]));
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
                        console.log("Eval return:",r);
                        if(r===undefined) r=null;
                        return r;
                default:
                    return null;
            }
        }catch(e){
            return e;
        }
    }


});

// Deno.serve({
//     port:9020,
//     transport:'tcp'
// },fn);

server_init();


function server_LoadAll(){
    /*
    From FILES load following:
    */
    try{
        let _PAGES = Deno.readTextFileSync("./FILES/pb/PAGES.json");
        if(_PAGES===null) throw new Error("non existant.");
        PAGES = JSON_Deserialize(_PAGES);
        for(let f of fs.walkSync("./FILES/pb/blocks",
          {maxDepth:1,/*exts:[".pb"],*/includeDirs:false,includeFiles:true,includeSymlinks:false}
          )){
            let id = f.name;
            BLOCKS[id] = JSON_Deserialize(Deno.readTextFileSync(f.path));
        }
        for(let f of fs.walkSync("./FILES/pb/tags",
          {maxDepth:1,/*exts:[".pb"],*/includeDirs:false,includeFiles:true,includeSymlinks:false}
          )){
            let id = f.name;
            PAGES[id] = JSON_Deserialize(Deno.readTextFileSync(f.path));
        }
        
    }catch(err){}
}
function server_SaveAll(){
    /*
    From FILES save following:
    */

    Deno.writeTextFileSync("./FILES/pb/PAGES.json",JSON_Serialize(PAGES));
    for(let k in BLOCKS){
        Deno.writeTextFileSync(`./FILES/pb/blocks/${k}`,JSON_Serialize(BLOCKS[k]));
    }
    for(let k in TAGS){
        Deno.writeTextFileSync(`./FILES/pb/tags/${k}`,JSON_Serialize(TAGS[k]));
    }
}
function server_init(){
    //make folders in FILES:
    // pb:  blocks, tags, extensions
    // pb_archived:  blocks, tags, extensions
    server_LoadAll();
}
function client_SaveAll(all_json:string){

}

function client_Save(attrPath:_AttrPath,data:any){
    attrPath = AttrPath.parse(attrPath);

}
function client_loadBlock(blockId:Id,depth:number){
    console.log("Loading block:",blockId,depth);
    // attrPath = AttrPath.parse(attrPath);
    let returnedBlocks = {} as TBLOCKS;
    
    function loadBlock(blockId:Id,depth:number){
        if(returnedBlocks[blockId]!==undefined) return; //already loaded
        let block = BLOCKS[blockId];
        returnedBlocks[blockId] = block;
        if(depth<=0) return;
        for(let i = 0; i<block.children.length; i++)
            loadBlock(block.children[i],depth-1);
    }
    loadBlock(blockId,depth);

    console.log("Loading block result:",returnedBlocks);

    return returnedBlocks;
}
function client_LoadInitial(){
    return {PAGES:PAGES};
}


function save_TAGS(){

}
function save_Tag(id:string){
    
}
function save_BLOCKS(){

}
function save_Block(id:string){

}
function save_PAGES(){

}
function client_ReLoadAllData(clientData:{BLOCKS:TBLOCKSn,PAGES:TPAGES,TAGS:TTAGSn}){
    /*
    all those which arent null, send new versions of them.
    */
   let response = {
    BLOCKS:{} as TBLOCKSn,
    PAGES:PAGES,
    TAGS:{} as TTAGSn
   }
    let blcks = Object.keys(BLOCKS);
    for(let i = 0; i<blcks.length; i++){
        const k = blcks[i];
        response.BLOCKS[k] = (clientData.BLOCKS[k]===null)?null:BLOCKS[k];
    }
    let tags = Object.keys(TAGS);
    for(let i = 0; i<tags.length; i++){
        const k = tags[i];
        response.TAGS[k] = (clientData.TAGS[k]===null)?null:TAGS[k];
    }
    return response;
}

function server_delete(path:_AttrPath){
    return server_set(path,undefined,false,false);
}
function server_set(path:_AttrPath,value:any , createNonExistant=true,errorOnNonExistant=true){
    path=AttrPath.parse(path);
    let id_toSave = '';
    let p1 = path.shift()!;
    if(p1=="TAGS"){
    }else if(p1=="BLOCKS"){
    }else if(p1=="PAGES"){
    }else throw new Error("Uknown path "+p1);
    let p2=path.shift()!,p3:string|undefined=undefined;
    let o:any;
    if(p2===null){
        if(p1=="TAGS"){
            TAGS = value;
            save_TAGS();
        }else if(p1=="BLOCKS"){
            BLOCKS = value;
            save_BLOCKS();
        }else if(p1=="PAGES"){
            PAGES = value;
            save_PAGES();
        }
        return null;
    }else{
        if(p1=="TAGS")
            o = TAGS;
        else if(p1=="BLOCKS")
            o = BLOCKS;
        else if(p1=="PAGES")
            o = PAGES;
        id_toSave = p2;
    }
    while((p3=path.shift()!)!==undefined){
        if(o[p2]===undefined){
            if(createNonExistant ==false){
                if(errorOnNonExistant){
                    throw new Error("Path doesnt exist.");
                }else return;
            } else o[p2]={}; //dynamically create path.
        }
        o = o[p2]!;

        p2=p3;
    }
    if(value === undefined) //deleting, but this is special
        delete o[p2];
    else o[p2] = value;

    if(p1=="BLOCKS"){
        save_Block(id_toSave);
    }else if(p1=="TAGS"){
        save_Tag(id_toSave);
    }else{
        throw new Error("Unexpected path to save: "+p1);
    }

}

const MsgType = {
    saveAll:"save_all", //data:null
    loadAll:"load_all", //data:null
    load:"load", //data: attrSelector[]
    eval:"eval", //data: code as string
};
