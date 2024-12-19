import { Block,BlkFn } from "./Blocks.ts";
import { Server } from "./WebSock.ts";


export function rpc(code:string|Function, ...fnArgs:any){
    if(typeof code == 'function')
        code = `return (${code}).apply(null,${JSON.stringify(fnArgs)})`;
    return Server.sendMsg({n:Server.MsgType.eval,d:code});
}

// export function newBlock(text){
//     return rpc(t=>(new Block(t)),text);
//     //return Server.sendMsg({n:Server.MsgType.eval,d:`return (new Block(${JSON.stringify(text)}))`});
// }