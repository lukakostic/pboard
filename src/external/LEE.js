
//JSON proxy: function/arrow stringify and parse 
var JSONfn = {
    stringify(obj) {
        return JSON.stringify(obj,function(key, value){
            return (typeof value === 'function' ) ? value.toString() : value;
        });
    },

  parse(str) {
    return JSON.parse(str,function(key, value){
        if(typeof value != 'string') return value;
        return (value.startsWith('function') ? eval('('+value+')') : value);
    });
  }
};
/* VERSION 1.6 */
var isNode = (typeof process !== 'undefined' && process["argv"] != null);
var ___Global___ = isNode?global:window; //nodejs or browser
___Global___.LEEJS = {}; //holds our leejs tags (function objects). so we dont pollute global



//#region###### Write function (how and where to push the generated html) ########//
//################################################################################//
const ___WRITE_FN___ = {
    static:"static",
    append:"append",
    write:"write",
    "in":"in",
    out:"out",

    create:"create"
}; 
___Global___.___WriteFn___ = isNode?   // default write mode za node ili browser 
    ___WRITE_FN___.static:
    ___WRITE_FN___.create;//append/in/out/write/document.write;


function ___Write___(htmlStr,...args){
    /*
    args moze biti:
    write / document.write
    hostEl, in/out/append
    hostEl    samo a writeFn je default globalna..
    */
    let fn = args[1]?args[1]:___Global___.___WriteFn___;
    
    if(fn==___WRITE_FN___.write || (typeof document !== 'undefined' && fn==document.write))
        return document.write(htmlStr);
    

    if(fn==___WRITE_FN___.static)
        return (___Global___.__generated__+=htmlStr);


    //if(__IS_STATIC_GEN__){ //If we are being generated from Nodejs
    //    ___Global___.__generated__ = new XMLSerializer().serializeToString(document);
    //}

    //// Following write modes require a host element. ////
    let hostEl = args[0];
    if(typeof hostEl === 'string') hostEl = document.querySelector(hostEl);
    if(!hostEl) throw new Error("Could not find specified element to append elements to.");
    

    if(fn==___WRITE_FN___.out ){
        hostEl.outerHTML = htmlStr;
    }else if(fn==___WRITE_FN___.in){
        hostEl.innerHTML = htmlStr;
    }else if(fn==___WRITE_FN___.append){
        let template = document.createElement('template');
        template.innerHTML = htmlStr;
        [...template.content.childNodes].forEach(e=>hostEl.appendChild(e));
    }
}
//################################################################################//
//#endregion######################################################################//


/*Arguments: 
"Text",h,"Text",h ...
$id,atr, ...
atr, ...
$id, ...
*/
function __el__Fn__(tag,...args){
    /// additional user-made attributes which get assigned to leejs element
    var extraArgs = [];   // obj[] which all get assigned to leejs element
    var extraAssign = {}; // gets directly assigned to leejs element

    if(__isTemplateTag__(...args)){ //If passed id/class string thru templates
        extraArgs.push($I(...args));
        args=[];
        extraAssign = {__TemplateAwatingArgs__:true}; //tako da kad se pozove opet sa () ono zna da parsuje args a ne izvrsi.
    }
    //// else default behaviour: /////////////////////
    

    var obj ={
        __IS_LEEJS_ELEMENT__ : true,   // property used to identify leejs elements (if present then its leejs element)

        tag : tag,   // "div", "img", "p", "h1", ..
        closingTag : true, //false => self-closing element eg img or input
        spec: {}, // non html attributes (doctype true/false if html)
        attr : {}, // html attributes  (style,class,id, type,src,href...)
        children : [],
        //eventHandlers: [],  // after this obj gets created, what events to we add to it?  {name:string,fn:function}[]

        __parseAtr__(...args2){
            args2.forEach(e=>{ if(e===undefined|e===null|typeof e == "boolean") return;
                //console.log("E:",e);
                //console.log(e.length?e.length:null);
                //console.log(e);
                if(e.__IS_LEEJS_ELEMENT__ || typeof(e)==='string' || 
                /*is of class Node*/ ( e.cloneNode!==undefined&& e.nodeName!==undefined)
                ){
                    this.children.push(e);
                }else if(Array.isArray(e)){
                    this.__parseAtr__(...e);
                }else if(e.__isSpec__){
                    Object.assign(this.spec,e);
                }else if(typeof(e)==='object'){
                    Object.assign(this.attr,e);
                }//else throw new Error("?");
            });
            //if(this.spec.__isSpec__) delete this.spec.__isSpec__;
        },

        //#region####### build head, attributes, children, tail ####//
        __buildAttr__(){  // `k1="v1" k2="v2" ...`
            if(Object.keys(this.attr).length>0){
                return " "+[...Object.entries(this.attr)].mWap(e=>
                    {return `${e[0]}`+((e[1]===null)?'':`="${e[1]}"`)}
                    ).join(" ");
            }
            return '';
        },
        __buildHead__(){ //tag and attributes:   `<tag k1="v1" k2="v2" ..>`
            if(this.tag==null) return '';
            return `<${this.tag}${
                this.__buildAttr__()
            }${this.closingTag?'':'/'}>`;
        },
        __buildChildren__(){
            if(this.closingTag)
                return this.children.map(e=>{
                        if(e.__build__) return e.__build__();
                        else return e;
                    }).join("");
            return '';
        },
        __buildTail__(){  // `</tag>`
            if(this.tag==null || this.closingTag==false) return '';
            return `</${this.tag}>`;
        },
        __build__(){
            return this.__buildHead__()+this.__buildChildren__()+this.__buildTail__();
        },
        //#########################################################//

        //#region##### runtime append functions ###########//
        //create (build) element and return it
        create(){
            let el = document.createElement(this.tag);
            let parsedStuff = {}; //to keep data from parsed attributes
            let handleSpecialAttr = (atr)=>{
                let val = this.attr[atr];
                if(atr=="$ref"){
                    //not mutation observer, timed walking instead..
                }else if(atr=="$refMod"){
                    //mutation observer

                }else if(atr=="$refOnly"){
                    //timed observing / mutation observer of only this array of fields..

                }else if(atr=="$inner"){
                    el.innerHTML = val;
                }else if(atr=="$bindEvents"){
                    parsedStuff.bindEvents = val;
                }else if(atr=="$onCreate"){
                    parsedStuff.onCreate = val;
                }else if(atr=="$bind"){
                    parsedStuff.bind = val;
                }else{
                    // handle as event handler.
                    let eventName = atr.substring(1);
                    // this.eventHandlers.push({name:eventName,fn:val});
                    if(parsedStuff.bindEvents) val = val.bind(parsedStuff.bindEvents);
                    el.addEventListener(eventName,val);
                }
            };    
            for(let k in this.attr){
                if(k.startsWith("$")) handleSpecialAttr(k);
                else el.setAttribute(k,this.attr[k]);
            }

            this.children.forEach(c=>{
                if(c.__IS_LEEJS_ELEMENT__)
                    el.appendChild(c.create());
                else if(typeof c == 'string'){
                    el.appendChild(document.createTextNode(c));
                }else if(c.cloneNode && c.nodeName){
                    el.appendChild(c);
                }else throw new Error("Unsuported");
            });

            if(parsedStuff.onCreate) parsedStuff.onCreate(el);
            return el;
        },
        c(){return this.create();},
        // create and append to hostEl
        appendTo(hostEl){
            if(typeof hostEl === 'string') hostEl = document.querySelector(hostEl);
            if(!hostEl) throw new Error("Could not find specified element to append elements to.");
            
            let el = this.create();
            hostEl.appendChild(el);
            return el;
        },
        a(h){return this.appendTo(h);},
        //#endregion#######################################//

        //#region##### angular like functions: ############//
        repeat(times,cond=undefined){ //repeat array:  [1,2]*3 = [1,2,1,2,1,2]
            return [].concat(...[...".".repeat(times)].map(e=>{
                if(cond!==undefined) return cond(e)?this:undefined;
                return this; 
            }));
        },
        if(cond){
            if(typeof cond == 'function') return cond()?this:undefined;
            return cond?this:null;
        }
        //#endregion#######################################//
    };

    obj.__parseAtr__(...args);
    obj.__parseAtr__(extraArgs);
    Object.assign(obj,extraAssign);

    return Object.assign(function(){
        let THIS = arguments.callee; //instead of bind+this

        if(THIS.__TemplateAwatingArgs__){ //We are actually parsing args, not calling!
            THIS.__parseAtr__(...arguments);
            delete THIS.__TemplateAwatingArgs__;
            return THIS;
        }
        
        if(___Global___.___WriteFn___ == ___WRITE_FN___.create){
            return THIS.create();
        }
        else{

            let c = THIS.__build__();
            //console.log(c);
            ___Write___(c,...arguments);

            return c;
        }
    },obj); //make callable (call some function) and return
}



//#region###### apply html tags as global function names #########################//
//################################################################################//
// ones with / at end are self-closing (no ending tag)
var tagsStr = 'doctype,html,head,title,base/,link/,meta/,style,script,noscript,body,article,nav,aside,section,header,footer,h1,h2,h3,h4,h5,h6,main,address,p,hr/,pre,blockquote,ol,ul,li,dl,dt,dd,figure,figcaption,div,table,caption,thead,tbody,tfoot,tr,th,td,col/,colgroup,form,fieldset,legend,label,input/,button,select,datalist,optgroup,option,textarea,keygen/,output,progress,meter,details,summary,command,menu,del,ins,img/,iframe,embed/,object,param/,video,audio,source/,canvas,track/,map,area/,a,em,strong,i,b,u,s,small,abbr,q,cite,dfn,sub ,sup,time,code,kbd,samp,var,mark,bdi,bdo,ruby,rt,rp,span,br/,wbr/';
var renames = {

};
tagsStr.split(/\n|,/).filter(e=>e).map(e=> (renames[e]??e)).forEach(e=>{
    if(!e.endsWith('/')) ___Global___.LEEJS[e] = __el__Fn__.bind(this,e); //non-self closing
    else{ //self closing
        e = e.replace('/','');
        ___Global___.LEEJS[e] = function(tag,...args){
            let o = __el__Fn__(tag,...args);
            o.closingTag = false;
            return o;
        }.bind(this,e);
    }
});
//################################################################################//
//#endregion######################################################################//


//apply all leejs tags to global object
function _leejsApplyToGlobal_(toObject = undefined){
    if(toObject===undefined) toObject = ___Global___;
    for(let k in ___Global___.LEEJS){
        toObject[k] = ___Global___.LEEJS[k];
    }
}


function prettyFormatHTML(str){
    return str; //notImplemented
}

// #region  Shared object ////////////////////////////////////////
/**** Shared object. 
 * Holds random data so you dont pollute global. 
 * But also holds functions, events, binds, and other data written into html during static builds.
    (eg you define some js functions or objects and want them embedded into html)  
 
$S()       -> emit shared object as html element
$S(obj)     -> assign obj to shared data
$S.xx       -> get
$S.xx = y   -> set

$S(str)      -> get hidden property of underlying shared function object
    $S("data") -> read the shared data
$S(str,val)  -> set hidden property of underlying shared function object
    $S("data",obj) -> set the shared data to obj (set not assign)


****************/
___Global___.LEEJS.$S = new Proxy( function $S(){} , {
    data: {}, //underlying private data holder

    apply(target, thisArg, args){ //function call handler
        // console.log("APPLY","target (proxyBaseFn):",target,"this (undefined):",thisArg,"args:",args);
        
        if(args.length == 0){ //emit shared obj as html
            throw new Error("//TODO//"); /////////////////////////////TODO
        }
        //if  $S( obj ) passed then assign obj to data.
        else if(args.length == 1 && typeof args[0] == 'object' )
            return Object.assign(this.data, args[0]);
        // if $S( string ) passed then get private property of this object
        else if(args.length == 1 && typeof args[0] == 'string')
            return this[args[0]];
        // if $S( string,any ) then set private properties of this object
        else if(args.length == 2 && typeof args[0] == 'string' )
            return this[args[0]] = args[1];

        throw new Error("Unknown args.");
    },
    get(target, name) {
        //console.log("GETTER",name);
        return this.data[name];
    },
    set(target, name,value) {
        //console.log("SETTER",name,value);
        return ( this.data[name]=value );
    }
});
// #endregion  Shared object ////////////////////////////////////////


//empty element (no head or tail just children)
___Global___.LEEJS["$E"] =function $E(...args){
    return __el__Fn__(null,...args);
}

//just execute a function and ignore return
// OOOOOOOOOORRRRR you can just use the "void" operator to do same:  [x,void(x=3),x] -> [x,undef,3]
//usage is so you can do $C(()=>{...}) to execute code anywhere eg inside array
___Global___.LEEJS["$C"] =function $C(fn){
    fn();
}


///////////////html doctype
//delete ___Global___["html"];

___Global___.LEEJS["html"] = function html(tag,...args){
    var o = __el__Fn__(tag,...args);
    o.spec.doctype = true;
    o.__buildHead__ = function(){
        return (this.spec.doctype?'<!DOCTYPE html>':'')+`<html${this.__buildAttr__()}>`;
    };
    return o;
}.bind(this,"html");


___Global___.LEEJS["shared"] = function shared(tag,...args){
    var o = __el__Fn__(tag,...args);
    o.___defBuild___ = o.__build__;
    delete o.__build__;
    o.__build__ = function(){
        var s = "";
        [...Object.entries(___Global___.LEEJS.$S("data"))].forEach(([k,v])=>{
            var value = (typeof v === 'function' ) ? v.toString() : JSON.stringify(v);
            s+= `${JSON.stringify(k)}:${value},`;
        });
        return `<script>$S({${s}});</script>`;
    };
    return o;
}.bind(this,"shared");


___Global___.LEEJS["script"] = function script(tag,...args){
    var o = __el__Fn__(tag,...args);
    o.___defBuild___ = o.__build__;
    delete o.__build__;
    o.__build__ = function(){
        //console.log(this.spec);
        if(this.spec.arrays==null || this.spec.arrays.length==0) return o.___defBuild___();
        var s = '';
        [...this.spec.arrays[0]].forEach(e=>{ if(!e|e===true) return;
            //console.log(e);
            if(typeof(e)==='string'){
                s += `<script src="${e}"></script>`;
            }
        //    else if(e.constructor === Array){
        //        this.__parseAtr__(...e);
            else if(typeof(e)==='object'){
                var entr = Object.entries(e);
                if(entr.length == 0) return;
                var a = '';
                entr.forEach(g=>{
                    a += ` ${g[0]}${(g[1]===null)?"":(`="${g[1]}"`)}`;
                });
                s += `<script${a}"></script>`;
            }
        });
        return s;
    };
    return o;
}.bind(this,"script");


// <link [rel="stylesheet"] href="xxx" >
___Global___.LEEJS["link"] = function link(tag,...args){
    var o = __el__Fn__(tag,...args);
    o.___defBuild___ = o.__build__;
    delete o.__build__;
    o.__build__ = function(){
        //console.log(this.spec);
        if(this.spec.arrays==null || this.spec.arrays.length==0) return o.___defBuild___();
        var s = '';
        [...this.spec.arrays[0]].forEach(e=>{ if(!e|e===true) return;
            //console.log(e);
            if(typeof(e)==='string'){
                s += `<link rel="stylesheet" href="${e}"></link>`;
            }
        //    else if(e.constructor === Array){
        //        this.__parseAtr__(...e);
            else if(typeof(e)==='object'){
                var entr = Object.entries(e);
                if(entr.length == 0) return;
                var a = '';
                entr.forEach(g=>{
                    a += ` ${g[0]}${(g[1]===null)?"":(`="${g[1]}"`)}`;
                });
                s += `<link${a}></link>`;
            }
        });
        return s;
    };
    return o;
}.bind(this,"link");
//////////////////////////////////

///////////////////////////////////////// $I multioperator
function __emptyTag__(strings,...values){
    return String.raw({ raw: strings }, ...values); //do nothing tag
}
function ___$I(){
    var a = [];
    var o = {__isSpec__:true};
    a.push(o);
    [...arguments].forEach(e=>{ if(!e|e===true) return;
        //console.log(e);
        if(typeof(e)==='string'){
            a.push(___makeIdClassObj___(e));
        }
        else if(e.length !== undefined || e instanceof Array){
            if(!o.arrays) o.arrays = [];
            o.arrays.push(e);
        }
        else if(typeof(e)==='object'){
            Object.assign(o,e);
        }//else throw new Error("?");
    });
    return a;
}
function ___makeIdClassObj___(string){
    var o = {};
    var a = string.split(/#|\./).filter(e => e); //split
    if(a==[]) return o;
    var firstId = string[0]=='#';
    if(firstId) o.id = a[0]; //If first is id
    o.class = a.slice(firstId?1:0).join(" ");
    if(o.class == " " || o.class == "") delete o.class;
    return o;
}
function __isTemplateTag__(strings,...values){
    return (strings && strings.raw!==undefined && strings.forEach !== undefined && values.forEach !== undefined) &&
        ((strings.length>0)?(
            typeof(strings[0])==='string'
        ):true) &&
        ((values.length>0)?(
            typeof(values[0])==='string'
        ):true) ;
}
___Global___.LEEJS["$I"]=function $I(strings,...values) { //id and class $I`#id.c1.c2`
    //console.log(strings,values);
    var string = '';
    //see if template or not..
    if(!__isTemplateTag__(strings,...values)) return ___$I(...arguments);
    string = __emptyTag__(strings,...values);
    string = [...string.split(' ')].join(''); //remove spaces
    return ___makeIdClassObj___(string);
}


//return body of function (without {}) as string
___Global___.LEEJS["$F"]=function $F(fn){
    var s = fn.toString();
    if(s.startsWith("function")){
        return s.slice(s.indexOf('{')+1,s.length-1); //////////TODO nzm dal sam pogodio kraj?
        //return s.slice(s.indexOf('{')+1,s.lastIndexOf('}')).trim();
    }else{
        s = s.slice(s.indexOf("=>")+2).trim();
        if(s.startsWith("{"))
            return s.slice(1,s.length-1); //////////TODO nzm dal sam pogodio kraj?
        else
            return "return ("+s+");";
    }
    
}


___Global___.LEEJS["$dom"]=function $dom(domEl){
    //convert dom element into my element.
    //so you can use dom elements as children.
    //kinda like jquery ?
    //so i can do $dom("#id") or $dom(someElement)
    throw new Error("NOT IMPLEMENTED //TODO");
}

//$js(  linksToJsFiles[] )
___Global___.LEEJS["$js"]=function $js(...strings){
    return script($I([...strings]))
}

//$css( linksToCssFiles[] )
___Global___.LEEJS["$css"]=function $css(...strings){
    return link($I([...strings]))
}


function __cssBuilder(strings,...values){
    return {
        arr : [],    //array of string,obj,string,obj,obj  where each obj is a replacement point.
        build: function(){

        },
        change : function(name,val){

        }
    };
}
___Global___.LEEJS["$cssVar"]=function $cssVar(name,value){
    if($S.__cssVars__ === undefined) $S.__cssVars__ = {};
    return {name:name, value:undefined};
    //var obj = ;
    return link($I([...strings]))
}
___Global___.LEEJS["$cssInline"]=function $cssInline(strings,...values){
    var arr = [];
    values = [...values].map(e=>(typeof e == 'string')?$cssVar(e):e);
    for(var i = 0;;){
        arr.push(strings[i]);
        arr.push(values[i]);
    }
    return undefined;
    //return link($I([...strings]));
}


///////////////////////// If node, run commands!
if(isNode){
    var path = require('path');
    var vm = require("vm");
    var fs = require("fs");

    var outDir = null;
    
    var get = (i)=>{
        if(process.argv.length <= i) throw new Error("Argument index out of bounds.");
        return process.argv[i];
    }
    var getPath = (p)=>{var a = path.resolve(p); return Object.assign(path.parse(a),{abs:a});}
    var toProcess = [];
    var doFormat = false;
    for(var i = 2;i<process.argv.length; i++){
        if(get(i).toLowerCase()=="-outdir"){
            outDir = getPath(get(++i));
            console.log(outDir);
            continue;
        }
        if(get(i).toLowerCase()=="-out"){
            toProcess[toProcess.length-1].out = getPath(get(++i));
            console.log(toProcess[toProcess.length-1].out);
            continue;
        }
        if(get(i).toLowerCase()=="-pretty"){
            doFormat = true;
            continue;
        }
        if(get(i).toLowerCase()=="-nopretty"){
            doFormat = false;
            continue;
        }
        var name = getPath(get(i));
        var newName = name.base.slice(0,name.base.length-name.ext.length)+".html";
        toProcess.push(
            {
                name:name,
                out:outDir?getPath(outDir.abs+"/"+newName):getPath(name.dir+"/"+newName),
                pretty:doFormat
            });
        console.log(toProcess[toProcess.length-1]);
    }
    toProcess.forEach((e)=>{
        console.log(e.name.abs);
        console.log(e.out.abs);
        var data = fs.readFileSync(e.name.abs);
        const script = new vm.Script(data);
        ___Global___.__generated__ = "";
        /////___Global___.__assignShared(); /////? //TODO - i changed $S and idk if this is supposed to be here now..
        vm.createContext(___Global___);
        //console.log(___Global___);
        script.runInContext(___Global___);
        var gen = ___Global___.__generated__;
        if(e.pretty) gen = prettyFormatHTML(gen);
        fs.writeFileSync(e.out.abs,gen);
    });
}
//usage:  eval(_leejsVarAll_)  -> pollutes current fn with all tags 
___Global___._leejsVarAll_ = `var {${Object.keys(LEEJS).join(',')}}=LEEJS;`;

//execute a function but give it lee html tags in its context (as vars).
// usage:  eval(_leejsCtx_( ..fn with no args.. ))
// alternative would be to use deprecated "with" operator:  with(LEEJS){ .. }
function _leejsCtx_ (fn){
    /* resulting function (as string):  
    (()=>{ 
        let {..}=LEEJS;    //gets filled with all key names of LEEJS
        return ( <fn> )(); 
    })();

    // usage:
    eval(_leejsCtx_(()=>{
        .. some code here ..
    }));

    */
    //fn.toString() all spaces are retained so trim.
    return `(()=>{${___Global___._leejsVarAll_};return(${fn})();})();`;
};