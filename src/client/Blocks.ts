import { Block_Visual } from './View_Blocks_Visual.ts';
import { load, rpc } from './client.ts';
import {Id, objectA} from '../Common.ts';
import { RegClass } from '../Serializer.ts';
import { _TAGS, TAGS } from './Tag.ts';

export var _BLOCKS : {[index:Id]:Block|null} = {}; //all blocks
export var BLOCKS = new Proxy({},{
    async get(target,key:string,receiver){
        if(_BLOCKS[key] === null)
            _BLOCKS[key] = await load(["BLOCKS",key]) as Block;
        return _BLOCKS[key] as Block;
    },
    set(target,key,newValue,receiver){
        throw new Error("Cannot set whole object value.");
        return true;
    }
}) as {[index:Id]:Promise<Block>};
export var PAGES : {[index:Id]:true} = {}; //all pages
export function BLOCKS_set(o:any){return _BLOCKS=o;}
export function PAGES_set(o:any){return _BLOCKS=o;}

export const BlkFn = {
    async DeleteBlocks_unsafe(ids:Id[]):Promise<boolean>{
        return await rpc(BlkFn.DeleteBlocks_unsafe,ids);
    },
    async InsertBlockChild(parent:Id, child:Id, index:number ):Promise<Id[]>{
        const nl = await rpc(BlkFn.InsertBlockChild,parent,child,index);
        //replace children list with new list (in-place as to not loose references)
        const l = (await BLOCKS[parent]).children;
        l.splice(0,l.length,...nl); //in-place remove all and insert new
        return l;
    },
    async SearchPages(title:string,mode:'exact'|'startsWith'|'includes'='exact'):Promise<Id[]>{
        return await rpc(BlkFn.SearchPages,title,mode);
    },
    async SearchTags(title:string,mode:'exact'|'startsWith'|'includes'='exact'):Promise<Id[]>{
        return await rpc(BlkFn.SearchTags,title,mode);
    },
    async HasTagBlock(tagId:Id,blockId:Id):Promise<boolean>{
        return await rpc(BlkFn.HasTagBlock,tagId,blockId);
    },
    async TagBlock(tagId:Id,blockId:Id):Promise<boolean>{
        if(await rpc(BlkFn.TagBlock,tagId,blockId)){
            (await TAGS[tagId]).blocks.push(blockId);
            (await BLOCKS[blockId]).tags.push(tagId);
            return true;
        }
        return false;
    },
    async RemoveTagBlock(tagId:Id,blockId:Id):Promise<boolean>{
        if(await rpc(BlkFn.RemoveTagBlock,tagId,blockId)){
            (await TAGS[tagId]).blocks.splice(_TAGS[tagId]!.blocks.indexOf(blockId),1);
            (await BLOCKS[blockId]).tags.splice(_BLOCKS[blockId]!.tags.indexOf(tagId),1);
            return true;
        }
        return false;
    },
}

export class Block{
    static _serializable_default = {children:[],tags:[],attribs:{},refCount:1};

    pageTitle?:string;  //if has title then its a page!

    id:Id;
    refCount:number;
    text:string;
    //usually-empty
    children:Id[];
    tags:Id[];
    attribs:objectA;

    constructor(){
        this.id = "";
        this.text = "";
        this.refCount = 1;
        this.children = [];
        this.tags = [];
        this.attribs = {};
    }
    static async new(text=""):Promise<Block>{
        let b = Object.assign(new Block(),await rpc(Block.new,text)) as Block;
        _BLOCKS[b.id] = b;
        return b;
    }
    static async newPage(title=""):Promise<Block>{
        let b = Object.assign(new Block(),await rpc(Block.newPage,title)) as Block;
        _BLOCKS[b.id] = b;
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

