
// let __SerializableClasses = [Block];
// let __classToId = new WeakMap<any,string>();
let __IdToClass : {[index:string]:any} = {};
// __SerializableClasses.forEach((e,i)=>{if(e)__classToId.set(e,i);});
// let __registeredClasses : {[index:string]:any} = {}; // class.name => class (obj)

/** Register class as serializable.
 * @param suffix   if 2 classes have same name, use this to differentiate. MUST BE JSON-FRINEDLY STRING.
 */
function RegClass(_class:any){ /*Serialize class.*/
    console.log("REGISTERING CLASS",_class);
    // if(__classToId.has(_class)) return __classToId.get(_class);
    let id = _class.name;// + suffix;
    console.log("Registering ID:" ,id);
    if(__IdToClass[id] != null) throw new Error("Clashing class names. "+id); 
    // __classToId.set(_class,id);  //register class name with class
    __IdToClass[id] = _class; //register class name to class object
    return id;
}
class Unknown_SerializeClass{}
function SerializeClass(originalObj:any,_class?:any){ //obj is of some class
    let cls = _class ?? Object.getPrototypeOf(originalObj).constructor;
    console.log(cls);
    if(cls == Object) return '';
    let id = _class.name;
    if(__IdToClass[id] === undefined) throw new Error("Class not registered for serialization: "+id); 
    // let idx = __classToId.get(cls);
    // if(typeof idx != null) throw new Error("Class not registered for serialization:"+cls.name);
    return `"$$C":"${id}"`;
    //originalObj.__$class$__ = idx; // __$class$__
    //return originalObj;
}
// function DeserializeClass(scaffoldObj){ //obj is of no class, its an object. but it has a .__$class$__ property
// }

function EscapeStr(str:string){
    let s = "";
    for(let i=0,_il=str.length;i<_il;i++ ){
        if(str[i]=='"') s+='\\"';
        else if(str[i]=='\'') s+="'";
        else if(str[i]=='\\') s+='\\\\';
        else if(str[i]=='\n') s+='\\n';
        else if(str[i]=='\r') s+='\\r';
        else if(str[i]=='\t') s+='\\t';
        else if(str[i]=='\v') s+='\\v';
        else if(str[i]=='\0') s+='\\0';
        else if(str[i]=='\a') s+='\\a';
        else if(str[i]=='\b') s+='\\b';
        else if(str[i]=='\f') s+='\\f';
        else if(str[i]=='\e') s+='\\e';
        else s+=str[i];
    }
    return s;
}

function JSON_Serialize(obj:any){//,  key?:string,parent?:any){
    console.log("serializing:",obj);
    if(obj === null) return "null";
    else if(obj === undefined) return null;  //skip
    //return "null";
    //else if(typeof obj ==='string') return `"${EscapeStr(obj)}"`;
    else if(Array.isArray(obj)){
        let defaults = Object.getPrototypeOf(obj).constructor._serializable_default ?? {};

        let s = "[";
        for(let i=0,_il=obj.length; i<_il; i++){
            if(i!=0)s+=",";
            s+=JSON_Serialize(obj[i]);
        }
        s += "]";
        return s;
    }else if(typeof obj == 'object') {
        console.log("SERIALIZING OBJECT:",obj);
        if(obj.__serialize__) obj = obj.__serialize__();
        console.log("SERIALIZING OBJECT2:",obj);
        let _class = Object.getPrototypeOf(obj).constructor;
        console.log("CLASS:",_class,_class.name);
        let defaults = _class._serializable_default;
        console.log("DEFAULTS:",defaults);
        // if(obj.serialize_fn) return obj.serialize_fn();
        let classId = SerializeClass(obj,_class); 
        let s = `{${classId}`;
        let k = Object.getOwnPropertyNames(obj);
        let insertComma = (classId!=''); //was class atr inserted?
        for(let i=0,l=k.length;i<l;i++){
            if(defaults && defaults[k[i]] == obj[k[i]]) continue; //skip this attribute
            let ser = JSON_Serialize(obj[k[i]]);
            if(ser === null) continue; //skip.

            if(insertComma) s+=',';
            //for performance reasons, dont escape strings.
            //yes it can corrupt your json.
            //up to plugin devs to watch out for it.
            s+=`"${k[i]/*EscapeStr(k[i])*/}":${ser}`;
            insertComma = true;
        }
        s+='}';
        return s;
    }
    return JSON.stringify(obj);
}
function __Deserialize(o:objectA ,allowUnknownClasses=false):any{
    console.log("deserializing:",o);
    if(o === null) return null;
    if(Array.isArray(o))
        return o.map((e)=>__Deserialize(e));
    if(typeof o != 'object'){
        console.log("Primitive:",o);
        return o; //assuming its primitive.
        
    } 
    // DeserializeClass(o);
    let classId = o.$$C;
    let _class:any = null;
    let defaults:any = {};
    if(classId !== undefined){
        _class = __IdToClass[classId];
        delete o.$$C;
        if(_class == null){
            if(allowUnknownClasses)
                _class = Unknown_SerializeClass.prototype;
            else
                throw new Error("Class not recognised:",classId);
        }
        Object.setPrototypeOf(o,_class); //applies in-place to object
        defaults = _class._serializable_default ?? {};
        
    }
    // end Deserialize class

    console.log("Deserializing object:",o,"defaults:",defaults,"class:",_class);

    let keys = Object.getOwnPropertyNames(o);
    for(let k=0,kl=keys.length;k<kl;k++){
        o[keys[k]] = __Deserialize(o[keys[k]]);
    }

    //apply defaults
    let dk = Object.keys(defaults);
    for(let i = 0,il=dk.length;i<il;i++){
        let k = dk[i];
        if(o[k] === undefined){
            let d = defaults[k];
            // we must make copies of the defaults, not use the same object.
            if(Array.isArray(d)) o[k] = [];
            else if(d===null) o[k] = null;
            else if(typeof d == 'object') o[k] = {};
            else o[k] = d;
        }
    }

    if(_class && _class.__deserialize__) o = _class.__deserialize__(o);
    console.log("returning deserialized",o);

    // if(o.deserialize_fn) o.deserialize_fn();
    return o;
}
function JSON_Deserialize(str:string,allowUnknownClasses=false):any{
    console.log(str);
    return __Deserialize( JSON.parse(str) , allowUnknownClasses);
}

/*******************
 LIMITATIONS TO SERIALIZATION

 NO CIRCULAR REFERENCES.
 No arrays with special properties or classes.
*********************/