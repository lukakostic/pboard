
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
