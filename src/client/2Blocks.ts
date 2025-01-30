

class Block{
    static _serializable_default = {children:[],tags:[],attribs:{},refCount:1};

    id:Id;
    refCount:number;
    
    pageTitle?:string;  //if has title then its a page!
    text:string;

    //usually-empty
    children:Id[];
    tags:Id[];
    attribs:objectA;

    constructor(){
        this.id = "";
        this.text = "";
        this.refCount = 1;
        this.children = [];
        this.tags = [];
        this.attribs = {};
    }
    DIRTY(){DIRTY.mark("_BLOCKS",this.id);}
    DIRTY_deleted(){DIRTY.mark("_BLOCKS",this.id,undefined);}
    static DIRTY_deletedS(id:Id){DIRTY.mark("_BLOCKS",id,undefined);}
    static new(text=""):Block{
        let b = new Block();
        _BLOCKS[b.id = PROJECT.genId()] = b;
        b.text = text;
        b.DIRTY();
        return b;
    }
    static newPage(title=""):Block{
        let b = new Block();
        _BLOCKS[b.id = PROJECT.genId()] = b;
        PAGES[b.id] = true;
        b.pageTitle = title;
        b.DIRTY();
        return b;
    }


    makeVisual(parentElement?:HTMLElement){
        return (new Block_Visual(this,parentElement));
    }

};
RegClass(Block);

