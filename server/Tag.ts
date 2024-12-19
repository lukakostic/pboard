import {Id,objectA} from '../Common.ts';
import { RegClass } from '../Serializer.ts';
import { genId } from './pb_server.ts';

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
    static new(name:string){
        let t = new Tag();
        
        TAGS[t.id = genId()] = t;
        t.name = name;

        return t;
    }
}
RegClass(Tag);