// "a.b.c" -> ['a','b','c']
function splitDotPath(attr:DotPath) :string[]{
  if(typeof(attr) == 'string')
    attr = attr.split('/(?<!\\)./').map(e=>e.replace('\\.','.'));  //split by . if not \.  (escaped) , then replace \. -> .
  else attr = [...attr];
  return attr;
}
//get attribute or default, create if necessary
function get(obj :any, attr:string|string[], def? :any, create? :boolean) : undefined|any{
  attr = splitDotPath(attr);
  try{
    while(attr.length!=0){
      var a = attr.pop();
      if(obj[a]===undefined && create===true)
        obj[a] = {};
      obj = obj[a];
      if(def!==undefined && obj===undefined) return def;
    }
    return obj;
  }catch(e){return def;}
}
function set(obj :any, attr:string|string[], value:any, create? :boolean) : undefined|any{
  attr = splitDotPath(attr);
  while(true){
    var a = attr.pop();
    if(obj[a]===undefined && create===true)
      obj[a] = {};
    if(attr.length==0)
      return obj[a] = value;
    else obj = obj[a];
  }
}
//shallow clone + assign
function clone(obj :Object, assign?:Object){
  if(assign!==undefined)
    return Object.assign(Object.assign({},obj),assign);
  else return Object.assign({},obj);
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

declare type BoardId = string;
declare type Brd = string | typeof Board; //id or board obj
declare type BoardType = [number,number];
declare type DotPath = string|string[];

const Type : {[index:string]:BoardType} = {
  Tag : [0,0], //only title
  Text : [1,0], Extension : [1,1], //title and text
  List : [2,0], Project : [2,1], ExtensionPackage : [2,2], //can hold any
  Board : [3,0], //can hold lists only
  
  CUSTOM : [10,0] //anything >= interpeted by extensions.
}

const Board = {
  id : ""             as BoardId,
  type : Type.Text    as BoardType,
  title : "",
  ////////optional/////////
  data : null,
  child : [],
  attr : {},
  tags : [],
  extensions : [],
}


const BOARD_MAIN_PROJ = "__MAIN_P__";
const BOARD_MAIN = "__MAIN__";
const BOARD_TAGS = "__TAGS__"; //non-board tags

var all = {}  as {[index:BoardId]:typeof Board|null}; //id: board|null    //null ako nije ucitano (trazi od servera)

function addB(brd: typeof Board) :void{
  all[brd.id] = brd;
}
function newB(id?:BoardId, assign?:Object) : typeof Board{
  assign ??= {};
  id ??= get(assign,'id') ?? genBoardID();
  return clone(Board, clone(assign,{id:id}) ) as typeof Board;
}
function genBoardID() :string{ //generisi 0-9,a-z,A-Z
  const ID_DEF_LENGTH = 5; //default length generator generates
  while(true){
    var id = "";
    for(var i = ID_DEF_LENGTH; i-->0;)
      id+=("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 62)]);
    if(all[id]===undefined) return id;
  }
}
//return board or id
function B(idBrd:Brd) : typeof Board{
  return ((typeof idBrd == 'string') ? all[idBrd] : idBrd);
}
/////////////////////////////////////////////////////////////////////////////

function reset() :void{
  addB(newB(BOARD_MAIN,{type: Type.List}));
  addB(newB(BOARD_TAGS,{type: Type.List}));
  addB(newB(BOARD_MAIN_PROJ,{type: Type.Project}));
}

/////////////////////////////////////////////////////////////////////////////
//save when board or attribute deleted (so remove board or attribute)
function saveRemoval(id:BoardId, path :DotPath){

}
function save(id:BoardId, path :DotPath, value:any){
  if(path==""){ //saving full board

  }else{ //partial save

  }

}

/*
function render(brd:Brd){
  brd=B(brd);
  var c = createBoardCard();
  c.id(brd.id);
  c.title(brd.title);
  if(brd.type[0] == Type.Text[0])
    c.desc(brd.data); //desc is text
  else
    c.desc(null); //No desc
}
*/