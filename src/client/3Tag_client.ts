

class Tag{
    static _serializable_default = {attribs:{},parentTagId:"",childrenTags:{}};
    id:Id;
    _name : string;
    _parentTagId:Id;
    _childrenTags:TProxyArraySetter<Id>;
    _blocks:TProxyArraySetter<Id>;
    _attribs:objectA;

    get name(){return this._name;}
    // set name(v:string){this.set("_name",v);}
    // async name_set(v:string){return await this.set("_name",v);}
    get parentTagId(){return this._parentTagId;}
    get childrenTags(){return this._childrenTags;}
    get blocks(){return this._blocks;}
    get attribs(){return this._attribs;}

    constructor(){
        this.id = "";
        this._name = "";
        this._parentTagId = "";
        this._childrenTags = ProxyArraySetter.__new(this,"_childrenTags");
        this._blocks = ProxyArraySetter.__new(this,"_blocks");
        this._attribs = {};
    }
    __serialize__(){
        return Object.setPrototypeOf({
            id:this.id,
            name:this._name,
            parentTagId:this._parentTagId,
            childrenTags:this._childrenTags,
            blocks:this._blocks,
            attribs:this._attribs
        },Tag.prototype);
    }
    static __deserialize__(o:any){
        let t = new Tag();
        t.id = o.id;
        t._name = o.name;
        t._parentTagId = o.parentTagId;
        t._childrenTags = ProxyArraySetter.__new(this,"_childrenTags",o.childrenTags);
        t._blocks = ProxyArraySetter.__new(this,"_blocks",o.blocks);
        t._attribs = o.attribs;
        return t;
    }
    async set(path:_AttrPath,value:any,doAssign=true){
        path = AttrPath.parse(path);
        console.log("SETTING ",path);
        let field = path[0];
        if(field.startsWith("_")){
            if(doAssign)
                (this as any)[field] = value;
            field = field.substring(1);
            path[0] = field;
        }else{
            if(doAssign){
                if((this as any)['_'+field] !== undefined)
                    (this as any)['_'+field] = value;
            }
        }
        return await rpc(`server_set`,["TAGS",this.id,...path],value);
    }
    static async new(name:string){
        let t =  await rpc(`Tag.new`,name) as Tag;
        _TAGS[t.id] = t;
        if(t._parentTagId)
            (await TAGS[t._parentTagId])._blocks.push(t.id);
        return t;
    }
}
RegClass(Tag);