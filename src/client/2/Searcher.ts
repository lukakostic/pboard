
declare var LEEJS : any;

type SearcherMode = 'pages'|'tags'|'tags-local'|'blocks'|'pages & global-tags';
class Searcher {
    visible:boolean;

    input:HTMLInputElement;
    finder:HTMLElement;
    modal:Html_Modal;
    
    direct:HTMLElement;
    recent:HTMLElement;
    modeChoice:HTMLInputElement;

    directs:string[];
    recents:string[];
    mode:  SearcherMode; //null|any;

    lastSearch : Promise<any>|null;

    constructor(){
        this.visible = true;
        this.directs = [];
        this.recents = [];
        this.mode = 'pages';
        this.lastSearch = null;

        let L = LEEJS;

        this.modal = new Html_Modal();
        this.modal.cb_onBgClick = ()=>{this.toggleVisible(false);}
        this.modal.createElements(
            this.finder = L.div({class:"finder bg-white p-2"}/* rounded-2xl shadow-xl max-w-lg w-full"}*/,[

                L.div({style:`display:flex;alignItems:center;`},[
                
                    this.input = L.input(L.$I`finderSearch.mx-2`,{type:"text",style:`flex:1;`,
                        //$click:(e:MouseEvent)=>{e.stopImmediatePropagation();},
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
                                    // await last search, so we can check if there are any exact matches. If so we select it instead of making new.
                                    await this.lastSearch;
                                    let ids = (await Promise.all(this.directs.map(async id=>{
                                        if(((await BLOCKS(id)).pageTitle) == name){
                                            return id;
                                        }else return undefined;
                                    }))).filter(s=>s!==undefined);
                                    if(ids.length==0){
                                        //no exact matches, make new.
                                        let page = await Block.newPage(name);
                                        view.openPage(page.id);
                                        this.toggleVisible(false);
                                    }else if(ids.length==1){
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
                        },
                    })(),
    
                    // make pages default selection
                    this.modeChoice = L.select(L.$I`modeChoice.bg-white.mr-2`,{//style:`flex:1;`,
                            value:'pages',
                            $change:async (e:Event)=>{
                                let val = this.modeChoice.value as SearcherMode;
                                this.mode = val || 'pages';
                                this.Search();
                            }
                        },[
                            L.option({value:"pages"},"Pages"),
                            L.option({value:"blocks"},"Blocks"),
                            L.option({value:"tags"},"Tags"),
                            L.option({value:"tags-local"},"Tags local"),
                            L.option({value:"pages & global-tags"},"Pages & global Tags"),
                    ])(),
                ]),
                L.div(L.$I`finderSuggestions`,{
                        $bind:this, $click:this.__ItemClick.bind(this)
                    },[ 
                        this.direct = L.div(L.$I`direct`,[
                            // L.div("Item"),L.div("Item"),L.div("Item"),
                        ])(),
                        this.recent = L.div(L.$I`recent`,[
                            // L.div("Item"),L.div("Item"),
                        ])(),
                    ]
                )
              ])
            ,undefined,{bgId:"finderBackground"});


        this.toggleVisible(false);
    }
    toggleVisible(setValue?:boolean){
        if(setValue!==undefined)
            this.visible = setValue;
        else this.visible = !this.visible;
        
        // this.background.style.display = this.visible?'block':'none';
        if(this.visible)
            this.modal.show();
        else
            this.modal.hide();

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
    Search(){
        return (this.lastSearch = (async ()=>{
            let last = this.input.value.trim();
            // if(last.indexOf(',')!=-1)
            //     last = last.split(',').at(-1)!.trim();
            // if(last == "") return;

            if(this.mode == null || this.mode == 'pages'){
                this.directs = [];
                this.directs.push(... (await BlkFn.SearchPages(last,'includes')));
            }else if(this.mode == 'tags'){
                this.directs = [];
                this.directs.push(... (await BlkFn.SearchTags(last,'includes')));
            }else if(this.mode == 'pages & global-tags'){
                this.directs = [];
                this.directs.push(... (await BlkFn.SearchPages(last,'includes')));
                this.directs.push(... (await BlkFn.SearchTags(last,'includes')));
            }else{
                this.directs = [];
                this.recents = [];
            }

            this.direct.innerHTML = "";
            this.direct.append(
                ... (await Promise.all(this.directs.map((id)=>(this.makeItem(id)))))
            );
            // this.directs = TAGS.filter(t=>t.name.includes(this.input.value));
        })());
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
        if(item.hasAttribute('data-id')==false) return; // in case finderSuggestions element was clicked.
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


