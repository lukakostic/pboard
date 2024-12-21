import { Id } from "../Common.ts";
import { BLOCKS } from "./Blocks.ts";
import { TAGS } from "./Tag.ts";

export let recentlySearched_Pages:Id[] = [];
export let recentlySearched_Tags:Id[] = [];
export let recentlyVisited_Pages:Id[] = [];
export let recentlyAdded_Tags:Id[] = [];
export let maxRecents = 20;

function push_list(list:Id[],id:Id){
    list.splice(0,0,id);
    if(list.length>maxRecents)
        list.splice(maxRecents,list.length-maxRecents);
}
export function recentlySearched_Pages_push(id:Id){
    push_list(recentlySearched_Pages,id);
}
export function recentlySearched_Tags_push(id:Id){
    push_list(recentlySearched_Tags,id);
}
export function recentlyVisited_Pages_push(id:Id){
    push_list(recentlyVisited_Pages,id);
}
export function recentlyAdded_Tags_push(id:Id){
    push_list(recentlyAdded_Tags,id);
}


export function recentlySearched_Pages_getNames(){
    return recentlySearched_Pages.map(id=>[id,BLOCKS[id].pageTitle!]);
}
export function recentlySearched_Tags_getNames(){
    return recentlySearched_Tags.map(id=>[id,TAGS[id].name]);
}
export function recentlyVisited_Pages_getNames(){
    return recentlyVisited_Pages.map(id=>[id,BLOCKS[id].pageTitle!]);
}
export function recentlyAdded_Tags_getNames(){
    return recentlyAdded_Tags.map(id=>[id,TAGS[id].name]);
}
