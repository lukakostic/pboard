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
