//######################
// File: 0Common.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/0Common.ts
//######################
let TODO = (txt = "")=>{
    throw new Error("[TODO]" + txt);
};
let WARN = (txt = "")=>{};
Array.prototype.remove = function(item) {
    while(true){
        let idx = this.indexOf(item);
        if (idx != -1) this.splice(idx, 1);
        else break;
    }
    return this;
};
function cast(obj) {
    return obj;
}
function castIsnt(obj, ...isnt) {
    for(let i = 0, il = isnt.length; i < il; i++)if (obj === isnt[i]) throw new Error("Cast failed.");
    return obj;
}
function getElement(node) {
    while(node.nodeType != Node.ELEMENT_NODE){
        node = node.parentNode;
    }
    return node;
}
/** num to base 92 string (35[#]-126[~] ascii) */ function numToShortStr(n) {
    let s = "";
    if (n < 0) {
        s = "-";
        n = -n;
    }
    while(true){
        s += String.fromCharCode(n % 92 + 35);
        if (n < 92) break;
        n /= 92;
    }
    return s;
}
function isEmptyObject(o) {
    for(let i in o)return false;
    return true;
}
function filterNullMap(mapObj) {
    const m = {};
    for(let k in mapObj){
        const v = mapObj[k];
        if (v !== null) m[k] = mapObj[k];
    }
    return m;
}
function assert_non_null(thing, msg = "", actuallyCheck1_OrReturn0 = true) {
    if (actuallyCheck1_OrReturn0 && !thing) {
        msg = `Assert fail: Unexpected null${msg ? " for " + msg : ''}`;
        console.error(msg);
        throw Error(msg);
    }
    return thing;
}
//######################
// File: 1Serializer.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/1Serializer.ts
//######################
// class ClassInfo{
//     _class :any;
//     defaults : any;
// };
// let __IdToClassInfo : {[classId:string]:ClassInfo};
let __IdToClass = {};
function RegClass(_class) {
    console.log("REGISTERING CLASS", _class);
    let id = _class.name; // + HashClass(class)
    console.log("Registering ID:", id);
    if (__IdToClass[id] != null) throw new Error("Clashing class names. " + id);
    __IdToClass[id] = _class; //register class name to class object
    return id;
}
RegClass(Error);
class Unknown_SerializeClass {
}
// RegClass(Unknown_SerializeClass);
function SerializeClass(originalObj, _class) {
    let cls = _class ?? Object.getPrototypeOf(originalObj).constructor;
    if (originalObj instanceof Error) cls = Error;
    if (cls == Object || originalObj["$$C"]) return '';
    let id = cls.name;
    if (__IdToClass[id] === undefined) throw new Error("Class not registered for serialization: " + id);
    return `"$$C":"${id}"`;
}
function ApplyClass(obj, _class) {
    if (_class.prototype) Object.setPrototypeOf(obj, _class.prototype);
    else Object.setPrototypeOf(obj, _class);
    return obj;
}
function EscapeStr(str) {
    let s = "";
    for(let i = 0, _il = str.length; i < _il; i++){
        if (str[i] == '"') s += '\\"';
        else if (str[i] == '\'') s += "'";
        else if (str[i] == '\\') s += '\\\\';
        else if (str[i] == '\n') s += '\\n';
        else if (str[i] == '\r') s += '\\r';
        else if (str[i] == '\t') s += '\\t';
        else if (str[i] == '\v') s += '\\v';
        else if (str[i] == '\0') s += '\\0';
        else if (str[i] == '\a') s += '\\a';
        else if (str[i] == '\b') s += '\\b';
        else if (str[i] == '\f') s += '\\f';
        else if (str[i] == '\e') s += '\\e';
        else s += str[i];
    }
    return s;
}
function JSON_Serialize(obj) {
    // console.log("serializing:",obj);
    if (obj === null) return "null";
    else if (obj === undefined) return null; //skip
    else if (Array.isArray(obj)) {
        let defaults = Object.getPrototypeOf(obj).constructor._serializable_default ?? {};
        let s = "[";
        for(let i = 0, _il = obj.length; i < _il; i++){
            if (i != 0) s += ",";
            s += JSON_Serialize(obj[i]);
        }
        s += "]";
        return s;
    } else if (typeof obj == 'object') {
        // console.log("SERIALIZING OBJECT:",obj);
        if (obj.__serialize__) obj = obj.__serialize__();
        // console.log("SERIALIZING OBJECT2:",obj);
        let _class = Object.getPrototypeOf(obj).constructor;
        // console.log("CLASS:",_class,_class.name);
        let defaults = _class._serializable_default;
        // console.log("DEFAULTS:",defaults);
        // if(obj.serialize_fn) return obj.serialize_fn();
        let classId = SerializeClass(obj, _class);
        let s = `{${classId}`;
        let k = Object.getOwnPropertyNames(obj);
        let insertComma = classId != ''; //was class atr inserted?
        for(let i = 0, l = k.length; i < l; i++){
            if (defaults) {
                const d = defaults[k[i]];
                if (d !== undefined) {
                    const o = obj[k[i]];
                    if (d === o) continue;
                    if (Array.isArray(d)) {
                        if (Array.isArray(o) && d.length == 0 && o.length == 0) continue;
                    } else if (isEmptyObject(d)) {
                        if (isEmptyObject(o)) continue;
                    } else if (JSON.stringify(d) == JSON.stringify(o)) continue;
                }
            }
            ; //skip this attribute
            let ser = JSON_Serialize(obj[k[i]]);
            if (ser === null) continue; //skip.
            if (insertComma) s += ',';
            //for performance reasons, dont escape strings.
            //yes it can corrupt your json.
            //up to plugin devs to watch out for it.
            s += `"${k[i]}":${ser}`;
            insertComma = true;
        }
        s += '}';
        return s;
    }
    return JSON.stringify(obj);
}
function __Deserialize(o, allowUnknownClasses = false) {
    // console.log("deserializing:",o);
    if (o === null) return null;
    if (Array.isArray(o)) return o.map((e)=>__Deserialize(e));
    if (typeof o != 'object') {
        // console.log("Primitive:",o);
        return o; //assuming its primitive.
    }
    // DeserializeClass(o);
    let classId = o.$$C;
    let _class = null;
    let defaults = {};
    if (classId !== undefined) {
        _class = __IdToClass[classId];
        if (_class == null) {
            if (allowUnknownClasses) _class = Unknown_SerializeClass.prototype;
            else throw new Error("Class not recognised:", classId);
        } else {
            delete o.$$C; // we know the class, can remove.
        }
        ApplyClass(o, _class); //applies in-place to object
        defaults = _class._serializable_default ?? {};
    }
    // end Deserialize class
    // console.log("Deserializing object:",o,"defaults:",defaults,"class:",_class);
    let keys = Object.getOwnPropertyNames(o);
    for(let k = 0, kl = keys.length; k < kl; k++){
        o[keys[k]] = __Deserialize(o[keys[k]]);
    }
    //apply defaults
    let dk = Object.keys(defaults);
    for(let i = 0, il = dk.length; i < il; i++){
        let k = dk[i];
        if (o[k] === undefined) {
            let d = defaults[k];
            // we must make copies of the defaults, not use the same object.
            if (Array.isArray(d)) o[k] = [];
            else if (d === null) o[k] = null;
            else if (typeof d == 'object') o[k] = {};
            else o[k] = d;
        }
    }
    if (_class && _class.__deserialize__) o = _class.__deserialize__(o);
    // console.log("returning deserialized",o);
    // if(o.deserialize_fn) o.deserialize_fn();
    return o;
}
function JSON_Deserialize(str, allowUnknownClasses = false) {
    console.log(str);
    return __Deserialize(JSON.parse(str), allowUnknownClasses);
}
/*******************
 LIMITATIONS TO SERIALIZATION

 NO CIRCULAR REFERENCES.
 No arrays with special properties or classes.
*********************/ //######################
// File: 2Messages.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/2Messages.ts
//######################
/************* 
Messages are mostly client -> server.
Msg = code of message
TCMsg = type of client request
TSMsg = type of server response
CMsg = send client -> server
**************/ const _MakeMsg = (msg_code)=>async (d)=>await Server.sendMsg({
            n: msg_code,
            d
        });
const Msg_saveAll = 'saveAll';
const CMsg_saveAll = _MakeMsg(Msg_saveAll);
const Msg_eval = 'eval';
const CMsg_eval = _MakeMsg(Msg_eval);
const Msg_loadInitial = 'loadInitial';
const CMsg_loadInitial = _MakeMsg(Msg_loadInitial);
const Msg_loadBlock = 'loadBlock';
const CMsg_loadBlock = _MakeMsg(Msg_loadBlock);
const Msg_loadTag = 'loadTag';
const CMsg_loadTag = _MakeMsg(Msg_loadTag);
const Msg_backup = 'backup';
const CMsg_backup = _MakeMsg(Msg_backup);
//######################
// File: client/0/BlkFn.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/0/BlkFn.ts
//######################
//let $CL = typeof($IS_CLIENT$)!==undefined; // true for client, false on server
/*
let $$$CL_ret ->  call fn and return its return (do nothing)
let $$$CL_clone -> call fn, copy function body (rename BLOCK to _BLOCK etc.)
let $$$CL_diff -> call fn, apply returned diff
let $$$CL_local -> copy the function body, insert rpc call into $CL_rpc if exists.
$$$CL_rpc -> insert the "awake rpc(..)" call here

## why like this? 
Well i dont want the server to return a Diff for everything ($CL_diff)
- if i hold only 1 block why should i care about 99 other blocks in diff, and i dont want the server to have to hold "which blocks does each client hold"
I can also run the code locally too ($CL_clone)
- but thats error prone if i change code on server but forget on client

So if i have this build-time way of saying "clone this fn, diff this fn" then i get all benefits.
*/ const BlkFn = {
    // DeleteBlocks_unsafe(ids:Id[]):boolean{
    //     /*
    //     delete blocks without checking refCount (if referenced from other blocks)
    //     */
    //     for(let i=0,l=ids.length;i<l;i++){
    //         if(PAGES[ids[i]]) delete PAGES[ids[i]];
    //         delete BLOCKS[ids[i]];
    //     }
    //     return true;
    // },
    async RemoveTagFromBlock (blockId, tagId) {
        BLOCKS_assertId(blockId);
        TAGS_assertId(tagId);
        const t = await TAGS(tagId, 0);
        const ti = t.blocks.indexOf(blockId);
        if (ti != -1) {
            t.blocks.splice(ti, 1); //remove block from tag
            t.DIRTY();
        }
        const b = await BLOCKS(blockId, 0);
        const bi = b.tags.indexOf(tagId);
        if (bi != -1) {
            b.tags.splice(bi, 1); //remove tag from block
            b.DIRTY();
        }
    },
    async RemoveAllTagsFromBlock (blockId) {
        BLOCKS_assertId(blockId);
        const b = await BLOCKS(blockId, 0); ////if($CL&&!b)return;
        for(let i = 0; i < b.tags.length; i++){
            const t = await TAGS(b.tags[i], 0); ////if($CL&&!t)continue;
            t.blocks.splice(t.blocks.indexOf(blockId), 1); //remove block from tag
            t.DIRTY();
        }
        b.tags = []; //    b.tags.splice(b.tags.indexOf(tagId),1); //remove tag from block
        b.DIRTY();
    },
    async HasTagBlock (tagId, blockId/*,  $CL=false*/ ) {
        BLOCKS_assertId(blockId);
        TAGS_assertId(tagId);
        //if(!$CL) return TAGS[tagId].blocks.indexOf(blockId)!=-1;
        //if($CL){
        if (_TAGS[tagId]) return _TAGS[tagId].blocks.indexOf(blockId) != -1;
        if (_BLOCKS[blockId]) return _BLOCKS[blockId].tags.indexOf(tagId) != -1;
        return (await TAGS(tagId)).blocks.indexOf(blockId) != -1;
    //return $$$CL_rpc;
    //}
    },
    async TagBlock (tagId, blockId) /*:boolean*/ {
        BLOCKS_assertId(blockId);
        TAGS_assertId(tagId);
        if (await this.HasTagBlock(tagId, blockId /*, $CL*/ )) return; // false;
        (await TAGS(tagId)).blocks.push(blockId);
        _TAGS[tagId].DIRTY();
        (await BLOCKS(blockId)).tags.push(tagId);
        _BLOCKS[blockId].DIRTY();
    // return true;
    },
    async DeleteBlockOnce (id) {
        BLOCKS_assertId(id);
        const b = await BLOCKS(id, 0);
        // console.error("delete once",id,b.refCount);
        b.refCount--;
        if (b.refCount > 0) {
            b.DIRTY();
            return false;
        } // false; //not getting fully deleted
        //deleting block fully
        if (b.refCount == 0) await BlkFn.DeleteBlockEverywhere(id);
        return true; // true; //got fully deleted
    },
    async DeleteBlockEverywhere (id) {
        BLOCKS_assertId(id);
        const b = await BLOCKS(id, 0);
        b.refCount = 0;
        for(let i = 0; i < b.children.length; i++){
            // console.error("delete everywhere ",id,"child:",b.children[i],"i"+i,b.children.length);
            if (await this.DeleteBlockOnce(b.children[i])) i--;
        }
        await this.RemoveAllTagsFromBlock(id);
        if (PAGES[id]) {
            delete PAGES[id];
            DIRTY.mark("PAGES");
        }
        delete _BLOCKS[id];
        Block.DIRTY_deletedS(id);
        // Search all blocks and all tags. Remove self from children.
        let allBlocks = Object.keys(_BLOCKS);
        for(let i = 0; i < allBlocks.length; i++){
            if (_BLOCKS[allBlocks[i]] == undefined) continue;
            const b2 = await BLOCKS(allBlocks[i], 0);
            if (b2.children.includes(id)) {
                b2.children = b2.children.filter((x)=>x != id);
                b2.DIRTY();
            }
            WARN("We arent modifying array in-place (for performance), caller may hold old reference");
        /*
            let oc = b2.children;
            let nc = oc.filter((x:any)=>(x!=id));
            if(nc.length != oc.length){
                oc.splice(0,oc.length,...nc);    // in-place set new array values
            }*/ }
    /*
        let allTags = Object.keys(_TAGS);
        for(let i = 0; i<allTags.length;i++){
            const t2 = await TAGS(allTags[i]);
            t2.blocks = t2.blocks.filter((x:any)=>(x!=id));
            t2.DIRTY();
            WARN("We arent modifying array in-place (for performance), caller may hold old reference");
        }*/ },
    async InsertBlockChild (parent, child, index) /*:Id[]*/ {
        BLOCKS_assertId(parent);
        BLOCKS_assertId(child);
        const p = await BLOCKS(parent); ////if($CL&&!p)return;
        const l = p.children;
        if (index >= l.length || index < 0) {
            l.push(child);
        } else {
            l.splice(index, 0, child);
        }
        p.DIRTY();
    // return l;
    },
    async SearchPages (title, mode = 'exact') {
        let pages = await Promise.all(Object.keys(PAGES).map(async (k)=>await BLOCKS(k)));
        // console.info("ALL BLOCKS LOADED FOR SEARCH: ",JSON.stringify(_BLOCKS));
        if (mode == 'exact') {
            return pages.filter((p)=>p.pageTitle == title).map((p)=>p.id);
        } else if (mode == 'startsWith') {
            return pages.filter((p)=>p.pageTitle?.startsWith(title)).map((p)=>p.id);
        } else if (mode == 'includes') {
            return pages.filter((p)=>p.pageTitle?.includes(title)).map((p)=>p.id);
        }
        return [];
    },
    async SearchTags (title, mode = 'exact') {
        let pages = await Promise.all(Object.keys(_TAGS).map(async (k)=>await TAGS(k, 0))); //Object.values(TAGS);//.map(k=>BLOCKS[k]);
        if (mode == 'exact') {
            return pages.filter((p)=>p.name == title).map((p)=>p.id);
        } else if (mode == 'startsWith') {
            return pages.filter((p)=>p.name?.startsWith(title)).map((p)=>p.id);
        } else if (mode == 'includes') {
            return pages.filter((p)=>p.name?.includes(title)).map((p)=>p.id);
        }
        return [];
    }
};
//######################
// File: client/0/DEBUG.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/0/DEBUG.ts
//######################
const DEBUG = true;
const DIRTY = {
    _: [],
    error: null,
    mark (singleton, id, isDeleted = false) {
        // check if user didnt make mistake in strEval string: 
        try {
            eval(this.evalStringResolve(singleton, id));
        } catch (e) {
            throw Error("Eval cant find object " + singleton + " id " + id + ". :" + e);
        }
        const require_id = [
            "_BLOCKS",
            "_TAGS"
        ];
        if (require_id.includes(singleton) && id === undefined) throw Error(`${singleton} requires an ID but none provided.`);
        if (require_id.includes(singleton) == false && id !== undefined) throw Error(`${singleton} doesnt support an ID but id '${id}' was provided.`);
        this._ = this._.filter((p)=>!(p[0] == singleton && p[1] == id)); // && (isDeleted?(p[2]==true):(p[2]!=true))));
        this._.push([
            singleton,
            id,
            isDeleted
        ]);
        console.warn("Marked: ", [
            singleton,
            id,
            isDeleted
        ]);
    },
    evalStringResolve (singleton, id) {
        let finalEvalStr = singleton;
        if (id !== undefined) {
            finalEvalStr += `["${id}"]`;
        }
        //else throw Error("Unexpected evalStr length: " + JSON.stringify(strEval));
        return finalEvalStr;
    }
};
const HELP = {
    topics: {
        Navigation: `
### all of these dont cycle. You wont wrap to first child if you keep going down. ###
ArrowUp : Above (any level)
ArrowUp + Shift : Above (same level)
ArrowDown : Below  (any level)
ArrowDown + Shift : Above (same level)
ArrowLeft : Select parent
ArrowRight : Select parent's sibling below
Tab : Below  (any level)
Tab + Shift: Above  (any level)

Escape (bock selection mode): Unselect block
Escape (text edit mode): Go to block selection mode

Enter (block selection mode):  Edit text  (go to text edit mode)

Delete : delete block
        `.trim()
    },
    // locations (and descriptions) in code to where you can find implementation of mentioned feature/topic
    codeHints: {},
    logCodeHint (topic, description) {
        function getCodeLocation() {
            return new Error().stack.split("\n").reverse().slice(2);
        // const e = new Error();
        // const regex = /\((.*):(\d+):(\d+)\)$/
        // const match = regex.exec(e.stack!.split("\n")[2]);
        // return {
        //     filepath: match[1],
        //     line: match[2],
        //     column: match[3]
        // };
        }
        if (!(topic in this.topics)) throw Error("Unknown topic: " + topic);
        if (this.codeHints[topic] && this.codeHints[topic].some((ch)=>ch.desc == description)) {
            //code hint is already present.
            return;
        }
        (topic in this.codeHints ? this.codeHints[topic] : this.codeHints[topic] = [] // create new
        ).push({
            desc: description,
            sourceLocation: getCodeLocation()
        });
    }
};
//######################
// File: client/0/MyQuill.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/0/MyQuill.ts
//######################
//import { Quill } from "../../external/quill-js/quill.js";
const Embed = Quill.import('blots/embed');
// const Block = Quill.import('blots/block');
const BlockEmbed = Quill.import('blots/block/embed');
const Inline = Quill.import('blots/inline');
const InlineBlot = Quill.import('blots/block');
class InlineBtnBlot extends Embed {
    static create(value) {
        let node = super.create();
        node.setAttribute('onclick', value.url);
        // node.setAttribute('target', '_blank')
        node.innerText = value.text;
        node.classList.add('btn', 'btn-primary');
        return node;
    }
    // let value be hash containing both href and text
    static value(node) {
        return {
            url: node.getAttribute('onclick'),
            text: node.innerText
        };
    }
}
InlineBtnBlot.blotName = 'inlineBtn';
InlineBtnBlot.tagName = 'button';
InlineBtnBlot.className = 'inlineBtn'; // cant have multiple :(
Quill.register(InlineBtnBlot);
function getBlockElement(node) {
    return getElement(node).nearest('[data-b-id]');
}
function getBtn(eventTarget) {
    return getElement(eventTarget).closest('button');
}
function getNodeData(node) {
    node = getElement(node).closest('data-node-data');
    let data = node.getAttribute('data-node-data');
}
class LineBtnBlot extends BlockEmbed {
    static blotName = 'lineBtn';
    static tagName = 'button';
    static className = 'lineBtn';
    static create(value) {
        let node = super.create();
        node.setAttribute('onclick', value.url);
        // node.setAttribute('target', '_blank')
        node.innerText = value.text;
        node.classList.add('btn', 'btn-primary');
        return node;
    }
    // let value be hash containing both href and text
    static value(node) {
        return {
            url: node.getAttribute('onclick'),
            text: node.innerText
        };
    }
}
Quill.register(LineBtnBlot);
class BlockEmbed_LineBtnBlot extends BlockEmbed {
    static blotName = 'blockEmbed_lineBtn';
    static tagName = 'button';
    static className = 'blockEmbed_lineBtn';
    static create(value) {
        let node = super.create();
        node.setAttribute('onclick', `alert("${value.id}");`);
        // node.setAttribute('target', '_blank')
        // //   node.dataset.id = id;
        node.setAttribute('data-id', value.id);
        node.setAttribute('data-text', value.text || "");
        node.innerText = value.text || "<null>";
        node.classList.add('btn', 'btn-primary');
        return node;
    }
    // let value be hash containing both href and text
    static value(node) {
        return {
            id: node.getAttribute('data-id'),
            text: node.getAttribute('data-text')
        };
    }
}
Quill.register(BlockEmbed_LineBtnBlot);
class ExpandableTextBlot extends BlockEmbed {
    static blotName = 'expandable';
    static tagName = 'div';
    static className = 'expandable-text';
    // constructor(node2) {
    //   console.log("constructor!!!!!!!",node2);
    //   // super(node);
    //   let node = super.create(node2);
    //   this.button = document.createElement('span');
    //   this.button.classList.add('expand-button');
    //   this.button.innerHTML = '\u25C0'; // Arrow left (collapsed)
    //   this.button.contentEditable = 'false';
    //   this.button.addEventListener('click', this.toggleExpand.bind(this));
    //   this.contentSpan = document.createElement('span');
    //   this.contentSpan.classList.add('expandable-content');
    //   while (node.firstChild) {
    //     this.contentSpan.appendChild(node.firstChild);
    //   }
    //   node.appendChild(this.button);
    //   node.appendChild(this.contentSpan);
    //   this.expanded = node.dataset.expanded === 'true';
    //   this.updateVisibility();
    // }
    // toggleExpand() {
    //   this.expanded = !this.expanded;
    //   this.domNode.dataset.expanded = this.expanded;
    //   this.updateVisibility();
    // }
    // updateVisibility() {
    //   this.contentSpan.contentEditable = this.expanded.toString();
    //   this.contentSpan.style.display = this.expanded ? 'inline' : 'none';
    //   this.button.innerHTML = this.expanded ? '\u25B2' : '\u25C0'; // Arrow up when expanded
    // }
    static create(value) {
        console.log("Static create", value);
        let node = super.create(value);
        node.dataset.expanded = value.collapsed ? 'false' : 'true';
        let button = document.createElement('div');
        node.appendChild(button);
        button.classList.add('expand-button');
        button.innerHTML = '[\u25C0]'; // Arrow left (collapsed)
        button.contentEditable = 'false';
        //button.addEventListener('click', this.toggleExpand.bind(this));
        // button.addEventListener('click', this.toggleExpand.bind(this));
        let contentSpan = document.createElement('span');
        contentSpan.classList.add('expandable-content');
        contentSpan.appendChild(document.createTextNode(value.text));
        contentSpan.contentEditable = 'true'; // Allow editing the content
        contentSpan.style.display = value.collapsed ? 'none' : 'inline'; // Hide content if collapsed
        node.appendChild(contentSpan);
        node.setAttribute('contenteditable', 'false'); // Make the whole node non-editable
        button.addEventListener('click', ()=>{
            // Toggle the collapsed state
            value.collapsed = !value.collapsed;
            node.dataset.expanded = value.collapsed ? 'false' : 'true';
            // Update the content visibility
            contentSpan.style.display = value.collapsed ? 'none' : 'inline';
            // Update the button text
            button.innerHTML = value.collapsed ? '[\u25C0]' : '[\u25B2]'; // Arrow up when expanded
        });
        node.style = `display: inline-block; padding: 5px; border: 1px solid #ccc; border-radius: 4px; background-color: #f9f9f9;`;
        return node;
    }
    static formats(node) {
        return {
            collapsed: node.dataset.expanded !== 'true',
            text: node.querySelector('.expandable-content')?.textContent || ''
        };
    }
    //static formats() { return false; }
    // format(name, value) {
    //   if (name === 'expandable' && typeof value === 'object') {
    //     this.domNode.dataset.expanded = value.collapsed ? 'false' : 'true';
    //     this.contentSpan.textContent = value.text;
    //     this.updateVisibility();
    //   } else {
    //     super.format(name, value);
    //   }
    // }
    static value(node) {
        return {
            collapsed: node.dataset.expanded !== 'true',
            text: node.querySelector('.expandable-content')?.textContent || ''
        };
    }
}
Quill.register({
    'formats/expandable': ExpandableTextBlot
});
//Quill.register(ExpandableTextBlot);
class PboardInlineBlock extends Embed {
    static blotName = 'inline-pboard-block';
    static tagName = 'div';
    static className = 'inline-pboard-block';
    static create(value) {
        console.log("Static create", value);
        let node = super.create(value);
        node.dataset.expanded = value.collapsed ? 'false' : 'true';
        node.setAttribute('data-pboard-board-id', value.id); //node.setAttribute('pboard-board-id', value.id);
        //node.setAttribute('contenteditable', 'false'); // Make the whole node non-editable
        node.contentEditable = 'false'; // Make the whole node non-editable
        let button = document.createElement('div');
        node.appendChild(button);
        button.classList.add('expand-button');
        button.innerHTML = '[\u25C0]'; // Arrow left (collapsed)
        button.style.userSelect = 'none';
        let content = document.createElement('div');
        node.appendChild(content);
        content.classList.add('pboard-board-content');
        content.style.userSelect = 'text';
        content.contentEditable = 'false'; // Make the content non-editable
        button.addEventListener('click', ()=>{
            // Toggle the collapsed state
            value.collapsed = !value.collapsed;
            node.dataset.expanded = value.collapsed ? 'false' : 'true';
            // Update the content visibility
            //contentSpan.style.display = value.collapsed ? 'none' : 'inline';
            // Update the button text
            button.innerHTML = value.collapsed ? '[\u25C0]' : '[\u25B2]'; // Arrow up when expanded
            if (value.collapsed) {
                content.innerHTML = "";
                node.style.display = "inline-block";
                node.style.width = "auto";
            // node.style.lineHeight = "0px";
            } else {
                node.style.display = "block";
                node.style.width = "100%";
                // node.style.lineHeight = "normal";
                (async ()=>{
                    let bv = new Block_Visual(await BLOCKS(value.id), content);
                    bv.updateAll();
                    content.querySelector('.ql-editor').contentEditable = 'false';
                })();
            // content.innerHTML = `Loading board ${value.id}...`;
            // setTimeout(() => {  content.innerHTML = `Board ${value.id} content loaded.`;}, 1000);
            }
        });
        content.addEventListener('mousedown', (ev)=>{
            let editor = content.querySelector('.ql-editor');
            if (editor) editor.contentEditable = 'true';
            console.log("CLIIIIIIIIIIIIIIIIIIIIIIIICK");
        });
        content.addEventListener('focusout', (ev)=>{
            let editor = content.querySelector('.ql-editor');
            if (editor) editor.contentEditable = 'false';
            console.log("BLUUUUUUUUUUUUUR");
        });
        node.style = `display: inline-block; line-height: 0px; user-select: none; padding: 5px; border: 1px solid #ccc; border-radius: 4px; background-color: #f9f9f9;`;
        //node.style = `padding: 5px; border: 1px solid #ccc; border-radius: 4px; background-color: #f9f9f9;`;
        console.log("Created node", node, "content", content);
        return node;
    }
    static formats(node) {
        return {
            collapsed: node.dataset.expanded !== 'true',
            id: node.getAttribute('data-pboard-board-id')
        };
    }
    static value(node) {
        return {
            collapsed: node.dataset.expanded !== 'true',
            id: node.getAttribute('data-pboard-board-id')
        };
    }
}
Quill.register({
    'formats/inline-pboard-block': PboardInlineBlock
});
//######################
// File: client/0/Preferences.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/0/Preferences.ts
//######################
// class PreferencesClass {
//     this.pageView_maxWidth :number;
// };
// RegClass(PreferencesClass);
//######################
// File: client/0/PROJECT.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/0/PROJECT.ts
//######################
class ProjectClass {
    running_change_hash;
    __runningId;
    version;
    DIRTY() {
        DIRTY.mark("PROJECT");
    }
    constructor(){
        this.running_change_hash = "-";
        this.__runningId = 1;
        this.version = "1";
    }
    genChangeHash() {
        this.running_change_hash = numToShortStr((Date.now() - new Date(2025, 0, 1).getTime()) * 1000 + Math.floor(Math.random() * 1000));
        this.DIRTY();
        return this.running_change_hash;
    }
    genId() {
        ++this.__runningId;
        this.DIRTY();
        return this.__runningId.toString();
    }
}
RegClass(ProjectClass);
const Server = {
    __WebSock: new WebSocket("ws://localhost:9020"),
    __SockOpen: false,
    /*
new Promise((resolve, reject) => {
    WebSock.onopen(()=>resolve());
});*/ __MsgQueue: [],
    // let msgId = 0;
    // msg: {text:null,cb:null}         //
    // msg: {promise:true, text:null}   //promisify automatically
    sendMsg (msg) {
        // msgId++;
        // msg.id = msgId;
        let promise = null;
        if (msg.cb === undefined) promise = new Promise((resolve, reject)=>{
            msg.cb = resolve;
        });
        this.__MsgQueue.push(msg);
        if (this.__SockOpen) this.__WebSock.send(JSON_Serialize({
            n: msg.n,
            d: msg.d
        }));
        if (promise !== null) return promise;
    }
};
Server.__WebSock.onopen = (event)=>{
    Server.__SockOpen = true;
    for(let i = 0; i < Server.__MsgQueue.length; i++)Server.__WebSock.send(JSON_Serialize({
        n: Server.__MsgQueue[i].n,
        d: Server.__MsgQueue[i].d
    }));
    console.log("Open");
// WebSock.send("Here's some text that the server is urgently awaiting!");
};
WARN("Da ne radim .shift nego attachujem ID na sent message i uklonim appropriate ID.");
Server.__WebSock.onmessage = (event)=>{
    let m = Server.__MsgQueue.shift();
    let dataTxt = event.data;
    console.log("websock recv:", dataTxt);
    let data;
    // if(dataTxt.startsWith("error")){
    //     data = new Error(JSON_Deserialize(dataTxt.substring("error".length)));
    // }else{
    data = JSON_Deserialize(dataTxt);
    // }
    m.cb(data);
// console.log(event.data);
};
let contextmenuHandlers = {};
let contextMenuInstance = null;
const Html_ContextMenu = (items)=>LEEJS.div(LEEJS.$I`context-menu`, {
        style: "display: none;"
    }, items.map((it)=>LEEJS.button({
            class: (it[2]?.classMod ?? ((x)=>x))("context-menu-item btn btn-outline-light btn-sm"),
            tabindex: "-1",
            type: 'button',
            ...it[2]?.attribs ?? {},
            ...it[2]?.tooltip ? {
                "data-tooltip": it[2].tooltip,
                "data-tooltip-side": "right"
            } : {},
            $click: (e)=>{
                closeContextMenu();
                it[1](e);
            }
        }, it[0], ...it[2]?.children ?? [])));
function applyTooltipsGlobally() {
    document.querySelectorAll('[data-tooltip]:not([data-tippy-loaded])').forEach((e)=>{
        e.setAttribute('data-tippy-loaded', '1');
        let side = e.getAttribute('data-tooltip-side') || 'bottom';
        tippy(e, {
            content: e.getAttribute('data-tooltip'),
            zIndex: 99999,
            placement: side,
            allowHTML: true,
            touch: 'hold'
        });
    });
}
setInterval(()=>{
    applyTooltipsGlobally();
}, 400);
function closeContextMenu() {
    if (contextMenuInstance) contextMenuInstance.hide();
}
// document.addEventListener("DOMContentLoaded", function() {
document.addEventListener("contextmenu", function(event) {
    if (!event.target) return;
    if (openContextMenu(event.target, event.clientX, event.clientY)) event.preventDefault();
});
document.addEventListener("click", function(event) {
    if (contextMenuInstance && !event.target.closest(".tippy-box")) {
        closeContextMenu();
    }
});
function openContextMenu(targetElement, x, y) {
    let target = targetElement.closest("[data-contextmenu]");
    if (!target) return;
    let cmInfo = target.getAttribute("data-contextmenu");
    if (!cmInfo) return;
    let fn = contextmenuHandlers[cmInfo];
    if (!fn) return;
    let items = fn(target);
    if (!items && Array.isArray(items) == false) return;
    if (contextMenuInstance) {
        contextMenuInstance.hide();
        contextMenuInstance.destroy();
    }
    const menuContent = Html_ContextMenu(items)();
    menuContent.style.display = "";
    contextMenuInstance = tippy(document.body, {
        content: menuContent,
        allowHTML: true,
        interactive: true,
        trigger: "manual",
        duration: [
            100,
            50
        ],
        theme: "light-border",
        placement: "right-start",
        getReferenceClientRect: ()=>({
                width: 0,
                height: 0,
                top: y,
                bottom: y,
                left: x,
                right: x
            })
    });
    contextMenuInstance.show();
    menuContent.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && contextMenuInstance) {
            closeContextMenu();
        }
    });
    setTimeout(()=>{
        menuContent.querySelector('.context-menu-item').focus();
    }, 10);
    return true;
}
class Window_Tab {
    rootWindow;
    contentsWindow;
    constructor(rootWindow, contentsWindow){
        this.rootWindow = rootWindow;
        this.contentsWindow = contentsWindow;
    }
}
class WindowPB {
    name;
    tabs;
    constructor(name){
        this.name = name;
        this.tabs = [];
    }
    html() {
        LEEJS.div({
            class: "window"
        }, LEEJS.div({
            class: "window-header"
        }), LEEJS.div({
            class: "window-body"
        }, LEEJS.div({
            class: "window-tabs"
        }), LEEJS.div({
            class: "window-contents"
        })));
    }
}
class WindowSystem {
    root;
    constructor(root){
        this.root = root;
    }
}
class WindowSplit {
    vertical;
    windows;
    constructor(vertical// split direction
    ){
        this.vertical = vertical;
        this.windows = [];
    }
}
contextmenuHandlers['page'] = ()=>[
        [
            "Backup",
            ()=>{
                alert("AYO");
            }
        ]
    ];
document.body.setAttribute('data-contextmenu', 'page');
async function selectBlock(b, editText = null) {
    // if(selected_block==b && editText===inTextEditMode) return;
    if (b === null) {
        selected_block = null;
        if (document.activeElement) document.activeElement.blur();
        //document.body.focus();
        inTextEditMode = false;
        updateSelectionVisual();
        return;
    }
    // if(b===null) return;
    // selectBlock(null);
    //let _prevSelection = selected_block;
    // console.error(document.activeElement,b,editText,inTextEditMode);
    //selected_block = b;
    // posto pri renderAll za Block_Visual mi obrisemo svu decu i rekreiramo, selekcija nam se gubi. Ali svi block-visual imaju unique id recimo. Tako da mozemo po tome selektovati.
    // mozda bolje da zapravo generisem unique block visual id umesto da se oslanjam na block id al jbg.
    const id = b.id();
    selected_block = null;
    await new Promise((resolve)=>setTimeout(()=>{
            const foundSelectBlock = STATIC.pageView.querySelector(`div.block[data-b-id="${id}"]`);
            if (foundSelectBlock) selected_block = el_to_BlockVis.get(foundSelectBlock);
            else selected_block = null;
            if (selected_block != null) {
                if (editText || editText === null && inTextEditMode) {
                    inTextEditMode = true;
                    selected_block.focus(inTextEditMode);
                } else {
                    inTextEditMode = false;
                    selected_block.focus(inTextEditMode);
                }
            }
            updateSelectionVisual();
            resolve(null);
        }, 2));
}
//######################
// File: client/1View/9Logseq/3Page_Visual.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/1View/9Logseq/3Page_Visual.ts
//######################
/*
User is viewing a single page.
*/ class Page_Visual {
    pageId;
    children;
    childrenHolderEl;
    alreadyRendered;
    titleEl = null;
    constructor(){
        this.pageId = "";
        this.children = [];
        this.alreadyRendered = false;
        this.childrenHolderEl = null;
    }
    setDocumentURI() {
        // change document url to have hash "#?pageId=<pageId>"
        // let url = new URL(document.location.href);
        // url.hash = "#?pageId="+this.pageId;
        // history.pushState({}, '', url.href);
        document.location.hash = "?pageId=" + this.pageId;
    }
    getDocumentURI() {
        let url = new URL(document.location.href);
        let pageId = url.hash.match(/pageId=(\w+)/);
        if (pageId) {
            this.pageId = pageId[1];
            return this.pageId;
        }
        return null;
    }
    page() {
        return _BLOCKS[this.pageId];
    }
    block_() {
        return _BLOCKS[this.pageId];
    }
    block() {
        return BLOCKS(this.pageId);
    }
    id() {
        return this.pageId;
    }
    appendChild(childBV, idx = -1) {
        if (idx < 0) {
            this.children.push(childBV);
            this.childrenHolderEl.appendChild(childBV.el);
        } else {
            this.children.splice(idx, 0, childBV);
            this.childrenHolderEl.insertBefore(childBV.el, this.childrenHolderEl.children.item(idx));
        }
        // this.renderChildren();
        this.updateBlocksById(this.pageId);
    }
    async deleteChild(childBV) {
        const idx = this.children.indexOf(childBV);
        if (idx >= 0) {
            this.children[idx].deleteSelf();
            BlkFn.DeleteBlockOnce(childBV.blockId);
            this.children.splice(idx, 1);
            let b = await this.block();
            b.children.splice(idx, 1);
            b.DIRTY();
            this.renderChildren();
        }
        // if(selected_block == childBV) selectBlock(null);
        //this.updateStyle();
        this.updateBlocksById(this.pageId);
    }
    async renderChildren(maxUncollapseDepth = 999) {
        if (this.children.length > 0) {
            this.children.forEach((c)=>c.deleteSelf());
        }
        this.children = [];
        this.childrenHolderEl.innerHTML = "";
        let b = await this.block();
        for(let i = 0; i < b.children.length; i++){
            //if(_BLOCKS[b.children[i]]==null) continue; // skip not yet loaded. [TODO] add a button to load more.
            let b2 = await BLOCKS(b.children[i], 2);
            let bv2 = await b2.makeVisual(this.childrenHolderEl, maxUncollapseDepth);
            this.children.push(bv2);
        //await bv2.renderChildren();
        //await makeBlockAndChildrenIfExist(bv2);
        }
    }
    async openPage(newPageId) {
        const maxUncollapseDepth = 999;
        await loadBlock(newPageId, maxUncollapseDepth);
        this.pageId = newPageId;
        this.children = [];
        await CheckAndHandle_PageNoBlocks();
        await this.makePage(maxUncollapseDepth);
    }
    async makePage(maxUncollapseDepth = 0) {
        //if(this.alreadyRendered) throw new Error("Page is being made again. Why?");
        this.alreadyRendered = true;
        const p = this.page();
        this.children = [];
        document.title = p.pageTitle ?? "";
        this.childrenHolderEl = STATIC.blocks;
        this.childrenHolderEl.innerHTML = ""; // clear
        /*
        async function makeBlockAndChildrenIfExist(bv:Block_Visual){
            //bv already exists and is created. Now we need to create visuals for its children (and theirs).
            //create block_visuals for children of bv, and repeat this for them recursively
            let b = await bv.block();
            bv.children = [];
            if(bv.collapsed == false){
                for(let i = 0; i<b.children.length; i++){
                    //if(_BLOCKS[b.children[i]]==null) continue; // skip not yet loaded. [TODO] add a button to load more.
                    let b2 = await BLOCKS(b.children[i]);
                    let bv2 = b2.makeVisual(bv.childrenHolderEl);
                    bv.children.push(bv2);
                    await makeBlockAndChildrenIfExist(bv2);
                }
            }
        }*/ if (p.pageTitle !== undefined) {
            this.titleEl = STATIC.pageView_Title;
            STATIC.pageView_Title.style.display = "inline-block"; // show title input if page has a title.            
            this.titleEl.value = p.pageTitle;
            let changeEv = async (e)=>{
                if (p.pageTitle == this.titleEl.value) return; // no change.
                p.pageTitle = this.titleEl.value;
                console.log("Page title changed to:", p.pageTitle);
                p.DIRTY();
                this.setDocumentURI();
            };
            this.titleEl.oninput = changeEv;
            this.titleEl.onchange = changeEv;
            this.titleEl.onblur = changeEv;
        } else {
            this.titleEl = null;
            STATIC.pageView_Title.style.display = "none"; // hide title input if no title.
        }
        this.renderChildren();
    }
    updateBlocksById(id, action = null) {
    //TODO("Iterisi sve otvorene children. Podrzi deleted.");
    /*
        function updateBlockView(bv:Block_Visual){
            if(bv.blockId != id) return;
            bv.updateAll();
        }
        this.children.forEach(c=>updateBlockView(c));
        */ }
}
let view = new Page_Visual();
let selected_block = null;
let inTextEditMode = false;
var el_to_BlockVis = {
    _: new WeakMap(),
    get (key, allowNull = false) {
        let r = this._.get(key) ?? null;
        if (!allowNull) assert_non_null(key, "key");
        return r;
    },
    set (key, value) {
        assert_non_null(key, "key");
        assert_non_null(value, "value");
        this._.set(key, value);
    },
    delete (key) {
        assert_non_null(this._.has(key), "[Deleting nonexistent htmlElement key]");
        this._.delete(key);
    }
};
const ACT /*"Actions"*/  = {
    //double click handling (since if i blur an element it wont register dbclick)
    lastElClicked: null,
    clickTimestamp: 0,
    // consts:
    DOUBLE_CLICK: 2,
    SINGLE_CLICK: 1,
    fn_OnClicked (el) {
        let sameClicked = this.lastElClicked == el;
        this.lastElClicked = el;
        let t = new Date().getTime();
        let dt = t - this.clickTimestamp;
        this.clickTimestamp = t;
        if (dt < 340 && sameClicked) {
            return this.DOUBLE_CLICK;
        }
        return this.SINGLE_CLICK;
    },
    // marking already handled events when they bubble
    // __handledEvents : new Array<Event>(10),  //set of already handled events.
    // __handledEvents_circularIdx : 0    as number, // it wraps around so handledEvents is a circular buffer
    // new events get added like so:  handledEvents[circIdx=(++circIdx %n)]=ev;  so it can keep at most n last events.
    setEvHandled (ev) {
        // this.__handledEvents[
        //     this.__handledEvents_circularIdx=( ++this.__handledEvents_circularIdx %this.__handledEvents.length)
        // ] = ev;
        ev.handled_already = true;
    },
    isEvHandled (ev) {
        return ev.handled_already; // || (this.__handledEvents.indexOf(ev)!==-1);
    }
};
const STATIC = {
    _body: document.body,
    style_highlighter: document.getElementById('highlighterStyle'),
    blocks: document.getElementById('blocks'),
    pageView: document.getElementById('pageView'),
    pageView_Title: document.getElementById('pageView-title')
};
function propagateUpToBlock(el, checkSelf = true) {
    // ovo bi moglo putem el.closest(query) umesto da rucno idem parentElement
    if (checkSelf && el.hasAttribute("data-b-id")) return assert_non_null(el_to_BlockVis.get(el), "el->bv", DEBUG);
    while(el != STATIC.blocks && el != document.body){
        el = el.parentElement;
        if (el && el.hasAttribute("data-b-id")) return assert_non_null(el_to_BlockVis.get(el), "el->bv", DEBUG);
    }
    return null;
}
function updateSelectionVisual() {
    if (selected_block == null) {
        STATIC.style_highlighter.innerHTML = "";
        return;
    }
    STATIC.style_highlighter.innerHTML = `div[data-b-id="${selected_block.blockId}"]{\
    background-color: var(--block-bg-selected-color) !important;\
    /* padding-left: 0px; */\
    /*border-left: 8px solid #555555 !important;*/\
    }
    div[data-b-id="${selected_block.blockId}"]>div.editor.TinyMDE{\
    background-color: var(--block-editor-bg-selected-color) !important;\
    }` + (inTextEditMode ? `
    div[data-b-id="${selected_block.blockId}"]>div[role="toolbar"]{
        display:contents; /*ili block*/
    }
    ` : "");
}
/**
 * If page has 0 blocks, make one automatically.
 * we dont want pages without blocks.
 */ async function CheckAndHandle_PageNoBlocks() {
    if (view.pageId == "") return;
    let p = await BLOCKS(view.pageId);
    if (p.children.length > 0) return;
    console.log("CheckAndHandle_PageNoBlocks", view.pageId);
    NewBlockInside(null);
}
// LEEJS.shared()("#pageView"); //not really needed
/*
l.$E(
    l.shared(),
    l.p(`Test`),
    l.button({onclick:"mojaFN()"},"KLIKNIME"),
)("#pageView"); //hostElement, write function
//(null,"write") //hostElement, write function
*/ const SHIFT_FOCUS = {
    firstChild: 0,
    parent: 1,
    above: 2,
    below: 3,
    above_notOut: 4,
    below_notOut: 5
};
async function ShiftFocus(bv, shiftFocus/*SHIFT_FOCUS*/ , skipCollapsed = true) {
    if (bv == null) throw Error("No selection shift focus.");
    function bv_above_sameLevel(bv) {
        assert_non_null(bv);
        /* Ako smo PRVO dete vracamo null (nobody above us) */ const i = bv.index();
        if (i == 0) return null;
        return bv.parentChildrenArray()[i - 1];
    }
    function bv_below_sameLevel(bv) {
        assert_non_null(bv);
        /* Ako smo ZADNJE dete vracamo null (nobody below us) */ const i = bv.index();
        const arr = bv.parentChildrenArray();
        // console.error(i,arr);
        if (i >= arr.length - 1) return null;
        return arr[i + 1];
    }
    function bv_lowestChild_allLevels(bv) {
        assert_non_null(bv);
        /*
        A       <-- bv
        .. B
        .. .. H
        .. .. C
        .. .. .. S
        .. J
        .. .. L
        .. .. M     <-- return this
        */ if (bv.collapsed || bv.children.length == 0) return bv; /* bv nema decu te je on lowest. */ 
        const lastChild = bv.lastChild();
        if (!lastChild) return null;
        return bv_lowestChild_allLevels(lastChild);
    }
    function bv_above_anyLevel(bv) {
        assert_non_null(bv);
        /* Iznad nas moze biti bilo ko. To zavisi dal je na nekom levelu neko iznad nas collapsed ili expanded:
        A
        .. B
        .. .. C    <-- return this
        G          <-- we are here
        
        Primecujemo da je A an istom nivou kao i G.
        dakle trebamo naci above us na nasem nivou.
        ako nema, idemo na naseg parenta i ponavljamo proces.
        */ let above_sameLvl = bv_above_sameLevel(bv);
        return above_sameLvl == null ? //nobody above us on same level. Therefore only our parent is above us (if they exist, else we are topmost of the whole page so return null anyways).
        bv.parent() : // ovaj iznad nas je ill collapsed (te nam treba on, a funkcije hendluje to), il ima (nested potencijalno) decu. Nama treba najnize dete cele hiearhije.
        bv_lowestChild_allLevels(above_sameLvl);
    }
    function bv_below_anyLevel(bv) {
        assert_non_null(bv);
        /*
        // main trivial case : we have children
        A
        .. B
        .. .. C     <-- we are here
        .. .. ..  G        <-- return this

        // second trivial case: below us on same level
        A
        .. B
        .. .. C     <-- we are here
        .. .. G        <-- return this

        // non trivial:
        
        A
        .. B
        .. .. C     <-- we are here
        .. G        <-- return this
        
        or (arbitrarily deeper depth)

        A
        .. B
        .. .. C     <-- we are here
        G           <-- return this
        
        
        znaci odemo na naseg parenta.
        vratimo ako postoji neko below naseg parenta na istom nivou (njegovom).

        ponovimo proces.
        na kraju il returnujemo il je parent==null
        */ // main trivial case : we have children therefore below us is our first child.
        if (bv.collapsed == false && bv.children.length > 0) return bv.firstChild();
        // second trivial case:  there is someone below us on our level
        const below_sameLvl = bv_below_sameLevel(bv);
        if (below_sameLvl) return below_sameLvl;
        // No more trivial cases. We must go to our parent.
        while(true){
            const bv_par = bv.parent();
            if (bv_par == null) return null; // if parent is null then we are on page root, and last on page (otherwise we would have had below_sameLevel). so nobody below us.
            const parent_below_sameLvl = bv_below_sameLevel(bv_par);
            if (parent_below_sameLvl) return parent_below_sameLvl;
            bv = bv_par;
        //repeat.
        }
    }
    //if skipCollapsed, then it wont go into children of collapsed blocks (not visible).
    let focusElement = null;
    if (shiftFocus == SHIFT_FOCUS.above_notOut) {
        focusElement = bv_above_sameLevel(bv);
    } else if (shiftFocus == SHIFT_FOCUS.below_notOut) {
        focusElement = bv_below_sameLevel(bv);
    } else if (shiftFocus == SHIFT_FOCUS.above) {
        focusElement = bv_above_anyLevel(bv);
    } else if (shiftFocus == SHIFT_FOCUS.below) {
        focusElement = bv_below_anyLevel(bv);
    } else if (shiftFocus == SHIFT_FOCUS.firstChild) {
        focusElement = bv.firstChild();
    } else if (shiftFocus == SHIFT_FOCUS.parent) {
        focusElement = bv.parent();
    } else throw new Error("shiftFocus value must be one of/from SHIFT_FOCUS const object.");
    //console.log("BV SSSS",focusElement);
    if (focusElement) {
        await selectBlock(focusElement);
        // FocusElement(focusElement.el);
        // updateSelectionVisual();
        return focusElement;
    }
    return null;
}
async function NewBlockAfter(thisBlock) {
    let parentBlockVis = thisBlock.parentOrPage(); //Get parent or Page of view / window.
    let parentBlock = parentBlockVis.id();
    let parentHolder = parentBlockVis.childrenHolderEl;
    const idx = thisBlock.index() + 1;
    let blockVis = await (await Block.new("")).makeVisual(parentHolder);
    await BlkFn.InsertBlockChild(parentBlock, blockVis.blockId, idx);
    parentBlockVis.appendChild(blockVis, idx);
    selectBlock(blockVis, inTextEditMode);
    view.updateBlocksById(parentBlock);
    return blockVis;
}
async function NewBlockInside(thisBlockVis, idx = -1) {
    console.log("NewBlockInside", thisBlockVis, idx);
    if (thisBlockVis == null) thisBlockVis = view;
    let parentBlock = thisBlockVis.id();
    let parentHolder = thisBlockVis.childrenHolderEl;
    let blockVis = await (await Block.new("")).makeVisual(parentHolder);
    await BlkFn.InsertBlockChild(parentBlock, blockVis.blockId, idx);
    thisBlockVis.appendChild(blockVis, idx);
    selectBlock(blockVis, inTextEditMode);
    view.updateBlocksById(parentBlock);
    return blockVis;
}
// async function NewBlockInsidePage(){
//     // let h = view.el!;//.parentElement!; //parent node
//     let blockVis = await (await Block.new("")).makeVisual();
//     await BlkFn.InsertBlockChild(view.pageId,blockVis.blockId, (await BLOCKS(view.pageId)).children.length); //as last
//     // thisBlock.block.children.push(blockVis.block.id);
//     view.childrenHolderEl.appendChild(blockVis.el);
//     view.children.push(blockVis);
//     selectBlock(blockVis,inTextEditMode);
//     return blockVis;
// }
STATIC._body.addEventListener('click', (e)=>{
    if (!e.target || propagateUpToBlock(e.target) == null) {
        if (e.target.closest(".doesnt-cancel-selection") !== null) return; // if clicked on something that should not cancel selection, then do not cancel.
        selectBlock(null);
    }
});
STATIC._body.addEventListener('keydown', (e)=>{
    if (e.key == 'F1') {
        SEARCHER.toggleVisible();
        e.preventDefault();
        e.stopImmediatePropagation();
    }
});
STATIC.blocks.addEventListener('keydown', async (e)=>{
    console.log("BLOCKS KEYDOWN11", e, ACT.isEvHandled(e));
    if (ACT.isEvHandled(e)) return;
    ACT.setEvHandled(e);
    console.log("BLOCKS KEYDOWN22", e);
    HELP.logCodeHint("Navigation", "Listeners/handlers for navigation keys.");
    let cancelEvent = true;
    // [TODO] if(e.ctrlKey)  then move around a block (indent,unindent , collapse,expand)
    if (e.key == 'ArrowUp') {
        if (selected_block) ShiftFocus(selected_block, e.shiftKey ? SHIFT_FOCUS.above_notOut : SHIFT_FOCUS.above);
    } else if (e.key == 'ArrowDown') {
        if (selected_block) ShiftFocus(selected_block, e.shiftKey ? SHIFT_FOCUS.below_notOut : SHIFT_FOCUS.below);
    } else if (e.key == 'ArrowLeft') {
        if (selected_block) {
            ShiftFocus(selected_block, SHIFT_FOCUS.parent);
        // ShiftFocus(selected_block, SHIFT_FOCUS.above_notOut);
        }
    } else if (e.key == 'ArrowRight') {
        if (selected_block) {
            (async ()=>{
                console.log("Cur selected:", selected_block);
                await ShiftFocus(selected_block, SHIFT_FOCUS.parent);
                console.log("1 selected:", selected_block);
                await ShiftFocus(selected_block, SHIFT_FOCUS.below_notOut);
                console.log("2 selected:", selected_block);
            })();
        }
    } else if (e.key == 'Tab') {
        if (selected_block) {
            ShiftFocus(selected_block, e.shiftKey ? SHIFT_FOCUS.above : SHIFT_FOCUS.below);
        }
    } else if (e.key == 'Escape') {
        console.log("ESCAPE view");
        selectBlock(null);
    } else if (e.key == 'Enter') {
        if (selected_block) {
            if (e.shiftKey) {
                if (e.ctrlKey) selectBlock(await NewBlockInside(selected_block.parentOrPage(), selected_block.index()), true);
                else selectBlock(await NewBlockInside(selected_block), true);
            } else if (e.ctrlKey) {
                selectBlock(await NewBlockAfter(selected_block), true);
            } else if (selected_block && !inTextEditMode) {
                selectBlock(selected_block, true);
            }
        }
    //console.log(e);
    } else if (e.key == 'Delete') {
        if (selected_block) {
            //prepare things so we can later select a new element after deleting
            const parent = selected_block.parent();
            const parArr = selected_block.parentChildrenArray();
            const selfIdx = selected_block.index();
            //delete self
            selected_block.parentOrPage().deleteChild(selected_block);
            //select new element
            if (parArr.length == 0) {
                selectBlock(parent);
            } else if (selfIdx >= parArr.length) {
                selectBlock(parArr.at(-1)); // we were last so select last
            } else {
                selectBlock(parArr[selfIdx]);
            }
        }
    } else if (e.key == ' ' || e.key == 'Space') {
        if (selected_block) selected_block.collapseTogle();
    } else {
        cancelEvent = false;
    }
    if (cancelEvent) {
        e.preventDefault();
        e.stopImmediatePropagation();
    }
// console.log("BLOCKS:",e);
});
let showEditorToolbar = false;
contextmenuHandlers["block"] = (target)=>{
    if (!target) return null;
    let blockId_el = target.closest('[data-b-id]');
    if (!blockId_el) return null;
    let blockVisual = el_to_BlockVis.get(blockId_el);
    if (!blockVisual) return null;
    let blockId = blockVisual.blockId;
    let block = _BLOCKS[blockId];
    if (!block) return null;
    return [
        [
            "Copy id",
            ()=>{
                navigator.clipboard.writeText(blockId);
            }
        ],
        [
            "Collapse/Expand",
            ()=>blockVisual.collapseTogle()
        ],
        [
            "Tags",
            ()=>TAGGER.toggleVisible(true, blockVisual),
            {
                tooltip: "Open tag manager for this block."
            }
        ],
        [
            "Toggle toolbar",
            ()=>{
                showEditorToolbar = !showEditorToolbar;
            }
        ],
        [
            "PageView this",
            ()=>view.openPage(block.id)
        ],
        [
            "GetText as json",
            ()=>alert(JSON.stringify(block.text)),
            {
                tooltip: "See text of this block as json."
            }
        ],
        [
            "GetText",
            ()=>alert(blockVisual.editor.getText()),
            {
                tooltip: "See text of this block."
            }
        ],
        [
            "Delete (!!)",
            ()=>blockVisual.DeleteBlock(true),
            {
                tooltip: "Delete this instance.</br>Other references to this block wont be deleted.",
                classMod: (c)=>c.replace('btn-outline-light', 'btn-outline-danger')
            }
        ],
        [
            "Delete all copies (!!)",
            ()=>blockVisual.DeleteBlockEverywhere(true),
            {
                tooltip: "Delete any and all copies of this block.",
                classMod: (c)=>c.replace('btn-outline-light', 'btn-outline-danger')
            }
        ]
    ];
};
contextmenuHandlers["block-editor"] = (target)=>{
    if (inTextEditMode) return null;
    return contextmenuHandlers["block"](target);
};
// RegClass(Delta);
class Block_Visual {
    blockId;
    children;
    collapsed;
    // html elements:
    el;
    editor;
    childrenHolderEl;
    finished;
    editor_inner_el() {
        // return this.editor.e; // TinyMDE
        return this.editor.root; //Quill.js
    //return this.el.querySelector('.editor > .ql-editor')! as HTMLElement | null; // Quill.js
    }
    editor_firstEl() {
        let arrayOrLeaf = this.editor.getLeaf(0);
        let node = null;
        if (Array.isArray(arrayOrLeaf)) node = arrayOrLeaf[0].domNode; // domNode returns text node instead of <p>
        else node = arrayOrLeaf.domNode; // domNode returns text node instead of <p>
        while(node?.nodeType == Node.TEXT_NODE)node = node.parentNode;
        return node;
    }
    constructor(b, parentElement, collapsed = true){
        this.blockId = b.id;
        this.children = [];
        this.collapsed = collapsed;
        this.finished = false;
        this.el = LEEJS.div({
            class: "block",
            $bind: b,
            $bindEvents: b,
            "data-b-id": b.id,
            tabindex: "-1",
            "data-contextmenu": "block"
        }, [
            LEEJS.div(LEEJS.$I`editor`, {
                "data-contextmenu": "block-editor"
            }),
            LEEJS.div(LEEJS.$I`children`)
        ])(parentElement ?? STATIC.blocks);
        el_to_BlockVis.set(this.el, this);
        this.childrenHolderEl = this.el.querySelector('.children');
        this.editor = new Quill(this.el.querySelector('.editor'), {
            modules: {
                //   toolbar: true,
                toolbar: [
                    [
                        {
                            header: [
                                1,
                                2,
                                false
                            ]
                        }
                    ],
                    [
                        "bold",
                        "italic",
                        "underline"
                    ],
                    [
                        "image",
                        "video"
                    ]
                ],
                blotFormatter2: {
                    //     align: {
                    //       allowAligning: true,
                    //     },
                    video: {
                        registerCustomVideoBlot: true
                    },
                    resize: {
                        //       allowResizing: true,
                        useRelativeSize: true,
                        allowResizeModeChange: true,
                        imageOversizeProtection: true
                    },
                    //     delete: {
                    //       allowKeyboardDelete: true,
                    //     },
                    image: {
                        //       allowAltTitleEdit: true,
                        registerImageTitleBlot: true,
                        allowCompressor: true,
                        compressorOptions: {
                            jpegQuality: 0.7,
                            maxWidth: 1000
                        }
                    }
                }
            },
            placeholder: "",
            theme: 'snow'
        });
        let toolbar = this.editor.getModule('toolbar');
        toolbar.addHandler('attachment', ()=>{
            const range = this.editor.getSelection(true);
            const value = {
                url: "Link",
                text: "text"
            };
            this.editor.insertEmbed(range.index, 'attachment', value);
            this.editor.setSelection(range.index + value.text.length);
        });
        console.log(toolbar);
        if (typeof b.text == 'string') this.editor.setText(b.text);
        else this.editor.setContents(b.text);
        // const value = { url: "getBtn(event.target).style.minHeight='300px';", text: "text" }
        // this.editor.insertEmbed(0, 'lineBtn', value);
        //   new TinyMDE.Editor({ 
        //     editor:this.el.querySelector('.editor')!,
        //     element: this.el, 
        //     content: b.text 
        // });
        // this.editor_inner_el()!.setAttribute("tabindex","-1");
        //   var commandBar = new TinyMDE.CommandBar({
        //     element: "toolbar",
        //     editor: tinyMDE,
        //   });
        this.editor.root.addEventListener('keydown', async (event)=>{
            // Check if the key is an arrow key
            console.log("editor keydown", event);
            const markEventHandled = ()=>{
                ACT.setEvHandled(event);
                console.log("editor keydown MARKED HANDLED");
            //event.stopPropagation(); // Prevent it from bubbling up
            };
            // if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            //   event.stopPropagation(); // Prevent it from bubbling up
            // }
            if (event.key === 'F4') {
                markEventHandled();
                const range = this.editor.getSelection(true);
                if (range) {
                    let id = prompt("Enter Pboard board id:");
                    BLOCKS_assertId(id);
                    const value = {
                        collapsed: true,
                        id: id
                    }; // Default to collapsed
                    this.editor.insertEmbed(range.index, 'inline-pboard-block', value);
                    this.editor.setSelection(range.index /*+ value.text.length*/  + 1); // Move cursor after inserted text
                }
            } else if (event.key === 'F2') {
                markEventHandled();
                const range = this.editor.getSelection(true);
                console.log("F2 pressed", range);
                if (range) {
                    let pre = this.editor.getContents(0, range.index);
                    let aft = this.editor.getContents(range.index);
                    console.log("pre", pre);
                    console.log("aft", aft);
                    let blVis = await NewBlockInside(this.parentOrPage(), this.index() + 1);
                    console.log("New block visual", blVis);
                    blVis.editor.setContents(aft);
                    this.editor.setContents(pre);
                // const value = { collapsed: true, text: "OOGA BOOGA" }; // Default to collapsed
                // this.editor.insertEmbed(range.index, 'expandable', value);
                // this.editor.setSelection(range.index + value.text.length + 1); // Move cursor after inserted text
                }
            } else {
                //dont handle a few shortcuts
                if (event.ctrlKey && event.key === 'Enter') {} else if (event.key === 'Escape') {} else {
                    markEventHandled();
                }
            // if(event.key === 'Tab' || event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight'){
            //     markEventHandled();
            // }
            }
        });
        this.el.addEventListener('focus', async (ev)=>{
            if (ACT.isEvHandled(ev)) return;
            ACT.setEvHandled(ev);
            selectBlock(this);
            ev.stopImmediatePropagation();
            ev.preventDefault();
        });
        // this.editor.e.addEventListener('focus',async (ev:FocusEvent)=>{
        //     if(ACT.isEvHandled(ev)) return;
        //     ACT.setEvHandled(ev);
        //     selectBlock(this);
        //     ev.stopImmediatePropagation();
        //     ev.preventDefault();
        // });
        this.editor_inner_el().addEventListener('click', async (ev)=>{
            if (ACT.isEvHandled(ev)) return;
            // console.error("editor click");
            ACT.setEvHandled(ev);
            //console.log("click e");
            let c = ACT.fn_OnClicked(this.editor_inner_el());
            if (c == ACT.DOUBLE_CLICK) {
                selectBlock(this, true);
            } else selectBlock(this);
        });
        this.el.addEventListener('click', async (ev)=>{
            if (ACT.isEvHandled(ev)) return;
            // console.error("El click");
            ACT.setEvHandled(ev);
            //console.log("click e");
            let c = ACT.fn_OnClicked(this.el);
            if (c == ACT.DOUBLE_CLICK) {
                let xFromLeftEdge = ev.clientX - this.el.getBoundingClientRect().x;
                if (xFromLeftEdge <= 8) {
                    this.collapseTogle();
                }
            // alert("CLICKED");
            // if(ev.x)
            //    selectBlock(this,true);
            }
        //else selectBlock(this);
        });
        this.editor.on('text-change', (e)=>{
            console.log("TEXT_CHANGE ", e);
            //let {content_str,linesDirty_BoolArray} = ev;
            b.text = Object.setPrototypeOf(this.editor.getContents(), Object.prototype); //content_str;
            b.DIRTY();
        });
        this.el.addEventListener('keydown', async (e)=>{
            if (ACT.isEvHandled(e)) return;
            const markEventHandled = ()=>{
                ACT.setEvHandled(e);
                e.preventDefault();
                e.stopImmediatePropagation();
            //e.stopPropagation(); // Prevent it from bubbling up
            };
            console.log("KEYDOWN", e);
            HELP.logCodeHint("Navigation", "Listeners/handlers inside Visual_Block");
            if (e.key == 'Escape') {
                // if(document.activeElement == this.editor.e){
                console.log("ESCAPE block_visual");
                markEventHandled();
                selectBlock(this, false);
            // }else{
            //     selectBlock(null);
            // }
            } else if (e.key == 'Enter') {
                if (e.ctrlKey) {
                    markEventHandled();
                    selectBlock(await NewBlockAfter(this), true);
                } else if (e.shiftKey) {
                    markEventHandled();
                    selectBlock(await NewBlockInside(this), true);
                }
            } else if (e.key == 'T' || e.key == 't') {
                markEventHandled();
                TAGGER.toggleVisible(true, this);
            } else if (e.key == 'Q' || e.key == 'q') {
                markEventHandled();
                openContextMenu(this.el, this.el.clientLeft, this.el.clientTop);
            }
        // console.log(cancelEvent);
        // if(cancelEvent)
        //     {
        //         markEventHandled();
        //         ACT.setEvHandled(e);e.preventDefault();e.stopImmediatePropagation();
        //     }
        });
    }
    _block() {
        return _BLOCKS[this.blockId];
    }
    block() {
        return BLOCKS(this.blockId);
    }
    id() {
        return this.blockId;
    }
    parent() {
        return propagateUpToBlock(this.el.parentElement);
    }
    parentOrPage() {
        const p = this.parent();
        if (p == null) return view;
        return p;
    }
    firstChild() {
        if (this.children.length == 0) return null;
        return this.children[0];
    }
    lastChild() {
        if (this.children.length == 0) return null;
        return this.children.at(-1);
    }
    index() {
        let p = this.parent();
        if (p) return p.children.indexOf(this);
        return view.children.indexOf(this);
    }
    parentChildrenArray() {
        let p = this.parent();
        if (p) return p.children;
        return view.children;
    }
    appendChild(childBV, idx = -1) {
        if (idx < 0) {
            this.children.push(childBV);
            this.childrenHolderEl.appendChild(childBV.el);
        } else {
            this.children.splice(idx, 0, childBV);
            this.childrenHolderEl.insertBefore(childBV.el, this.childrenHolderEl.children.item(idx));
        }
        // this.renderChildren();
        this.updateStyle();
    }
    async deleteChild(childBV) {
        const idx = this.children.indexOf(childBV);
        if (idx >= 0) {
            this.children[idx].deleteSelf();
            BlkFn.DeleteBlockOnce(childBV.blockId);
            this.children.splice(idx, 1);
            let b = await this.block();
            b.children.splice(idx, 1);
            b.DIRTY();
            this.renderChildren();
        }
        if (selected_block == childBV) selectBlock(null);
        this.updateStyle();
        view.updateBlocksById(this.blockId);
    }
    focus(focusEditor = null) {
        if (focusEditor === null) focusEditor = inTextEditMode;
        let el = focusEditor ? this.editor : this.el;
        /*
        Check if currently active element is already "el" or some child of el. If so, return.
        Else, blur currently active, and focus to el instead.
        */ console.log("FOCUS", el);
        if (document.activeElement) {
            if (document.activeElement == el) return;
            if (this.el.contains(document.activeElement)) {
                // is textbox selected?
                if (this.editor_inner_el().contains(document.activeElement)) {
                    if (inTextEditMode) {
                        return; // its ok to select it
                    } else {} // blur it!
                }
            }
            document.activeElement.blur();
        }
        // el.dispatchEvent(new FocusEvent("focus"));
        // console.error("FOCUSING ",el);
        el.focus();
    }
    deleteSelf() {
        el_to_BlockVis.delete(this.el);
        this.el.parentElement?.removeChild(this.el);
    }
    async DeleteBlock(doConfirm = true) {
        if (doConfirm && !confirm(`Delete block?`)) return;
        await BlkFn.DeleteBlockOnce(this.blockId);
        //TODO: update all copies of this block.
        this.deleteSelf();
    }
    async DeleteBlockEverywhere(doConfirm = true) {
        if (doConfirm && !confirm(`Delete block everywhere?\nThis will delete ALL instances of this block, everywhere (embeded).`)) return;
        await BlkFn.DeleteBlockEverywhere(this.blockId);
        //TODO: update all copies of this block.
        this.deleteSelf();
    }
    updateStyle() {
        if (this.collapsed) this.childrenHolderEl.style.display = "none";
        else this.childrenHolderEl.style.display = "inherit";
        if (this._block().children.length == 0) {
            this.el.classList.add("empty");
        } else {
            this.el.classList.remove("empty");
            if (this.collapsed) this.el.classList.add("collapsed");
            else this.el.classList.remove("collapsed");
        }
    }
    async updateAll(maxUncollapseDepth = 999) {
        this.collapsed = (await this.block()).collapsed;
        if (maxUncollapseDepth <= 0) this.collapsed = true;
        await this.renderChildren(maxUncollapseDepth);
        this.updateStyle();
        this.finished = true;
    // if(this.collapsed == false && maxUncollapseDepth>1){
    //     for(let i = 0; i < this.children.length; i++)
    //         await this.children[i].updateAll(maxUncollapseDepth-1);
    // }
    }
    async renderChildren(maxUncollapseDepth = 999) {
        if (this.children.length > 0) {
            this.children.forEach((c)=>c.deleteSelf());
        }
        this.children = [];
        this.childrenHolderEl.innerHTML = "";
        if (this.collapsed == false) {
            let b = await this.block();
            for(let i = 0; i < b.children.length; i++){
                //if(_BLOCKS[b.children[i]]==null) continue; // skip not yet loaded. [TODO] add a button to load more.
                let b2 = await BLOCKS(b.children[i], 2);
                let bv2 = await b2.makeVisual(this.childrenHolderEl, maxUncollapseDepth);
                this.children.push(bv2);
            //await bv2.renderChildren();
            //await makeBlockAndChildrenIfExist(bv2);
            }
        }
    }
    async collapseTogle(setValue = null) {
        // console.error("Toggle ",this.blockId,this.collapsed);
        // console.trace();
        if (setValue !== null) this.collapsed = setValue;
        else this.collapsed = !this.collapsed;
        const b = await this.block();
        if (b.collapsed != this.collapsed) {
            b.collapsed = this.collapsed;
            b.DIRTY();
        }
        // console.error("Toggle2 ",this.blockId,this.collapsed);
        await this.renderChildren();
        this.updateStyle();
    }
}
//######################
// File: client/1View/Modal.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/1View/Modal.ts
//######################
class Html_Modal {
    background_element;
    foreground_element;
    cb_onBgClick;
    cb_onShow;
    cb_onHide;
    constructor(){
        this.background_element = null;
        this.foreground_element = null;
        this.cb_onBgClick = null;
        this.cb_onHide = null;
        this.cb_onShow = null;
    }
    createElements(foregroundElement, parent, opts) {
        if (!parent) parent = document.body;
        this.background_element = LEEJS.div({
            ...opts?.bgId && {
                id: opts.bgId
            },
            class: `${opts?.bgClass ? opts.bgClass : ""} fixed inset-0 bg-black/50 flex items-center justify-center z-50`,
            $click: (e)=>{
                if (e.target == this.background_element) this.onBgClick();
                e.stopImmediatePropagation();
            },
            $keydown: (e)=>{
                e.stopImmediatePropagation();
                if (e.key == "Escape") {
                    this.onBgClick();
                }
            }
        }, this.foreground_element = foregroundElement)(parent);
    }
    onBgClick() {
        if (this.cb_onBgClick) {
            if (this.cb_onBgClick()) return;
        }
        this.hide();
    }
    hide() {
        if (this.cb_onHide) {
            if (this.cb_onHide()) return;
        }
        this.background_element.style.display = "none";
    }
    show() {
        if (this.cb_onShow) {
            if (this.cb_onShow()) return;
        }
        this.background_element.style.display = "";
    }
}
class Searcher {
    visible;
    input;
    finder;
    modal;
    direct;
    recent;
    modeChoice;
    directs;
    recents;
    mode;
    lastSearch;
    constructor(){
        this.visible = true;
        this.directs = [];
        this.recents = [];
        this.mode = 'pages';
        this.lastSearch = null;
        let L = LEEJS;
        this.modal = new Html_Modal();
        this.modal.cb_onBgClick = ()=>{
            this.toggleVisible(false);
        };
        this.modal.createElements(this.finder = L.div({
            class: "finder bg-white p-2"
        } /* rounded-2xl shadow-xl max-w-lg w-full"}*/ , [
            L.div({
                style: `display:flex;alignItems:center;`
            }, [
                this.input = L.input(L.$I`finderSearch.mx-2`, {
                    type: "text",
                    style: `flex:1;`,
                    //$click:(e:MouseEvent)=>{e.stopImmediatePropagation();},
                    $input: (e)=>{
                        this.Search();
                        //TODO 
                        WARN("throttle searches so you cancel previous searches (if unfinished)");
                    },
                    $keydown: async (e)=>{
                        if (e.key == 'ArrowDown') {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            if (this.direct.children.length > 0) this.direct.children[0].focus();
                        } else if (e.key == "Enter") {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            let name = (this.input.value || "").trim();
                            if (this.mode == 'pages') {
                                // await last search, so we can check if there are any exact matches. If so we select it instead of making new.
                                await this.lastSearch;
                                let ids = (await Promise.all(this.directs.map(async (id)=>{
                                    if ((await BLOCKS(id)).pageTitle == name) {
                                        return id;
                                    } else return undefined;
                                }))).filter((s)=>s !== undefined);
                                if (ids.length == 0) {
                                    //no exact matches, make new.
                                    let page = await Block.newPage(name);
                                    view.openPage(page.id);
                                    this.toggleVisible(false);
                                } else if (ids.length == 1) {
                                    //exact match, open existing
                                    view.openPage(ids[0]);
                                }
                            }
                        // else if(this.mode=='tags'){
                        //     TODO("Make new tag and add it to selected_block.");
                        //     let tag = await Tag.new(name);
                        //     let b = selected_block;
                        //     if(b){
                        //         await BlkFn.TagBlock(tag.id,b.blockId);
                        //         //b.tags.push(tag.id);
                        //         //b.DIRTY();
                        //     }
                        //     this.toggleVisible(false);
                        // }else if(this.mode=='blocks'){
                        //     //select first? idk..
                        // }else throw Error("Unknown mode")
                        }
                    }
                })(),
                // make pages default selection
                this.modeChoice = L.select(L.$I`modeChoice.bg-white.mr-2`, {
                    value: 'pages',
                    $change: async (e)=>{
                        let val = this.modeChoice.value;
                        this.mode = val || 'pages';
                        this.Search();
                    }
                }, [
                    L.option({
                        value: "pages"
                    }, "Pages"),
                    L.option({
                        value: "blocks"
                    }, "Blocks"),
                    L.option({
                        value: "tags"
                    }, "Tags"),
                    L.option({
                        value: "tags-local"
                    }, "Tags local"),
                    L.option({
                        value: "pages & global-tags"
                    }, "Pages & global Tags")
                ])()
            ]),
            L.div(L.$I`finderSuggestions`, {
                $bind: this,
                $click: this.__ItemClick.bind(this)
            }, [
                this.direct = L.div(L.$I`direct`, [])(),
                this.recent = L.div(L.$I`recent`, [])()
            ])
        ]), undefined, {
            bgId: "finderBackground"
        });
        this.toggleVisible(false);
    }
    toggleVisible(setValue) {
        if (setValue !== undefined) this.visible = setValue;
        else this.visible = !this.visible;
        // this.background.style.display = this.visible?'block':'none';
        if (this.visible) this.modal.show();
        else this.modal.hide();
        if (this.visible == true) {
            this.input.value = "";
            this.input.focus();
            this.Search();
        } else {
            selectBlock(selected_block);
        }
    }
    async makeItem(id) {
        let L = LEEJS;
        let name = "<:NONAME:>";
        let isBlock = true;
        if (_BLOCKS[id] === undefined) {
            isBlock = false;
            name = await _TAGS[id].getName();
        } else {
            if (_BLOCKS[id].pageTitle) name = _BLOCKS[id].pageTitle;
        }
        return L.div(name, {
            "data-id": id,
            "data-isBlock": isBlock.toString(),
            tabindex: -1
        })();
    }
    Search() {
        return this.lastSearch = (async ()=>{
            let last = this.input.value.trim();
            // if(last.indexOf(',')!=-1)
            //     last = last.split(',').at(-1)!.trim();
            // if(last == "") return;
            if (this.mode == null || this.mode == 'pages') {
                this.directs = [];
                this.directs.push(...await BlkFn.SearchPages(last, 'includes'));
            } else if (this.mode == 'tags') {
                this.directs = [];
                this.directs.push(...await BlkFn.SearchTags(last, 'includes'));
            } else if (this.mode == 'pages & global-tags') {
                this.directs = [];
                this.directs.push(...await BlkFn.SearchPages(last, 'includes'));
                this.directs.push(...await BlkFn.SearchTags(last, 'includes'));
            } else {
                this.directs = [];
                this.recents = [];
            }
            this.direct.innerHTML = "";
            this.direct.append(...await Promise.all(this.directs.map((id)=>this.makeItem(id))));
        // this.directs = TAGS.filter(t=>t.name.includes(this.input.value));
        })();
    }
    // async Submit(){
    //     let items = this.input.value.trim().split(',').map(v=>v.trim());
    //     if(this.mode[0]==SearcherMode.__at0_pages){
    //     }else if(this.mode[0]==SearcherMode.__at0_tags){
    //     }
    // }
    // AddRecent(){
    // }
    // ItemSelected(){
    // }
    __ItemClick(event) {
        let item = event.target;
        if (item.hasAttribute('data-id') == false) return; // in case finderSuggestions element was clicked.
        if (item == this.recent || item == this.direct) return;
        let isBlock = item.getAttribute('data-isBlock') == 'true';
        let id = item.getAttribute('data-id');
        view.openPage(id);
        this.toggleVisible(false);
    }
}
class SearchStatistics {
    maxRecents;
    recentlySearched_Pages;
    recentlySearched_Tags;
    recentlyVisited_Pages;
    recentlyAdded_Tags;
    constructor(){
        this.maxRecents = 20;
        this.recentlySearched_Pages = [];
        this.recentlySearched_Tags = [];
        this.recentlyVisited_Pages = [];
        this.recentlyAdded_Tags = [];
    }
    DIRTY() {
        DIRTY.mark("SEARCH_STATISTICS");
    }
    push_list(list, id_name) {
        list.splice(0, 0, id_name); // add as first
        if (list.length > this.maxRecents) list.splice(this.maxRecents, list.length - this.maxRecents);
        this.DIRTY();
    }
    async recentlySearched_Pages_push(id) {
        this.push_list(this.recentlySearched_Pages, [
            id,
            (await BLOCKS(id)).pageTitle
        ]);
    }
    async recentlySearched_Tags_push(id) {
        this.push_list(this.recentlySearched_Tags, [
            id,
            await (await TAGS(id)).getName()
        ]);
    }
    async recentlyVisited_Pages_push(id) {
        this.push_list(this.recentlyVisited_Pages, [
            id,
            (await BLOCKS(id)).pageTitle
        ]);
    }
    async recentlyAdded_Tags_push(id) {
        this.push_list(this.recentlyAdded_Tags, [
            id,
            await (await TAGS(id)).getName()
        ]);
    }
}
RegClass(SearchStatistics);
class Tagger {
    visible;
    input;
    tags;
    finder;
    modal;
    direct;
    recent;
    modeChoice;
    directs;
    recents;
    mode;
    lastSearch;
    selected_block_visual;
    constructor(){
        this.visible = true;
        this.directs = [];
        this.recents = [];
        this.mode = 'tags';
        let L = LEEJS;
        this.lastSearch = null;
        this.selected_block_visual = null;
        this.modal = new Html_Modal();
        this.modal.cb_onBgClick = ()=>{
            this.toggleVisible(false);
        };
        this.modal.createElements(this.finder = L.div({
            class: "finder bg-white p-2"
        } /* rounded-2xl shadow-xl max-w-lg w-full"}*/ , [
            L.div({
                style: `display:flex;alignItems:center;`
            }, [
                this.input = L.input(L.$I`finderSearch.mx-2`, {
                    type: "text",
                    style: `flex:1;`,
                    $input: (e)=>{
                        this.Search();
                        //TODO 
                        WARN("throttle searches so you cancel previous searches (if unfinished)");
                    },
                    //L.div(L.$I`finderSearch.mx-2`,{style:`flex:1;`,
                    $keydown: async (e)=>{
                        if (e.key == 'ArrowDown') {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            if (this.direct.children.length > 0) this.direct.children[0].focus();
                        } else if (e.key == "Enter") {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            let name = (this.input.value || "").trim();
                            if (this.mode == 'tags') {
                                await this.lastSearch;
                                let ids = (await Promise.all(this.directs.map(async (id)=>{
                                    if (await _TAGS[id].getName() == name) {
                                        return id;
                                    } else return undefined;
                                }))).filter((s)=>s !== undefined);
                                let tagId = null;
                                if (ids.length == 0) {
                                    //no exact matches, make new.
                                    tagId = (await Tag.new(name)).id;
                                } else if (ids.length == 1) {
                                    //exact match, open existing
                                    tagId = ids[0];
                                } else {
                                    throw Error("Multiple same name tags found:" + ids.toString());
                                }
                                await this.addTag(tagId);
                                this.input.value = "";
                                this.input.focus();
                                await this.loadExistingTags();
                            //this.toggleVisible(false);
                            } else throw Error("Unknown mode");
                        }
                    }
                })(),
                // make pages default selection
                this.modeChoice = L.select(L.$I`modeChoice.bg-white.mr-2`, {
                    value: 'tags',
                    $change: async (e)=>{
                        let val = this.modeChoice.value;
                        this.mode = val || 'tags';
                        this.Search();
                    }
                }, [
                    L.option({
                        value: "tags"
                    }, "Tags"),
                    L.option({
                        value: "tags-local"
                    }, "Tags local")
                ])()
            ]),
            this.tags = L.div()(),
            L.div(L.$I`finderSuggestions`, {
                $bind: this,
                $click: this.__ItemClick.bind(this)
            }, [
                this.direct = L.div(L.$I`direct`, [])(),
                this.recent = L.div(L.$I`recent`, [])()
            ])
        ])(), undefined, {
            bgId: "taggerBackground"
        });
        /*
        this.input = new Quill(this.finder.querySelector('.finderSearch'),
                        {modules:{toolbar:false},placeholder:"",theme:'snow'});
        
        //$click:(e:MouseEvent)=>{e.stopImmediatePropagation();},
        let waitForSelectionChange = false; // first character 
        let text = "";
        
        this.input.on('editor-change',async (eventName:string, ...args:any)=>{
            console.log(eventName,args[2]);
            if(args[2]=='api'||args[1]=='api') return;    
            if(eventName=='selection-change' && waitForSelectionChange){
                waitForSelectionChange = false;
                console.warn("SEL UPD",`'${text}'`,this.input.getSelection());
                let selection = this.input.getSelection();

                // all whitespace to spaces 
                // text = text.replace(/\s+/g,' ');

                console.warn("SEL UPD2",`'${text}'`,this.input.getSelection());
                await this.updateQuill(text);
                if(selection) this.input.setSelection(selection,'api');
                this.Search();
            }else if(eventName=='text-change'){
                waitForSelectionChange = true;
                text = this.input.getText().replace(/\s+/g,' ');
                console.warn(text);
            }
            //TODO 
            WARN("throttle searches so you cancel previous searches (if unfinished)");
        });
        */ this.toggleVisible(false);
    }
    async loadExistingTags() {
        let tags = await this.getExistingTags();
        let newTagBtn = (name, id)=>LEEJS.div({
                $click: async (e)=>{
                    //remove this tag..
                    if (!confirm("You want to remove tag " + name + " ?")) return;
                    await BlkFn.RemoveTagFromBlock((await this.getBlock()).id, id);
                    await this.loadExistingTags();
                },
                style: "margin:3px;display:inline-block;background-color:lightblue;padding:3px;",
                "data-id": id
            }, name);
        this.tags.innerHTML = "";
        tags.forEach((t)=>newTagBtn(t.name, t.tag.id)(this.tags));
    }
    async getExistingTags() {
        let b = await this.getBlock();
        let namePromises = [];
        let existingTags = (await Promise.all(b.tags.map((tId)=>TAGS(tId)))).map((tag, i)=>(namePromises[i] = tag.getName(), {
                tag: tag,
                name: ""
            }));
        //now that they are all finished, we can assign awaited promises to .name
        for(let i = 0; i < existingTags.length; i++){
            existingTags[i].name = await namePromises[i];
        }
        return existingTags;
    }
    /*
    async tags_to_string(tagIds:Id[]):Promise<string>{
        return (await Promise.all(
            (await Promise.all(tagIds.map(tId=>TAGS(tId)))).map(tag=>tag.getName())
        )).join('  ');
    }
    */ async getBlock() {
        return await BLOCKS(this.selected_block_visual.blockId);
    }
    /*
    async updateQuill(tagsString:string){
        let existingTags = await this.getExistingTags();

        // let tagNames:string[] = []; //tagsString.trim().split(' ').map(v=>v.trim()).filter(s=>s);
        
        
        let delta :any[] = [];
        //delta.push({insert:tagNames[i], attributes:{color:'green'}});
        const insert=(name:string,color:string,tooltip:string)=>delta.push({
            insert: name, attributes:{  color }
          });
        
        
        let curName = "";
        let curSpaces = "";
        const addName = async ()=>{
            if(curName.trim().length==0)
                return;

            let tags = await BlkFn.SearchTags(curName,'exact');
            if(tags.length==0){
                insert(curName,"green","This will make a new tag.");
            }else{
                //tag already exists. Is it already on the block?
                let tagId = tags[0];
                let alreadyExists = existingTags.find(et=>et.tag.id==tagId);
                if(alreadyExists){
                    insert(curName,"white","Block already tagged with this tag.");
                }else{
                    insert(curName,"blue","This tag exists but is not on this block (will be added).");
                }
            }

            curName = "";
        };
        const addSpaces = ()=>{
            if(curSpaces.length==0)
                return;
            delta.push({insert: curSpaces});
            curSpaces = "";
        };
        for(let i = 0; i < tagsString.length; i++){
            if(tagsString[i]==' '){
                await addName();
                curSpaces+=' ';    
            }
            else{
                addSpaces();
                curName+=tagsString[i];
            }
        }
        await addName();
        addSpaces();
            

        //let tags:Id[][] = await Promise.all(tagNames.map(tn=>BlkFn.SearchTags(tn,'exact')));
        // for(let i = 0; i < tagNames.length; i++){
        //     if(tags[i].length==0){
        //         insert(tagNames[i],"green","This will make a new tag.");
        //     }else{
        //         //tag already exists. Is it already on the block?
        //         let tagId = tags[i][0];
        //         let alreadyExists = existingTags.find(et=>et.tag.id==tagId);
        //         if(alreadyExists){
        //             insert(tagNames[i],"white","Block already tagged with this tag.");
        //         }else{
        //             insert(tagNames[i],"blue","This tag exists but is not on this block (will be added).");
        //         }
        //     }
        //     // delta.push({insert:tagNames[i], attributes:{color:'green'}});
        // }
        // return delta;
        console.warn(delta);
        this.input.setContents(delta,'silent');
    }
*/ async makeNewTag(tagName) {
        if (!prompt(`Make new tag '${tagName}'?`)) return;
        if (prompt("Global (or local)?")) {
            Tag.new(tagName);
        } else {
            throw Error("Making local tags not implemented.");
        }
    }
    async toggleVisible(setValue, selected_block2) {
        if (setValue !== undefined) this.visible = setValue;
        else this.visible = !this.visible;
        this.selected_block_visual = selected_block2 ?? null;
        // this.background.style.display = this.visible?'block':'none';
        if (this.visible) this.modal.show();
        else this.modal.hide();
        if (this.visible == true) {
            if (this.selected_block_visual == null) throw Error("Toggling tagger on null selected block?");
            //let b = await BLOCKS(this.selected_block_visual!.blockId);
            //await this.updateQuill(await this.tags_to_string(b.tags));
            await this.loadExistingTags();
            this.input.value = "";
            this.input.focus();
            //this.input.setSelection(99999);
            this.Search();
        } else {
            selectBlock(selected_block);
        }
    }
    async addTag(tagId) {
        let b = await this.getBlock();
        console.warn(b, b.id);
        if (b) {
            await BlkFn.TagBlock(tagId, b.id);
        //b.tags.push(tag.id);
        //b.DIRTY();
        }
    }
    async makeItem(id) {
        let L = LEEJS;
        let name = "<:NONAME:>";
        let isBlock = true;
        if (_BLOCKS[id] === undefined) {
            isBlock = false;
            name = await _TAGS[id].getName();
        } else {
            if (_BLOCKS[id].pageTitle) name = _BLOCKS[id].pageTitle;
        }
        return L.div(name, {
            "data-id": id,
            "data-isBlock": isBlock.toString(),
            tabindex: -1
        })();
    }
    Search() {
        return this.lastSearch = (async ()=>{
            let last = this.input.value.trim();
            if (last.indexOf(',') != -1) last = last.split(',').at(-1).trim();
            // if(last == "") return;
            if (this.mode == 'tags') {
                this.directs = [];
                this.directs.push(...await BlkFn.SearchTags(last, 'includes'));
            } else {
                this.directs = [];
                this.recents = [];
            }
            this.direct.innerHTML = "";
            this.direct.append(...await Promise.all(this.directs.map((id)=>this.makeItem(id))));
        // this.directs = TAGS.filter(t=>t.name.includes(this.input.value));
        })();
    }
    // async Submit(){
    //     let items = this.input.value.trim().split(',').map(v=>v.trim());
    //     if(this.mode[0]==SearcherMode.__at0_pages){
    //     }else if(this.mode[0]==SearcherMode.__at0_tags){
    //     }
    // }
    // AddRecent(){
    // }
    // ItemSelected(){
    // }
    async __ItemClick(event) {
        let item = event.target;
        if (item.hasAttribute('data-id') == false) return; // in case finderSuggestions element was clicked.
        if (item == this.recent || item == this.direct) return;
        let isBlock = item.getAttribute('data-isBlock') == 'true';
        let id = item.getAttribute('data-id');
        await this.addTag(id);
        this.input.value = "";
        this.input.focus();
        this.loadExistingTags();
        this.Search();
    //this.toggleVisible(false);
    }
}
//######################
// File: client/3/1client.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/3/1client.ts
//######################
var PROJECT = new ProjectClass();
var SEARCHER = new Searcher();
var SEARCH_STATISTICS = new SearchStatistics();
var TAGGER = new Tagger();
var PAGES = {}; //all pages
var _BLOCKS = {}; // all blocks
function BLOCKS_assertId(id) {
    if (typeof id != 'string') throw Error(`Invalid (typeof != string) Block id ${id}`);
    if (_BLOCKS[id] === undefined) throw Error(`Invalid (non existant) Block id ${id}`);
    return id;
}
async function BLOCKS(id, depth = 1) {
    BLOCKS_assertId(id);
    if (_BLOCKS[id] === null) await loadBlock(id, depth);
    return _BLOCKS[id];
}
var _TAGS = {}; // all tags
function TAGS_assertId(id) {
    if (typeof id != 'string') throw Error(`Invalid (typeof != string) Tag id ${id}`);
    if (_TAGS[id] === undefined) throw Error(`Invalid (non existant) Tag id ${id}`);
    return id;
}
async function TAGS(id, depth = 1) {
    TAGS_assertId(id);
    if (_TAGS[id] === null) await loadTag(id, depth);
    return _TAGS[id];
}
let autosaveInterval = null;
///////////////////////////////////////////////////////////
async function rpc(code, ...fnArgs) {
    console.log("rpc:", code, fnArgs);
    if (typeof code == 'function') code = `(${code}).apply(null,__Deserialize(${JSON_Serialize(fnArgs)}));`;
    else if (typeof code == 'string') {
        code = `(${code}).apply(null,__Deserialize(${JSON_Serialize(fnArgs)}));`;
    }
    console.log("rpc after:", code);
    const resp = await CMsg_eval({
        code
    });
    console.log("rpc resp:", resp);
    throwIf(resp);
    return resp;
}
function throwIf(obj) {
    if (obj instanceof Error) {
        throw obj;
    }
}
async function LoadInitial() {
    /*
    Load:  PROJECT , SEARCH_STATISTICS , PAGES
    all ids for:  _BLOCKS, _TAGS
    on demand objects for: _BLOCKS, _TAGS.
    */ const resp = await CMsg_loadInitial(null);
    console.log("LOAD INITIAL:", resp);
    if (resp instanceof Error) throw resp;
    else if (resp === false) {} else {
        //let json = resp;//__Deserialize(resp);
        PAGES = JSON_Deserialize(resp.PAGES);
        SEARCH_STATISTICS = JSON_Deserialize(resp.SEARCH_STATISTICS);
        PROJECT = JSON_Deserialize(resp.PROJECT);
        _BLOCKS = {};
        // console.log("LOAD INITIAL:",JSON.stringify(resp.ids_BLOCKS));
        resp.ids_BLOCKS.forEach((id)=>_BLOCKS[id] = null);
        _TAGS = {};
        resp.ids_TAGS.forEach((id)=>_TAGS[id] = null);
        console.log("LOAD INITIAL OVER:", PAGES, SEARCH_STATISTICS, PROJECT);
    // console.log("LOAD INITIAL _BLOCKS:",JSON.stringify(_BLOCKS));
    }
}
window.onbeforeunload = function() {
    if (DIRTY._.length > 0) {
        SaveAll();
        return 'There is unsaved data.';
    }
    return undefined;
};
async function SaveAll() {
    //    Server.sendMsg({n:Server.MsgType.saveAll,d:{TAGS:_TAGS,BLOCKS:_BLOCKS}});
    if (DIRTY._.length == 0 || DIRTY.error !== null) {
        if (DIRTY.error) throw DIRTY.error;
        return;
    }
    // send to server all dirty objects.
    // most importantly also send the ""
    const oldHash = PROJECT.running_change_hash;
    if (oldHash == new ProjectClass().running_change_hash) {
        SEARCH_STATISTICS.DIRTY();
        PROJECT.DIRTY();
        DIRTY.mark("PAGES");
    // console.error("Initial save.");
    // console.error(JSON.stringify(DIRTY._))
    }
    const newHash = PROJECT.genChangeHash();
    //let packet : TMsg_saveAll_C2S["d"] = {hash:oldChangeHash,data:[]};
    let packet = [];
    for(let i = DIRTY._.length - 1; i >= 0; i--){
        const p = DIRTY._[i];
        // console.error(p);
        if (p[2]) {
            packet.push({
                path: [
                    p[0],
                    p[1]
                ],
                deleted: true
            });
        } else {
            let evalStr = DIRTY.evalStringResolve(p[0], p[1]);
            try {
                packet.push({
                    path: [
                        p[0],
                        p[1]
                    ],
                    data: JSON_Serialize(eval(evalStr))
                });
            } catch (e) {
                DIRTY.error = e;
                throw e;
            }
        }
        DIRTY._.splice(i, 1);
    }
    const resp = await CMsg_saveAll({
        hash: oldHash,
        newHash,
        data: packet
    });
    if (resp instanceof Error) {
        DIRTY.error = resp;
        throw resp; // !!!!!!!!!!!!!!
    }
}
async function Backup() {
    let r = await CMsg_backup(null);
    throwIf(r);
}
async function loadBlock(blockId, depth) {
    // path = AttrPath.parse(path);
    console.log("Loading block:", blockId);
    let newBLOCKS_partial = await CMsg_loadBlock({
        id: blockId,
        depth
    }); //rpc(`client_loadBlock`,blockId,depth);
    //throwIf(newBLOCKS_partial);
    if (newBLOCKS_partial instanceof Error) {
        throw newBLOCKS_partial;
    } else for(let key in newBLOCKS_partial){
        console.log("Loading block id:", key);
        _BLOCKS[key] = JSON_Deserialize(newBLOCKS_partial[key]);
        console.info("Loaded block: ", key, _BLOCKS[key]);
    }
}
async function loadTag(blockId, depth) {
    // TODO("LoadTag");
    // path = AttrPath.parse(path);
    console.log("Loading tag:", blockId);
    let newBLOCKS_partial = await CMsg_loadTag({
        id: blockId,
        depth
    }); //await rpc(`client_loadBlock`,blockId,depth);
    //throwIf(newBLOCKS_partial);
    if (newBLOCKS_partial instanceof Error) {
        throw newBLOCKS_partial;
    } else for(let key in newBLOCKS_partial){
        console.log("Loading tag id:", key);
        _TAGS[key] = JSON_Deserialize(newBLOCKS_partial[key]);
    }
}
class Block {
    static _serializable_default = {
        text: "",
        children: [],
        tags: [],
        attribs: {},
        refCount: 1,
        collapsed: false
    };
    id;
    refCount;
    pageTitle;
    text;
    children;
    tags;
    attribs;
    collapsed;
    constructor(){
        this.id = "";
        this.text = "";
        this.refCount = 1;
        this.children = [];
        this.tags = [];
        this.attribs = {};
        this.collapsed = false;
    }
    DIRTY() {
        this.validate();
        DIRTY.mark("_BLOCKS", this.id);
    }
    DIRTY_deleted() {
        DIRTY.mark("_BLOCKS", this.id, true);
    }
    static DIRTY_deletedS(id) {
        DIRTY.mark("_BLOCKS", id, true);
    }
    validate() {}
    static async new(text = "", waitServerSave = true) {
        let b = new Block();
        _BLOCKS[b.id = PROJECT.genId()] = b;
        b.text = text;
        b.DIRTY();
        if (waitServerSave) await SaveAll();
        return b;
    }
    static async newPage(title = "", waitServerSave = true) {
        let b = new Block();
        _BLOCKS[b.id = PROJECT.genId()] = b;
        PAGES[b.id] = true;
        DIRTY.mark("PAGES");
        b.pageTitle = title;
        b.DIRTY();
        if (waitServerSave) await SaveAll();
        return b;
    }
    async makeVisual(parentElement, maxUncollapseDepth = 999) {
        let bv = new Block_Visual(this, parentElement, this.collapsed); // ignore collapsed since we will call updateAll anyways.
        await bv.updateAll(maxUncollapseDepth);
        return bv;
    }
}
RegClass(Block);
//######################
// File: client/3/3Tag.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/3/3Tag.ts
//######################
class Tag {
    static _serializable_default = {
        attribs: {},
        parentTagId: "",
        childrenTags: []
    };
    id;
    name;
    rootBlock;
    parentTagId;
    childrenTags;
    blocks;
    attribs;
    constructor(){
        this.id = "";
        this.name = "";
        this.parentTagId = "";
        this.childrenTags = [];
        this.blocks = [];
        this.attribs = {};
    }
    async getName() {
        if (this.name != null) return this.name;
        if (this.rootBlock === undefined) throw Error(`Tag ${this.id} has no name or rootBlock. Cant getName().`);
        let name = (await BLOCKS(this.rootBlock)).pageTitle;
        if (name == null) throw Error(`Tag ${this.id} has rootBlock ${this.rootBlock} but it has null pageTitle. Cant getName().`);
        return name;
    }
    DIRTY() {
        this.validate();
        DIRTY.mark("_TAGS", this.id);
    }
    DIRTY_deleted() {
        DIRTY.mark("_TAGS", this.id, true);
    }
    static DIRTY_deletedS(id) {
        DIRTY.mark("_TAGS", id, true);
    }
    validate() {
        if (this.name == null) assert_non_null(this.rootBlock, "Tag with null name must be based on a block.");
    }
    static async new(name, parentTagId = "", waitServerSave = true) {
        let t = new Tag();
        let parent = null;
        if (parentTagId != "") {
            parent = await TAGS(parentTagId);
            if (!parent) throw new Error(`Invalid parent: #${parentTagId} not found`);
        }
        _TAGS[t.id = PROJECT.genId()] = t;
        t.name = name;
        if (parentTagId != "") {
            t.parentTagId = parentTagId;
            parent.childrenTags.push(t.id);
        }
        t.DIRTY();
        if (waitServerSave) await SaveAll();
        return t;
    }
}
RegClass(Tag);
//######################
// File: client/3/99init.ts
// Path: file:///data/_Projects/pboardNotes_latest/src/client/3/99init.ts
//######################
setTimeout(async function InitialOpen() {
    await LoadInitial();
    autosaveInterval = setInterval(()=>{
        SaveAll();
        if (view.pageId) view.setDocumentURI();
    }, 5000);
    if (Object.keys(PAGES).length == 0) {
        let pageName = prompt("No pages exist. Enter a new page name:"); // || "";
        if (pageName == null) {
            window.location.reload();
            return;
        }
        let p = await Block.newPage(pageName);
        await view.openPage(p.id);
    } else {
        let loadedPageId = view.getDocumentURI();
        if (loadedPageId) {
            await view.openPage(view.pageId);
        } else {
            let pages = (await BlkFn.SearchPages("", "includes")).map((id)=>"\n" + _BLOCKS[id]?.pageTitle);
            let pageName = prompt("No page open. Enter page name (must be exact):" + pages); // || "";
            let srch;
            //[TODO] use searcher, not this prompt.
            if (pageName == null || (srch = await BlkFn.SearchPages(pageName, 'includes')).length < 1) {
                // console.error(srch);
                window.location.reload();
                return;
            }
            await view.openPage(srch[0]);
        }
    }
}, 1);

