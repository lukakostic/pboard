import {Id,objectA,genId} from './ID.ts';
import { RegClass } from './Serializer.ts';

export var TAGS : {[index:Id]:Tag} = {}; //all blocks

export class Tag{  //$$C:string;
    static _serializable_default = {attribs:{}};
    name : string;
    id:Id;
    blocks:Id[];
    attribs?:objectA;

    constructor(name:string){
        this.name = name;
        this.blocks = [];
        this.id = genId();
        TAGS[this.id] = this;

        this.attribs = {};
    }
}
RegClass(Tag);