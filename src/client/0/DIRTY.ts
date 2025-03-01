type _DIRTY_Entry = [string,Id|undefined,boolean];
const DIRTY = {
    _ : [] as _DIRTY_Entry[],
    error : null as null|Error,


    mark(singleton:string,id?:any,isDeleted=false) :void{
        // check if user didnt make mistake in strEval string: 
        try{eval(this.evalStringResolve(singleton,id));}catch(e){throw Error("Eval cant find object "+singleton+" id "+id+". :"+e);}
        
        const require_id = ["_BLOCKS","_TAGS"];
        if(require_id.includes(singleton) && id===undefined) throw Error(`${singleton} requires an ID but none provided.`);
        if(require_id.includes(singleton)==false && id!==undefined) throw Error(`${singleton} doesnt support an ID but id '${id}' was provided.`);

        this._ = this._.filter(p=>!(p[0]==singleton && p[1]==id));// && (isDeleted?(p[2]==true):(p[2]!=true))));
        
        this._.push([singleton,id,isDeleted]);
        // console.error("Marked: ",[singleton,id,isDeleted]);
    },
    evalStringResolve(singleton:string,id?:any):string{
        let finalEvalStr = singleton;
        if(id!==undefined){
            finalEvalStr += `["${id}"]`;
        }
        //else throw Error("Unexpected evalStr length: " + JSON.stringify(strEval));
        return finalEvalStr;
    }
};


/**
 * Like a normal array but it mocks pop,push,splice functions, 
 * so when called it calls this.set() function of object.
 * Telling it the array was modified.
 */
/*
class ProxyArraySetter_NO{
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
        return ApplyClass(arr,ProxyArraySetter) as any[];
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
*/
/** same as array. */
//declare type TProxyArraySetter_NO<T> = T[];

  