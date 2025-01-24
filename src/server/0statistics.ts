
let recentlySearched_Pages:Id[] = [];
let recentlySearched_Tags:Id[] = [];
let recentlyVisited_Pages:Id[] = [];
let recentlyAdded_Tags:Id[] = [];
let maxRecents = 20;

function push_list(list:Id[],id:Id){
    list.splice(0,0,id);
    if(list.length>maxRecents)
        list.splice(maxRecents,list.length-maxRecents);
}
function recentlySearched_Pages_push(id:Id){
    push_list(recentlySearched_Pages,id);
}
function recentlySearched_Tags_push(id:Id){
    push_list(recentlySearched_Tags,id);
}
function recentlyVisited_Pages_push(id:Id){
    push_list(recentlyVisited_Pages,id);
}
function recentlyAdded_Tags_push(id:Id){
    push_list(recentlyAdded_Tags,id);
}


function recentlySearched_Pages_getNames(){
    return recentlySearched_Pages.map(id=>[id,BLOCKS[id].pageTitle!]);
}
function recentlySearched_Tags_getNames(){
    return recentlySearched_Tags.map(id=>[id,TAGS[id].name]);
}
function recentlyVisited_Pages_getNames(){
    return recentlyVisited_Pages.map(id=>[id,BLOCKS[id].pageTitle!]);
}
function recentlyAdded_Tags_getNames(){
    return recentlyAdded_Tags.map(id=>[id,TAGS[id].name]);
}
