import { Block_Visual } from './Blocks_Visual2.ts';
import { rpc } from './client.ts';
import {Id, objectA} from '../ID.ts';
import { RegClass } from '../Serializer.ts';

export var BLOCKS : {[index:Id]:Block} = {}; //all blocks
export function BLOCKS_set(o:any){return BLOCKS=o;}

export const BlkFn = {
    DeleteBlocks_unsafe(ids:Id[]){
        return rpc(BlkFn.DeleteBlocks_unsafe,ids);
    }
}

export class Block{  //$$C:string;
    static _serializable_default = {children:[],attribs:{},refCount:1};

    pageTitle?:string;  //if has title then its a page!

    id:Id;
    refCount:number;
    text:string;
    //usually-empty
    children:Id[];
    attribs:objectA;

    constructor(){
        this.id = "";
        this.text = "";
        this.refCount = 1;
        this.children = [];
        this.attribs = {};
    }
    static async new(text=""){
        let b = Object.assign(new Block(),await rpc(Block.new,text));
        BLOCKS[b.id] = b;
        return b;
    }
    makeVisual(parentElement?:HTMLElement){
        return (new Block_Visual(this,parentElement));
    }
    // deserialize_fn(){
    //     if(this.children===undefined) this.children = [];
    //     if(this.attribs===undefined) this.attribs = {};
    // }
    // serialize_fn(){
    //     let s = `{${SerializeClass(this)
    //     },id:${this.id},text:"${EscapeStr(this.text)}"`;
    //     if(this.children.length>0) s+=`,children:${JSON_Serialize(this.children)}`;
    //     if(this.attribs!=null /*empty object*/) s+=`,attribs:${JSON_Serialize(this.attribs)}`;
    //     return s+"}";
    // }

};
RegClass(Block);

