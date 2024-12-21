import {Id, objectA} from '../Common.ts';
import { RegClass } from '../Serializer.ts';
import { genId } from './pb_server.ts';
import { TAGS } from './Tag.ts';

export var BLOCKS : {[index:Id]:Block} = {}; //all blocks
export var PAGES : {[index:Id]:true} = {}; //all pages
export function BLOCKS_set(o:any){return BLOCKS=o;}
export function PAGES_set(o:any){return BLOCKS=o;}

export const BlkFn = {
    DeleteBlocks_unsafe(ids:Id[]):boolean{
        /*
        delete blocks without checking refCount (if referenced from other blocks)
        */
        for(let i=0,l=ids.length;i<l;i++){
            if(PAGES[ids[i]]) delete PAGES[ids[i]];
            delete BLOCKS[ids[i]];
        }
        return true;
    },
    InsertBlockChild(parent:Id, child:Id, index:number ):Id[]{
        const l = BLOCKS[parent].children;
        if(index >= l.length){
            l.push(child);
        }else{
            l.splice(index,0,child);
        }
        return l;
    },
    SearchPages(title:string,mode:'exact'|'startsWith'|'includes'='exact'):Id[]{
        let pages = Object.keys(PAGES).map(k=>BLOCKS[k]);
        if(mode=='exact'){
            return pages.filter(p=>p.pageTitle == title).map(p=>p.id);
        }else if(mode=='startsWith'){
            return pages.filter(p=>p.pageTitle?.startsWith(title)).map(p=>p.id);
        }else if(mode=='includes'){
            return pages.filter(p=>p.pageTitle?.includes(title)).map(p=>p.id);
        }
        return [];
    },
    SearchTags(title:string,mode:'exact'|'startsWith'|'includes'='exact'):Id[]{
        let pages = Object.values(TAGS);//.map(k=>BLOCKS[k]);
        if(mode=='exact'){
            return pages.filter(p=>p.name == title).map(p=>p.id);
        }else if(mode=='startsWith'){
            return pages.filter(p=>p.name?.startsWith(title)).map(p=>p.id);
        }else if(mode=='includes'){
            return pages.filter(p=>p.name?.includes(title)).map(p=>p.id);
        }
        return [];
    },
    HasTagBlock(tagId:Id,blockId:Id):boolean{
        return TAGS[tagId].blocks.indexOf(blockId)!=-1;
    },
    TagBlock(tagId:Id,blockId:Id):boolean{
        if(this.HasTagBlock(tagId,blockId)) return false;
        TAGS[tagId].blocks.push(blockId);
        BLOCKS[blockId].tags.push(tagId);
        return true;
    },
    RemoveTagBlock(tagId:Id,blockId:Id):boolean{
        if(this.HasTagBlock(tagId,blockId) == false) return false;
        TAGS[tagId].blocks.splice(TAGS[tagId].blocks.indexOf(blockId),1);
        BLOCKS[blockId].tags.splice(BLOCKS[blockId].tags.indexOf(tagId),1);
        return true;
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
    static new(text=""):Block{
        let b = new Block();

        BLOCKS[b.id = genId()] = b;
        b.text = text;

        return b;
    }
    static newPage(title=""):Block{
        let b = new Block();

        BLOCKS[b.id = genId()] = b;
        PAGES[b.id] = true;
        b.pageTitle = title;

        return b;
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

