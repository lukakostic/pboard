


const __CANT_SERIALIZE = {CANT_SERIALIZE:1};
const __SERIALIZE_IGNORE = {SERIALIZE_IGNORE:1};

function _SerializeNoCircular(obj,options){
    if(obj === null) return 'null';
    else if(obj === true) return 'true';
    else if(obj === false) return 'false';
    else if(obj === undefined) return 'undefined';
    else if(typeof obj === 'function'){
        if(options.throwOnFunction) throw new Error("Cant serialize functions (options.throwOnFunction=true).");
        if(options.serializeFunctions) return `(${obj.toString()})`;
        return __SERIALIZE_IGNORE;
    }
    else if(typeof obj === 'object'){
        // find class
        let oClass = obj.constructor.name;
        if(options.constructorMap!==null){
            let idx = options.constructorMap.indexOf(obj.constructor);
            if(idx!=-1){
                oClass = `C[${idx}]`;
            }
        }
        if(options.testClassExists){
            let C = options.constructorMap;
            let classExists = false;
            try{classExists = (eval(`(${oClass})`) !== undefined);}catch(e){}
            if(classExists==false) throw new Error(`class "${oClass}" cannot be found.`);
        }
        let isArray = (Array.isArray(obj));
        // serialize object
        let serialized = null;
        
        serialized = isArray?"Object.assign([":"({";
        // if array:  Object.assign([],<serialized object>) so that way Array.isArray returns true, and we keep user-added properties.
        // eg if you do  let a=[]; a["myProp"]=5;  it will get serialized.

        // properties:
        let props = Object.getOwnPropertyNames(obj);
        let serializedPropsAll = "";
        let serializedProp;
        for(let i = 0, _il = props.length; i < _il; i++){
            serializedProp = _SerializeNoCircular(obj[props[i]]);
            if(serializedProp === __CANT_SERIALIZE || serializedProp === __SERIALIZE_IGNORE)
                continue;
            //write name of prop:
            if(props[i].indexOf('\'')==-1) serializedPropsAll += `'${props[i]}':`;
            else if(props[i].indexOf('"')==-1) serializedPropsAll += `"${props[i]}":`;
            else{ //escape string prop name
                serializedPropsAll += '"';
                //escape string:
                for(let j = 0, _jl = props[i].length; j<_jl; j++){
                    if(props[i][j]=='"') serializedPropsAll+='\\"';
                    else if(props[i][j]=='\'') serializedPropsAll+="'";
                    else if(props[i][j]=='\\') serializedPropsAll+='\\\\';
                    else if(props[i][j]=='\n') serializedPropsAll+='\\n';
                    else if(props[i][j]=='\r') serializedPropsAll+='\\r';
                    else if(props[i][j]=='\t') serializedPropsAll+='\\t';
                    else if(props[i][j]=='\v') serializedPropsAll+='\\v';
                    else if(props[i][j]=='\0') serializedPropsAll+='\\0';
                    else if(props[i][j]=='\a') serializedPropsAll+='\\a';
                    else if(props[i][j]=='\b') serializedPropsAll+='\\b';
                    else if(props[i][j]=='\f') serializedPropsAll+='\\f';
                    else if(props[i][j]=='\e') serializedPropsAll+='\\e';
                    else serializedPropsAll+=props[i][j];
                }
                serializedPropsAll += '":';
            }
            //serialzie prop:
            serializedPropsAll += serializedProp;
            //end of prop:
            serializedPropsAll += ',';
        }
        //end of properties
        serialized += isArray?("],({"+serializedPropsAll+"}))"):(serializedPropsAll+"})");
        
        if(oClass=='Object'){ // no class needed
            return `(${serialized})`;
        }else if(oClass == 'Function'){
            throw new Error("Cant serialize functions.");
        }else{ //has class
            return `(Object.setPrototypeOf(${serialized},${oClass}.prototype))`;
        }
        
    }
    //some other type eg number or string:
    return JSON.stringify(obj);
}

function _SerializeCircular(obj,options, obj_to_id, id_to_serialized, pushObject){
    if(obj === null) return 'null';
    else if(obj === true) return 'true';
    else if(obj === false) return 'false';
    else if(obj === undefined) return 'undefined';
    else if(typeof obj === "symbol") throw new Error("Cannot serialize a symbol");
    
    let isFunction = (typeof obj === 'function');
    if(isFunction && options.throwOnFunction)
        throw new Error("Cant serialize functions (options.throwOnFunction=true).");
    let isObject = (typeof obj === 'object');
    
    if(isObject || isFunction){

        //pre-push object as to register it before accessing properties which may contain circular references
        //but if it already exists then we get the existing index back.
        // we push options so it can set options.__alreadyRegistered = true/false
        let idx = pushObject(obj,null,options);
        if(options.__alreadyRegistered) return idx;        
        
        // find class
        let oClass = obj.constructor.name;
        if(options.constructorMap!==null){
            let idx = options.constructorMap.indexOf(obj.constructor);
            if(idx!=-1)
                oClass = `C[${idx}]`;
        }
        if(options.testClassExists){
            let C = options.constructorMap;
            let classExists = false;
            try{classExists = (eval(`(${oClass})`) !== undefined);}catch(e){}
            if(classExists==false) throw new Error(`class "${oClass}" cannot be found.`);
        }
        
        if(isFunction){
            if(options.serializeFunctions) 
                return pushObject(obj,`(Object.setPrototypeOf((${obj.toString()}),${oClass}.prototype))`);
            return __SERIALIZE_IGNORE;
        }else{ //is object or array

            let isArray = (Array.isArray(obj));

            // serialize object
            let serialized = isArray?"Object.assign([":"({";
            // if array:  Object.assign([],<serialized object>) so that way Array.isArray returns true, and we keep user-added properties.
            // eg if you do  let a=[]; a["myProp"]=5;  it will get serialized.

            // properties:
            let props = Object.getOwnPropertyNames(obj);
            let serializedPropsAll = "";
            let serializedProp;
            for(let i = 0, _il = props.length; i < _il; i++){
                serializedProp = _SerializeCircular(obj[props[i]],options, obj_to_id,id_to_serialized,pushObject);
                if(serializedProp === __CANT_SERIALIZE || serializedProp === __SERIALIZE_IGNORE)
                    continue;
                //write name of prop:
                if(props[i].indexOf('\'')==-1) serializedPropsAll += `'${props[i]}':`;
                else if(props[i].indexOf('"')==-1) serializedPropsAll += `"${props[i]}":`;
                else{ //escape string prop name
                    serializedPropsAll += '"';
                    //escape string:
                    for(let j = 0, _jl = props[i].length; j<_jl; j++){
                        if(props[i][j]=='"') serializedPropsAll+='\\"';
                        else if(props[i][j]=='\'') serializedPropsAll+="'";
                        else if(props[i][j]=='\\') serializedPropsAll+='\\\\';
                        else if(props[i][j]=='\n') serializedPropsAll+='\\n';
                        else if(props[i][j]=='\r') serializedPropsAll+='\\r';
                        else if(props[i][j]=='\t') serializedPropsAll+='\\t';
                        else if(props[i][j]=='\v') serializedPropsAll+='\\v';
                        else if(props[i][j]=='\0') serializedPropsAll+='\\0';
                        else if(props[i][j]=='\a') serializedPropsAll+='\\a';
                        else if(props[i][j]=='\b') serializedPropsAll+='\\b';
                        else if(props[i][j]=='\f') serializedPropsAll+='\\f';
                        else if(props[i][j]=='\e') serializedPropsAll+='\\e';
                        else serializedPropsAll+=props[i][j];
                    }
                    serializedPropsAll += '":';
                }
                //serialzie prop:
                serializedPropsAll += serializedProp;
                //end of prop:
                serializedPropsAll += ',';
            }
            serialized += isArray?("],({"+serializedPropsAll+"}))"):(serializedPropsAll+"})");
            //end of properties
            
            
            if(oClass=='Object'){ // no class needed
                return pushObject(obj,`(${serialized})`);
            }else if(oClass == 'Function'){
                throw new Error("Cant serialize functions.");
            }else{ //has class
                return pushObject(obj,`(Object.setPrototypeOf(${serialized},${oClass}.prototype))`);
            }
        }
        
    }
    //some other type eg number or string:
    return JSON.stringify(obj);
}

// options: { serializeFunctions:bool, throwOnFunction:bool }
// constructorMap - array of constructor functions.
// so you can register some nested / private function as constructor,  and reuse it later.
function Serialize(obj,options={}){
    //options = { serializeFunctions:true, throwOnFunction:false, testClassExists:true, circular:true };
    options.constructorMap ??= null;
    options.serializeFunctions ??= true;
    options.throwOnFunction ??= false;
    options.testClassExists ??= true;
    options.circular ??= true;


    if(options.circular == false){
        return _SerializeNoCircular(obj,options);
    }else{
        //for circular reference handling:
        let obj_to_id /*obj->id*/ = new WeakMap(); // so we can handle circular references and such
        let id_to_serialized /*id->obj*/ = [];
        let objId = 0; // running id
        let pushObject = (obj,serializedObj, _options=null)=>{
            // if serializedObj == null then we are just pre-registering the object, so just return the index.
            // if not null then we are trying to save the serialized data under the possibly already existing index.
            let idx = null;

            if(obj_to_id.has(obj)){
                if(_options!==null) _options.__alreadyRegistered = true;
                idx = obj_to_id.get(obj);
                if(serializedObj!==null)
                    id_to_serialized[idx] = serializedObj; //push (new?) obj.
            }
            else{
                if(_options!==null) _options.__alreadyRegistered = false;
                idx = objId++;
                obj_to_id.set(obj,idx);
                id_to_serialized.push(serializedObj); //push null or obj.
            }
            
            return `(O${idx})`;
        }

        
        let serialized = _SerializeCircular(obj,options, obj_to_id,id_to_serialized,pushObject);
        
        // do it backwards, since we pre-push objects and then their children, 
        // yet when re-creating them we need children made before parents.
        let idToObjSerialized = "";
        for(let i = id_to_serialized.length-1; i>=0; i--){
            idToObjSerialized+= `let O${i}=${id_to_serialized[i]};`;
        }

        return `((()=>{${idToObjSerialized}return ${serialized};})())`;
    }
}

function Deserialize(str,constructorMap=null){
    let C = constructorMap; //rename since we used "C" inside Serialize as alias for constructorMap (if cM. was used)
    return eval(str);
}