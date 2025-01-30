type _DIRTY_Entry = [string,Id|undefined,false|undefined];
var DIRTY = {
    _ : [] as _DIRTY_Entry[],
    error : null as null|Error,


    mark(singleton:string,id?:any,isDeleted:false|undefined=false) :void{
        // check if user didnt make mistake in strEval string: 
        try{eval(this.evalStringResolve(singleton,id));}catch(e){throw Error("Eval cant find object "+singleton+" id "+id+". :"+e);}
    
        while(true){ //remove same or longer/more-specific already marked  (["BLOCKS",1] should shadow ["BLOCKS",1,2,3] as its more general)
            
            for(let i = 0; i<this._.length;i++){
                if(this._[i][0] == singleton){
                    if(id!==undefined && this._[i][1]===undefined) return; //theyre more specific than us!
                    if((id===this._[i][1]) || (this._[i][1]!==undefined && id===undefined)){
                        this._.splice(i,1);
                        break;
                    }
                }
            }
            // let idx = this.findAnyMatch(singleton,id);
            // if(idx==-1) break;
            // if(id===undefined && this._[idx][1]!==undefined)
            // // if(this._[idx].length>strEval.length) // we are less specific than existing, delete existing
            //     this._.splice(idx,1);
            // else if(this._[idx][id] === id)
            // // else if(this._[idx].length==strEval.length && this._[idx][1] == strEval[1])
            //     return;  // exact copy of us is already saved. quit.
            // else return; // its actually less specific than us!! we should quit.
        }
        this._.push([singleton,id,isDeleted]);
    },
    // findAnyMatch(singleton:string,id?:any){
    //     for(let i = 0; i<this._.length;i++){
    //         if(this._[i][0] == singleton){
    //             //if(this._[i][1]===undefined)
    //                 return i;
    //         }
    //         // let len = this._[i].length; if(len>strEval.length) len=strEval.length;
    //         // let matchesAll = true;
    //         // for(let j=0;j<len;j++){
    //         //     if(this._[i][j] != strEval[j])
    //         //         matchesAll = false;
    //         // }
    //         // if(matchesAll) return i;
    //     }
    //     return -1;
    // },
    evalStringResolve(singleton:string,id?:any):string{
        let finalEvalStr = singleton;
        if(id!==undefined){
            finalEvalStr += `["${id}"]`;
        }
        //else throw Error("Unexpected evalStr length: " + JSON.stringify(strEval));
        return finalEvalStr;
    }
};

// function unmark_DIRTY(strEval:[string,...any]) :void{
//     if(_DIRTY[strEval])
//         delete _DIRTY[strEval];
//}
/*async function set(path:_AttrPath,value:any){
    // path=AttrPath.parse(path);
    return (await rpc(`server_set`,path,value));
}*/

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
*/
/** same as array. */
//declare type TProxyArraySetter_NO<T> = T[];
