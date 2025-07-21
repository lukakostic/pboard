
type Id = string;
type TMap<Tk,Tv> = {[index:string]:Tv};

type objectA = {[index:string]:any};

let TODO = (txt:string="")=>{throw new Error("[TODO]"+txt);};
let WARN = (txt:string="")=>{};
type Ttodo = any; //when youre too lazy to specify a full type

/** json string <--> T  strong type class */ 
type JSONstr<T> = {
    parse : T;
    json : string;
}

(Array.prototype as any).remove = function(item:any){
    while(true){
        let idx = this.indexOf(item);
        if(idx!=-1)
            this.splice(idx,1);
        else break;
    }
    return this;
}

function cast<T> (obj: any) : T{
    return obj as T;
}
function castIsnt(obj: any, ...isnt: any){
    for(let i=0,il=isnt.length;i<il;i++)
        if(obj === isnt[i]) throw new Error("Cast failed.");
    return obj;
}

function getElement(node:Node):HTMLElement{
    while(node.nodeType != Node.ELEMENT_NODE){
        node = node.parentNode!;
    }
    return node as HTMLElement;
}

/** num to base 92 string (35[#]-126[~] ascii) */
function numToShortStr(n :number) :string{
    let s = "";
    if(n<0){s="-";n=-n;}
    while(true){
        s+=String.fromCharCode((n%92)+35);
        if(n<92) break;
        n/=92;
    }
    return s;
}

function isEmptyObject(o:any){
    for(let i in o) return false;
    return true;
}


function filterNullMap( mapObj :any ) :any{
    const m = {} as any;
    for(let k in mapObj){
        const v = mapObj[k];
        if(v!==null)
            m[k] = mapObj[k];
    }
    return m;
}

function assert_non_null(thing:any,msg="", actuallyCheck1_OrReturn0=true){
    if(actuallyCheck1_OrReturn0 && !thing){
        msg = `Assert fail: Unexpected null${msg?(" for "+msg):''}`;
        console.error(msg); 
        throw Error(msg);
    }
    return thing;
}