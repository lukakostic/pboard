// import { serve } from "https://deno.land/std@0.177.0/http/mod.ts";

import { serveDirWithTs } from "https://deno.land/x/ts_serve@v1.4.4/mod.ts";
//https://github.com/ayame113/ts-serve
import * as fs from "jsr:@std/fs";

declare var Deno : any;

let __runningId = 0;
// export var ID : {[index:Id]:any} = {}; //all everything
export function genId(){return (++__runningId).toString();}

import {TAGS} from './Tag.ts'
import {BLOCKS,BlkFn} from './Blocks.ts'


Deno.serve( function fn(req:any){
    // console.log(req);
    if (req.headers.get("upgrade") !== "websocket") {
        let url = (new URL(req.url));
        let path = url.pathname; //  "/API/smth/newSmth"
        if(path.startsWith("/API")){ //is api call
            let opts = url.search;  //  "?x=2&y=3"
            let hash = url.hash;   //   "#abcd"
        }else return serveDirWithTs(req); 

        //let normalizedPath = decodeURIComponent(new URL(req.url).pathname);
        //posix.normalize(decodeURIComponent(new URL(req.url).pathname));
        
        
        
    //   return new Response(null, { status: 501 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.addEventListener("open", () => {
      console.log("a client connected!");
    });
    socket.addEventListener("message", (event:MessageEvent) => {
        console.log(event.data);
        let t = event.data;
        if(t.length==0){ socket.send("null"); return; }
        else if(t[0]=="{"){ //is json
            let js = JSON.parse(t);
            socket.send(JSON.stringify(handleJson(js)));
        }else if(t[0]=="["){ //is multiple json
            let js = JSON.parse(t);
            let r = js.map((o:any)=>handleJson(o));
            socket.send(JSON.stringify(r));
        }else{ //is just text
            // if(t=="load_all"){
            //     socket.send(JSON.stringify(LoadAll()));
            // }
            // else socket.send("null");
        }
    });
    return response;


    function handleJson(json:{n:string,d:any}){
        let name = json.n;
        let data = json.d;
        switch(name){
            case "save_all":
                let all = data.all;
                for(let id in all){
                    Deno.writeTextFileSync(`./pb/${id}.pb`,JSON.stringify(all[id]));
                }
                return true;
            case "save":
                    return true;
            case "load_all":
                    return true;
            case "load":
                    return true;
            case 'eval':
                return eval(data);
            default:
                return null;
        }
    }


});

// Deno.serve({
//     port:9020,
//     transport:'tcp'
// },fn);



function LoadAll(){
    //let fileMap = {} as {[index:string]:string};
    let s = "{";
    let prev = false;
    for(let f of fs.walkSync("./FILES/pb",
        {maxDepth:1,
        // exts:[".pb"],
        includeDirs:false,
        includeFiles:true,
        includeSymlinks:false
    })){
        if(prev) s+=",";
        prev = true;
        // console.log(f);
        //fileMap[f.path]
        s+=`"${f.name.substring(0,f.name.length-3)}":${
            Deno.readTextFileSync(f.path)}`;
        //fileMap[f.name] 
    }
    s+="}";
    return s;
}
function initPbFolders(){
    //make folders in FILES:
    // pb:  blocks, tags, extensions
    // pb_archived:  blocks, tags, extensions
}
function SaveAll(all_json:string){

}
type _AttrPath = AttrPath|string|string[];
class AttrPath{
    path: string[];
    static parse(inp:AttrPath|string|string[]):AttrPath{
        if(inp instanceof AttrPath) return inp;
        // if(typeof(inp) == 'string' || ){
            return new AttrPath(inp);
        // }else return inp;
    }
    constructor(inp:string|string[]){
        if(typeof(inp) == 'string')
            this.path = inp.split('.');
        else if(Array.isArray(inp))
            this.path = inp;
        else throw new Error("Cant parse path, not string or array");
    }
}
function Save(attrPath:_AttrPath,data:any){
    attrPath = AttrPath.parse(attrPath);

}
function Load(attrPath:_AttrPath){
    attrPath = AttrPath.parse(attrPath);

}

const MsgType = {
    saveAll:"save_all", //data:null
    loadAll:"load_all", //data:null
    load:"load", //data: attrSelector[]
    eval:"eval", //data: code as string
};
