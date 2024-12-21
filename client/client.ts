import { Block,BlkFn } from "./Blocks.ts";
import { Server } from "./WebSock.ts";


export async function rpc(code:string|Function, ...fnArgs:any):Promise<any>{
    if(typeof code == 'function')
        code = `return (${code}).apply(null,${JSON.stringify(fnArgs)})`;
    let resp = await Server.sendMsg({n:Server.MsgType.eval,d:code});
    throwIf(resp);
    return resp;
}
export function throwIf(obj:any){
    if(obj instanceof Error){
        throw obj;
    }
}
// export function newBlock(text){
//     return rpc(t=>(new Block(t)),text);
//     //return Server.sendMsg({n:Server.MsgType.eval,d:`return (new Block(${JSON.stringify(text)}))`});
// }