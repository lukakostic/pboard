import {Id,objectA} from '../Common.ts';
import { RegClass } from '../Serializer.ts';
import { rpc } from './client.ts';

export var TAGS : {[index:Id]:Tag} = {}; //all blocks
export function TAGS_set(o:any){return TAGS=o;}

export class Tag{  //$$C:string;
    static _serializable_default = {attribs:{}};
    name : string;
    id:Id;
    blocks:Id[];
    attribs?:objectA;

    constructor(){
        this.id = "";
        this.name = "";
        this.blocks = [];
        this.attribs = {};
    }
    static async new(name:string){
        let t =  Object.assign(new Tag(), await rpc(Tag.new,name));
        TAGS[t.id] = t;
        return t;
    }
}
RegClass(Tag);