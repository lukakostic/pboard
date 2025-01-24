
/*
What are common diff situations?
1. new (nested) key (and value)
2. (nested) key removed
3. promena vrednosti ((nested) key)

ako se menja higher level key, brise se lower level key
*/
class Diff{
    path:string[];
    value:any;
    constructor(p:_AttrPath,v:any){
        this.path = AttrPath.parse(p);
        this.value = v;
    }
}
RegClass(Diff);
class DiffList{
    list:Diff[];
    constructor(){
        this.list = [];
    }
    push(d:Diff){
        for(let i=0;i<this.list.length;i++){
            this.list[i].path
        }
        this.list.push(d);
    }
}
RegClass(DiffList);