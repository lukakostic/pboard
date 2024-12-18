// import { serve } from "https://deno.land/std@0.177.0/http/mod.ts";

import { serveDirWithTs } from "https://deno.land/x/ts_serve@v1.4.4/mod.ts";
//https://github.com/ayame113/ts-serve
import * as fs from "jsr:@std/fs";

let TAGS = {}; //tags
let BLOCKS = {};  //blocks

function fn(req:any){
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
    socket.addEventListener("message", (event) => {
        console.log(event.data);
        let t = event.data;
        if(t.length==0){ socket.send("null"); return; }
        else if(t[0]=="{"){ //is json
            let js = JSON.parse(t);
            socket.send(JSON.stringify(handleJson(js)));
        }else if(t[0]=="["){ //is multiple json
            let js = JSON.parse(t);
            let r = js.map(o=>handleJson(o));
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
        if(name == "save_all"){
            let all = data.all;
            for(let id in all){
                Deno.writeTextFileSync(`./pb/${id}.pb`,JSON.stringify(all[id]));
            }
            return true;
        }
        else return "?";
    }


}

// Deno.serve({
//     port:9020,
//     transport:'tcp'
// },fn);
Deno.serve(fn);


function LoadAll(){
    //let fileMap = {} as {[index:string]:string};
    let s = "{";
    let prev = false;
    for(let f of fs.walkSync("./pb",
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
    //make folders in pb:  blocks, tags
}
function SaveAll(all_json:string){

}


const MsgType = {
    saveAll:"save_all", //data:null
    loadAll:"load_all", //data:null
    load:"load", //data: attrSelector[]
};
