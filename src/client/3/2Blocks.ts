

class Block{
    static _serializable_default = {text:"",children:[],tags:[],attribs:{},refCount:1,collapsed:false};

    id:Id;
    refCount:number;
    
    pageTitle?:string;
    text:string;

    children:Id[];
    tags:Id[];
    attribs:objectA;
    collapsed: boolean;

    constructor(){
        this.id = "";
        this.text = "";
        this.refCount = 1;
        this.children = [];
        this.tags = [];
        this.attribs = {};
        this.collapsed = false;
    }
    
    DIRTY(){this.validate();DIRTY.mark("_BLOCKS",this.id);}
    DIRTY_deleted(){DIRTY.mark("_BLOCKS",this.id,true);}
    static DIRTY_deletedS(id:Id){DIRTY.mark("_BLOCKS",id,true);}
    validate(){} // nothing to validate. Maybe pageTitle cant be set if Block isnt in PAGES ?

    static async new(text="",  waitServerSave=true):Promise<Block>{
        let b = new Block();
        _BLOCKS[b.id = PROJECT.genId()] = b;
        b.text = text;
        b.DIRTY();
        if(waitServerSave)
            await SaveAll();
        return b;
    }
    static async newPage(title="" , waitServerSave=true):Promise<Block>{
        let b = new Block();
        _BLOCKS[b.id = PROJECT.genId()] = b;
        PAGES[b.id] = true;
        DIRTY.mark("PAGES");
        b.pageTitle = title;
        b.DIRTY();
        if(waitServerSave)
            await SaveAll();
        return b;
    }


    async makeVisual(parentElement?:HTMLElement, maxUncollapseDepth=999){
        let bv = (new Block_Visual(this, parentElement, this.collapsed)); // ignore collapsed since we will call updateAll anyways.
        await bv.updateAll(maxUncollapseDepth);
        return bv;
    }

};
RegClass(Block);


