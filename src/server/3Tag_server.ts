
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
    static new(name:string,parentTag:Id=""){
        let t = new Tag();
        let parent :Tag|null = null;
        
        if(parentTag!=""){
            parent = TAGS[parentTag];
            if(!parent) throw new Error(`Invalid parent: #${parentTag} not found`);
        }
        
        TAGS[t.id = genId()] = t;
        t.name = name;

        if(parentTag!=""){
            t.parentTagId = parentTag;
            parent!.childrenTags.push(t.id);    
        }

        return t;
    }
}
RegClass(Tag);