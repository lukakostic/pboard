import {Id,objectA} from '../Common.ts';
import { RegClass } from '../Serializer.ts';
import { load, rpc } from './client.ts';

export var _TAGS : {[index:Id]:Tag|null} = {}; //all blocks
export var TAGS = new Proxy({},{
    async get(target,key:string,receiver){
        if(_TAGS[key] === null)
            _TAGS[key] = await load(["TAGS",key]) as Tag;
        return _TAGS[key] as Tag;
    },
    set(target,key,newValue,receiver){
        throw new Error("Cannot set whole object value.");
        return true;
    }
}) as {[index:Id]:Promise<Tag>};
export function TAGS_set(o:any){return _TAGS=o;}

export class Tag{
    static _serializable_default = {attribs:{},parentTagId:"",childrenTags:{}};
    name : string;
    id:Id;
    parentTagId:Id;
    childrenTags:Id[];
    blocks:Id[];
    attribs?:objectA;

    constructor(){
        this.id = "";
        this.name = "";
        this.parentTagId = "";
        this.childrenTags = [];
        this.blocks = [];
        this.attribs = {};
    }
    static async new(name:string){
        let t =  Object.assign(new Tag(), await rpc(Tag.new,name)) as Tag;
        _TAGS[t.id] = t;
        if(t.parentTagId)
            (await TAGS[t.parentTagId]).blocks.push(t.id);
        return t;
    }
}
RegClass(Tag);