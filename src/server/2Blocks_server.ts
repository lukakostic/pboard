
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
    static new(text=""):Block{
        let b = new Block();
        BLOCKS[b.id = genId()] = b;
        b.text = text;
        return b;
    }
    static newPage(title=""):Block{
        let b = new Block();
        BLOCKS[b.id = genId()] = b;
        PAGES[b.id] = true;
        b.pageTitle = title;
        return b;
    }

};
RegClass(Block);

