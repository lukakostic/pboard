
class Tag{ 
    static _serializable_default = {attribs:{},parentTagId:"",childrenTags:{}};
    name : string;
    id:Id;
    parentTagId:Id;
    childrenTags:Id[];
    blocks:Id[];
    attribs:objectA;

    constructor(){
        this.id = "";
        this.name = "";
        this.parentTagId = "";
        this.childrenTags = [];
        this.blocks = [];
        this.attribs = {};
    }
    DIRTY(){DIRTY.mark("_TAGS",this.id);}
    DIRTY_deleted(){DIRTY.mark("_TAGS",this.id,undefined);}
    static DIRTY_deletedS(id:Id){DIRTY.mark("_TAGS",id,undefined);}
    static async new(name:string,parentTag:Id=""){
        let t = new Tag();
        let parent :Tag|null = null;
        
        if(parentTag!=""){
            parent = await TAGS(parentTag);
            if(!parent) throw new Error(`Invalid parent: #${parentTag} not found`);
        }
        
        _TAGS[t.id = PROJECT.genId()] = t;
        t.name = name;

        if(parentTag!=""){ 
            t.parentTagId = parentTag;
            parent!.childrenTags.push(t.id);    
        }

        t.DIRTY();
        return t;
    }
}
RegClass(Tag);