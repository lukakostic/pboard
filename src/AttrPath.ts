
export type _AttrPath = AttrPath|string|string[];
export class AttrPath{
    path: string[];
    static parse(inp:AttrPath|string|string[]):AttrPath{
        if(inp instanceof AttrPath) return inp;
        else if(Array.isArray((inp as any).path)){
            return Object.setPrototypeOf(inp,AttrPath);
        }
        // if(typeof(inp) == 'string' || ){
        return new AttrPath(inp);
        // }else return inp;
    }
    constructor(inp:string|string[]){
        if(typeof(inp) == 'string')
            this.path = inp.split('.');
        else if(Array.isArray(inp))
            this.path = inp;
        else throw new Error("Cant parse path, not string or array");
    }
}