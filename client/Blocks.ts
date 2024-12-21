import { Block_Visual } from './Blocks_Visual2.ts';
import { rpc } from './client.ts';
import {Id, objectA} from '../Common.ts';
import { RegClass } from '../Serializer.ts';

export var BLOCKS : {[index:Id]:Block} = {}; //all blocks
export var PAGES : {[index:Id]:true} = {}; //all pages
export function BLOCKS_set(o:any){return BLOCKS=o;}
export function PAGES_set(o:any){return BLOCKS=o;}

export const BlkFn = {
    async DeleteBlocks_unsafe(ids:Id[]){
        return await rpc(BlkFn.DeleteBlocks_unsafe,ids);
    },
    async InsertBlockChild(parent:Id, child:Id, index:number ){
        const nl = await rpc(BlkFn.InsertBlockChild,parent,child,index);
        //replace children list with new list (in-place as to not loose references)
        const l = BLOCKS[parent].children;
        l.splice(0,l.length,...nl); //in-place remove all and insert new
        return l;
    },
    async SearchPages(title:string,mode:'exact'|'startsWith'|'includes'='exact'){
        return await rpc(BlkFn.SearchPages,title,mode);
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
    static async new(text=""):Promise<Block>{
        let b = Object.assign(new Block(),await rpc(Block.new,text)) as Block;
        BLOCKS[b.id] = b;
        return b;
    }
    static async newPage(title=""):Promise<Block>{
        let b = Object.assign(new Block(),await rpc(Block.newPage,title)) as Block;
        BLOCKS[b.id] = b;
        PAGES[b.id] = true;
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

