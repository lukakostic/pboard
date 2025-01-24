/** Clone of some server object. */
class ServerProxyObject<Tkey,Tvalue>{
    serverObjName:string; // BLOCKS
    // objCached:TMap<Id,Tvalue|null>; // BLOCKS cached value
    objProxy:TMap<Id,Promise<Tvalue>>; // proxy to BLOCK which handles async loading
    objCached_getFn : Function;

    get objCached() :TMap<Id,Tvalue|null> {
        return this.objCached_getFn();
    }
    constructor(serverObjName:string){
        this.serverObjName = serverObjName;
        // this.objCached = {};
        this.objCached_getFn = new Function(`return _${serverObjName};`);
        //new Function()

        const SELF = this;
        this.objProxy = new Proxy({},{
            async get(target,key:string,receiver){
                if(SELF.objCached[key] === null) //no cached value present
                    SELF.objCached[key] = await rpc(`((k)=>(${SELF.serverObjName}[k]))`,key) as Tvalue;
                return SELF.objCached[key] as Tvalue;
            },
            set(target,key,newValue,receiver){
                throw new Error("Cannot set whole object value. Use the 'set' method.");
                return true;
            }
        }) as {[index:string]:Promise<Tvalue>};   
    }
    static new<Tkey,Tvalue>(serverObjName:string) :TMap<Id,Promise<Tvalue>>{
    //:[ TMap<Id,Tvalue|null>, TMap<Id,Promise<Tvalue>>, ServerProxyObject<Tkey,Tvalue> ]{
        let t = new ServerProxyObject<Tkey,Tvalue>(serverObjName);
        return t.objProxy;
        //return [t.objCached,t.objProxy,t];
    }
};