import { _AttrPath, AttrPath } from "../AttrPath.ts";
import { Id } from "../Common.ts";
import { Block,BlkFn, PAGES, PAGES_set } from "./Blocks.ts";
import { Server } from "./WebSock.ts";


export async function rpc(code:string|Function, ...fnArgs:any):Promise<any>{
    if(typeof code == 'function')
        code = `(${code}).apply(null,${JSON.stringify(fnArgs)});`;
    // else{

    //     // code = `(()=>{let f =()=>${code};return f();})();`;
    //     //done like so to ensure it works even if code has ; or not,
    // }
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

export async function LoadInitial(){
    let initial = await rpc(`client_LoadInitial()`) as any;
    PAGES_set(initial.PAGES);
}
export async function load(path:_AttrPath,depth:number=0){
    return await rpc(`client_Load(${JSON.stringify(path)})`);

}
export async function loadBlock(blockId:Id,depth:number) {
    
}
