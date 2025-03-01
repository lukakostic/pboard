
declare var LEEJS : any;

type SearcherMode = 'pages'|'tags'|'tags-local'|'blocks';
// const SearcherMode = {
//     __at0_pages:1, // [0]1 = pages
//     __at0_tags:2,  // [0]2 = tags
//     __at1_find:0,  // [1]0 = find
//     __at1_add:1,   // [1]1 = add
//     pages_find : [1,0],
//     tags_find : [2,0],
//     tags_add : [2,1]
// }
class Searcher {
    visible:boolean;
    input:HTMLInputElement;
    finder:HTMLElement;
    background:HTMLElement;
    direct:HTMLElement;
    recent:HTMLElement;
    modeChoice:HTMLInputElement;

    directs:string[];
    recents:string[];
    mode:  SearcherMode; //null|any;

    constructor(){
        this.visible = true;
        this.directs = [];
        this.recents = [];
        this.mode = 'pages';
        ///   MakeVisible {
        let L = LEEJS;
        // let inp,direct,recent;
        
        this.background = STATIC._body.querySelector('#finderRoot')!; //L.div(L.$I`window`,[
          this.finder = L.div(L.$I`finder`,[

            L.div({style:`display:flex;alignItems:center;`},[
            
            this.input = L.input(L.$I`finderSearch`,{type:"text",style:`flex:1;`,
                    $click:(e:MouseEvent)=>{e.stopImmediatePropagation();},
                    $input:(e:InputEvent)=>{
                        this.Search();
                        //TODO 
                        WARN("throttle searches so you cancel previous searches (if unfinished)");
                    },
                    $keydown:async (e:KeyboardEvent)=>{
                        if(e.key == 'ArrowDown'){
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            if(this.direct.children.length>0)
                                (this.direct.children[0] as HTMLElement).focus();
                        }else if(e.key=="Enter"){
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            let name = (this.input.value || "").trim();
                            if(this.mode=='pages'){
                                let page = await Block.newPage(name);
                                view.openPage(page.id);
                                this.toggleVisible(false);
                            }else if(this.mode=='tags'){
                                TODO("Make new tag and add it to selected_block.");
                                let tag = await Tag.new(name);
                                let b = selected_block;
                                if(b){
                                    await BlkFn.TagBlock(tag.id,b.blockId);
                                    //b.tags.push(tag.id);
                                    //b.DIRTY();
                                }
                                this.toggleVisible(false);
                            }else if(this.mode=='blocks'){
                                //select first? idk..
                            }else throw Error("Unknown mode")
                        }
                    },
                })(),

                // make pages default selection
            this.modeChoice = L.select(L.$I`modeChoice`,{//style:`flex:1;`,
                    value:'pages',
                    $change:async (e:Event)=>{
                        let val = this.modeChoice.value as SearcherMode;
                        this.mode = val || 'pages';
                        this.Search();
                    }
                },[
                    L.option({value:"pages"},"Pages")(),
                    L.option({value:"blocks"},"Blocks")(),
                    L.option({value:"tags"},"Tags")(),
                    L.option({value:"tags-local"},"Tags local")(),
                ])(),
            ])(),
            L.div(L.$I`finderSuggestions`,{
                $bind:this, $click:this.__ItemClick.bind(this)
            },[ 
                this.direct = L.div(L.$I`direct`,[
                    // L.div("Item"),L.div("Item"),L.div("Item"),
                ])(),
                this.recent = L.div(L.$I`recent`,[
                    // L.div("Item"),L.div("Item"),
                ])(),
            ])()
          ]).a(this.background);
        // ]);
        ///   MakeVisible }

        this.background.setAttribute("style","width: 100%;height: calc(100vh - 8px);background-color: rgba(0, 0, 0, 0.5);position: absolute;");
        this.background.addEventListener('click',(e:MouseEvent)=>{
            if(e.target == this.background)
                this.toggleVisible(false);
            e.stopImmediatePropagation();
            // e.preventDefault();
        });

        this.toggleVisible(false);
    }
    toggleVisible(setValue?:boolean){
        if(setValue!==undefined)
            this.visible = setValue;
        else this.visible = !this.visible;
        
        this.background.style.display = this.visible?'block':'none';

        if(this.visible==true){
            this.input.value = "";
            this.input.focus();
            this.Search();
        }else{
            selectBlock(selected_block);
        }
    }
    async makeItem(id:Id) : Promise<HTMLElement>{
        let L = LEEJS;
        let name = "<:NONAME:>";
        let isBlock = true;
        if(_BLOCKS[id]===undefined){
            isBlock = false;
            name = await (_TAGS[id]!.getName());
        }else{
            if(_BLOCKS[id]!.pageTitle) 
                name = _BLOCKS[id]!.pageTitle;
        }
        return L.div(name,{"data-id":id,"data-isBlock":isBlock.toString(),tabindex:-1})();
    }
    async Search(){
        let last = this.input.value.trim();
        // if(last.indexOf(',')!=-1)
        //     last = last.split(',').at(-1)!.trim();
        // if(last == "") return;

        if(this.mode == null || this.mode == 'pages'){
            this.directs = []
            this.directs.push(... (await BlkFn.SearchPages(last,'includes')));
            //this.directs.push(... (await BlkFn.SearchTags(last,'includes')));
        }
        // else if(this.mode[0]==SearcherMode.__at0_pages){
        //     this.directs = await BlkFn.SearchPages(last,'includes');
        // }else if(this.mode[0]==SearcherMode.__at0_tags){
        //     this.directs = await BlkFn.SearchTags(last,'includes');
        // }

        this.direct.innerHTML = "";
        this.direct.append(
            ... (await Promise.all(this.directs.map((id)=>(this.makeItem(id)))))
        );
        // this.directs = TAGS.filter(t=>t.name.includes(this.input.value));
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
    __ItemClick(event:MouseEvent){
        let item:HTMLElement = event.target as HTMLElement;
        if(item == this.recent || item == this.direct) return;

        let isBlock = item.getAttribute('data-isBlock')=='true';
        let id = item.getAttribute('data-id')!;
        
        view.openPage(id);
        this.toggleVisible(false);
    }
}

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
        this.push_list(this.recentlySearched_Tags,[id,await (await TAGS(id)).getName()]);
    }
    async recentlyVisited_Pages_push(id:Id){
        this.push_list(this.recentlyVisited_Pages,[id,(await BLOCKS(id)).pageTitle!]);
    }
    async recentlyAdded_Tags_push(id:Id){
        this.push_list(this.recentlyAdded_Tags,[id,await (await TAGS(id)).getName()]);
    }
}
RegClass(SearchStatistics);


