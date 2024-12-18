import { BLOCKS } from "../Blocks.ts";
import { TAGS } from "../Tag.ts";

type ServerMsg = {n:string,d?:any,cb?:Function}; //n=name
let Server = {
    __WebSock : new WebSocket("ws://localhost:8000"),
    __SockOpen : false,
/*
new Promise((resolve, reject) => {
    WebSock.onopen(()=>resolve());
});*/
    MsgType:{
        saveAll:"save_all", //data:null
        loadAll:"load_all", //data:null
        load:"load", //data: attrSelector[]
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

        this.__MsgQueue.push(msg);
        
        if(this.__SockOpen)
            this.__WebSock.send(JSON.stringify([msg.n,msg.d]));

        if(promise!==null) return promise;
    }
};

Server.__WebSock.onopen = (event) => {
    Server.__SockOpen = true;
    for(let i = 0; i < Server.__MsgQueue.length; i++) //send unsent ones
        Server.__WebSock.send(JSON.stringify([Server.__MsgQueue[i].n,Server.__MsgQueue[i].d]));
        

    console.log("Open");
    // WebSock.send("Here's some text that the server is urgently awaiting!");
};

Server.__WebSock.onmessage = (event) => {
    let m = Server.__MsgQueue.shift()!;
    m.cb(event.data);
    // console.log(event.data);
};

// WebSock.send("Here's some text that the server is urgently awaiting!");

function SaveAll(){
    Server.sendMsg({n:Server.MsgType.saveAll,d:{TAGS:TAGS,BLOCKS:BLOCKS}});
}

function LoadAll(){
    Server.sendMsg({n:Server.MsgType.loadAll,cb:((resp:any)=>{
        //let {_TAGS,_BLOCKS} = resp;

        TAGS = resp._TAGS ?? {};
        BLOCKS = resp._BLOCKS ?? {};
    })});

}