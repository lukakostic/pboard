
class Tag{ 
    static _serializable_default = {attribs:{},parentTagId:"",childrenTags:[]};
    name : string | null; // null ako preuzima ime od rootBlock.
    rootBlock? : Id; //ako je tag baziran na bloku

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

    async getName(){
        if(this.name != null)
            return this.name;
        if(this.rootBlock === undefined)
            throw Error(`Tag ${this.id} has no name or rootBlock. Cant getName().`);
        let name = (await BLOCKS(this.rootBlock!)).pageTitle;
        if(name == null)throw Error(`Tag ${this.id} has rootBlock ${this.rootBlock} but it has null pageTitle. Cant getName().`);
        return name;
    }

    validate(){
        if(this.name==null)
            assert_non_null(this.rootBlock,"Tag with null name must be based on a block.");    
    }
    
    DIRTY(){this.validate();DIRTY.mark("_TAGS",this.id);}
    DIRTY_deleted(){DIRTY.mark("_TAGS",this.id,true);}
    static DIRTY_deletedS(id:Id){DIRTY.mark("_TAGS",id,true);}

    static async new(name:string,parentTagId:Id="" ,  waitServerSave=true) :Promise<Tag>{
        let t = new Tag();
        let parent :Tag|null = null;
        
        if(parentTagId!=""){
            parent = await TAGS(parentTagId);
            if(!parent) throw new Error(`Invalid parent: #${parentTagId} not found`);
        }
        
        _TAGS[t.id = PROJECT.genId()] = t;
        t.name = name;

        if(parentTagId!=""){ 
            t.parentTagId = parentTagId;
            parent!.childrenTags.push(t.id);    
        }

        t.DIRTY();

        if(waitServerSave)
            await SaveAll();
        return t;
    }
}
RegClass(Tag);

