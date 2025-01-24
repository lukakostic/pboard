
type _AttrPath = string|string[];
class AttrPath{
    // path: string[];
    static parse(inp:string|string[]):string[]{
        if(typeof(inp) == 'string')
            return inp.split('.');
        else if(Array.isArray(inp))
            return inp;
        else throw new Error("Cant parse path, not string or array");
        /*
        else if(Array.isArray((inp as any).path)){
            return Object.setPrototypeOf(inp,AttrPath);
        }
        // if(typeof(inp) == 'string' || ){
        return new AttrPath(inp);
        // }else return inp;
        */
    }
    
    // static shift(path:string[]){
    //     if(path.length>0){
    //         return path.shift();
    //     }else return null;
    // }

}
// RegClass(AttrPath);