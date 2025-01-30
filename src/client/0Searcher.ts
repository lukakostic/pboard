
declare var LEEJS : any;

const SearcherMode = {
    __at0_pages:1, // [0]1 = pages
    __at0_tags:2,  // [0]2 = tags
    __at1_find:0,  // [1]0 = find
    __at1_add:1,   // [1]1 = add
    pages_find : [1,0],
    tags_find : [2,0],
    tags_add : [2,1]
}
class Searcher {
    visible:boolean;
    input:HTMLInputElement;
    finder:HTMLElement;
    direct:HTMLElement;recent:HTMLElement;

    directs:string[];
    recents:string[];
    mode:  null|any;

    constructor(){
        this.visible = true;
        this.directs = [];
        this.recents = [];
        this.mode = null;
        ///   MakeVisible {
        let L = LEEJS;
        // let inp,direct,recent;
        // div($I`window`,[
          this.finder = L.div(L.$I`finder`,[
            this.input = L.input(L.$I`finderSearch`,{type:"text"})(),
            L.div(L.$I`finderSuggestions`,{
                $bind:this, $click:this.__ItemClick
            },[
                this.direct = L.div(L.$I`direct`,[
                    L.div("Item"),L.div("Item"),L.div("Item"),
                ])(),
                this.recent = L.div(L.$I`recent`,[
                    L.div("Item"),L.div("Item"),
                ])(),
            ])
          ]).a('#finderRoot');
        // ]);
        ///   MakeVisible }

        this.toggleVisible(false);
    }
    toggleVisible(setValue?:boolean){
        if(setValue!==undefined)
            this.visible = setValue;
        else this.visible = !this.visible;
        
        this.finder.style.display = this.visible?'block':'none';
    }
    async Search(){
        let last = this.input.value.trim();
        if(last.indexOf(',')!=-1)
            last = last.split(',').at(-1)!.trim();
        if(this.mode[0]==SearcherMode.__at0_pages){
            this.directs = await BlkFn.SearchPages(last,'includes');
        }else if(this.mode[0]==SearcherMode.__at0_tags){
            this.directs = await BlkFn.SearchTags(last,'includes');
        }
        // this.directs = TAGS.filter(t=>t.name.includes(this.input.value));
    }
    async Submit(){
        let items = this.input.value.trim().split(',').map(v=>v.trim());
        if(this.mode[0]==SearcherMode.__at0_pages){
        
        }else if(this.mode[0]==SearcherMode.__at0_tags){
        
        }
    }
    AddRecent(){

    }
    ItemSelected(){

    }
    __ItemClick(event:MouseEvent){
        let item:HTMLElement = event.target as HTMLElement;
        if(item == this.recent || item == this.direct) return;
        
    }
}
var SEARCHER = (new Searcher());

class SearchStatistics{

    maxRecents : 20;
    recentlySearched_Pages: [Id,string][];
    recentlySearched_Tags: [Id,string][];
    recentlyVisited_Pages: [Id,string][];
    recentlyAdded_Tags: [Id,string][];

    constructor(){
        this.maxRecents = 20; 
        this.recentlySearched_Pages = [];
        this.recentlySearched_Tags = [];
        this.recentlyVisited_Pages = [];
        this.recentlyAdded_Tags = [];
    }

    DIRTY(){DIRTY.mark("SEARCH_STATISTICS");}
        

    
    push_list(list:[Id,string][],id_name:[Id,string]){
        list.splice(0,0,id_name); // add as first
        if(list.length>this.maxRecents) // limit max length
            list.splice(this.maxRecents,list.length-this.maxRecents);
        this.DIRTY();
    }
    async recentlySearched_Pages_push(id:Id){
        this.push_list(this.recentlySearched_Pages,[id,(await BLOCKS(id)).pageTitle!]);
    }
    async recentlySearched_Tags_push(id:Id){
        this.push_list(this.recentlySearched_Tags,[id,(await TAGS(id)).name]);
    }
    async recentlyVisited_Pages_push(id:Id){
        this.push_list(this.recentlyVisited_Pages,[id,(await BLOCKS(id)).pageTitle!]);
    }
    async recentlyAdded_Tags_push(id:Id){
        this.push_list(this.recentlyAdded_Tags,[id,(await TAGS(id)).name]);
    }
}
RegClass(SearchStatistics);