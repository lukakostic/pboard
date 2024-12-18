import {Id,genId, objectA} from './ID.ts';
import { RegClass } from './Serializer.ts';

export var BLOCKS : {[index:Id]:Block} = {}; //all blocks

export function DeleteBlocks_unsafe(ids:Id[]){
    /*
    delete blocks without checking refCount (if referenced from other blocks)
    */
   for(let i=0,l=ids.length;i<l;i++){
    delete BLOCKS[ids[i]];
   }
   //[TODO] report to server
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

    constructor(text=""){
        // this.$$C=$$C(Block);

        this.id = genId();
        BLOCKS[this.id] = this;
        this.text = text;

        this.refCount = 1;
        this.children = [];
        this.attribs = {};
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

