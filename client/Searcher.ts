import { TAGS } from "./Tag.ts";
import { LEEJS } from "./Blocks_Visual.ts";

class Searcher {
    visible:boolean;
    input:HTMLInputElement;
    finder:HTMLElement;
    direct:HTMLElement;recent:HTMLElement;

    directs:string[];
    recents:string[];
    constructor(){
        this.visible = true;
        this.directs = [];
        this.recents = [];

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
    Search(){
        // this.directs = TAGS.filter(t=>t.name.includes(this.input.value));
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
let SEARCHER = (new Searcher());