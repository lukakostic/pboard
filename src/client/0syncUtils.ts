async function set(path:_AttrPath,value:any){
    // path=AttrPath.parse(path);
    return (await rpc(`server_set`,path,value));
}

/**
 * Like a normal array but it mocks pop,push,splice functions, 
 * so when called it calls this.set() function of object.
 * Telling it the array was modified.
 */
class ProxyArraySetter{
    __obj:any; __field:string;
    constructor(obj:any,field:string){
        this.__obj = obj;
        this.__field = field;
    }
    static __new(obj:any,field:string,existingArray:any[]|null=null){
        let arr;
        if(existingArray===null){
            arr = [];
            // arr.push(...obj[field]);
        }else arr = existingArray;
        let p = new ProxyArraySetter(obj,field);
        Object.assign(arr,p);
        return Object.setPrototypeOf(arr,ProxyArraySetter.prototype) as any[];
    }
    push(...items:any){
        let r = Array.prototype.push.apply(this,items);
        this.__obj.set(this.__field,this,false);
        return r;
    }
    pop(...items:any){
        let r = Array.prototype.pop.apply(this,items);
        this.__obj.set(this.__field,this,false);
        return r;
    }
    splice(...items:any){
        let r = Array.prototype.splice.apply(this,items);
        this.__obj.set(this.__field,this,false);
        return r;
    }
}
/** same as array. */
declare type TProxyArraySetter<T> = T[];
