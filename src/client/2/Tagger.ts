
// type Quill = any;
// declare var Quill : Quill;
declare var LEEJS : any;

type TaggerSearcherMode = 'tags'|'tags-local';
class Tagger {
    visible:boolean;

    input:HTMLInputElement;
    tags:HTMLElement;
    finder:HTMLElement;
    modal:Html_Modal;
    
    direct:HTMLElement;
    recent:HTMLElement;
    modeChoice:HTMLInputElement;

    directs:string[];
    recents:string[];
    mode:  TaggerSearcherMode; //null|any;

    lastSearch : Promise<any>|null;

    selected_block_visual : Block_Visual | null;

    constructor(){
        this.visible = true;
        this.directs = [];
        this.recents = [];
        this.mode = 'tags';
        let L = LEEJS;
        this.lastSearch = null;

        this.selected_block_visual = null;

        this.modal = new Html_Modal();
        this.modal.cb_onBgClick = ()=>{this.toggleVisible(false);}
        this.modal.createElements(
            this.finder = L.div({class:"finder bg-white p-2"}/* rounded-2xl shadow-xl max-w-lg w-full"}*/,[

                L.div({style:`display:flex;alignItems:center;`},[
                    this.input = L.input(L.$I`finderSearch.mx-2`,{type:"text",style:`flex:1;`,                    
                        $input:(e:InputEvent)=>{
                            this.Search();
                            //TODO 
                            WARN("throttle searches so you cancel previous searches (if unfinished)");
                        },
                    //L.div(L.$I`finderSearch.mx-2`,{style:`flex:1;`,
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
                                if(this.mode=='tags'){
                                    await this.lastSearch;
                                    let ids = (await Promise.all(this.directs.map(async id=>{
                                        if((await _TAGS[id]!.getName()) == name){
                                            return id;
                                        }else return undefined;
                                    }))).filter(s=>s!==undefined);
                                    
                                    let tagId :Id|null= null;
                                    if(ids.length==0){
                                        //no exact matches, make new.
                                        tagId = (await Tag.new(name)).id;
                                        
                                    }else if(ids.length==1){
                                        //exact match, open existing
                                        tagId = ids[0];
                                    }else{
                                        throw Error("Multiple same name tags found:"+ids.toString());
                                    }
                                    
                                    await this.addTag(tagId);
                                    this.input.value = "";
                                    this.input.focus();
                                    await this.loadExistingTags();                                    
                                    //this.toggleVisible(false);
                                }else throw Error("Unknown mode");
                            }
                        }})(),
    
                    // make pages default selection
                    this.modeChoice = L.select(L.$I`modeChoice.bg-white.mr-2`,{//style:`flex:1;`,
                            value:'tags',
                            $change:async (e:Event)=>{
                                let val = this.modeChoice.value as TaggerSearcherMode;
                                this.mode = val || 'tags';
                                this.Search();
                            }
                        },[
                            L.option({value:"tags"},"Tags"),
                            L.option({value:"tags-local"},"Tags local"),
                    ])(),
                ]),
                (this.tags = L.div()()),
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
              ])()
            ,undefined,{bgId:"taggerBackground"});
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
        */
        


        this.toggleVisible(false);
    }
    async loadExistingTags(){
        let tags = await this.getExistingTags();
        let newTagBtn = (name:string,id:Id)=>LEEJS.div({$click:async (e:MouseEvent)=>{
                //remove this tag..
                if(!confirm("You want to remove tag "+name+" ?"))return;
                await BlkFn.RemoveTagFromBlock((await this.getBlock()).id,id);                
                await this.loadExistingTags();
            },style:"margin:3px;display:inline-block;background-color:lightblue;padding:3px;","data-id":id},name);
        this.tags.innerHTML = "";
        tags.forEach(t=> newTagBtn(t.name,t.tag.id)(this.tags)  );
    }
    async getExistingTags(){
        let b = await this.getBlock();
        let namePromises:Promise<string>[] = [];
        let existingTags:{tag:Tag,name:string}[] = 
            (await Promise.all(b.tags.map(tId=>TAGS(tId))))
            .map((tag,i)=>( 
                (void(namePromises[i]=tag.getName())), 
                ({tag:tag,name:""})
            ));
        //now that they are all finished, we can assign awaited promises to .name
        for(let i = 0; i <existingTags.length; i++){
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
    */
    async getBlock():Promise<Block>{
        return await BLOCKS(this.selected_block_visual!.blockId);
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
*/
    async makeNewTag(tagName:string){
        if(!prompt(`Make new tag '${tagName}'?`))return;
        if(prompt("Global (or local)?")){
            Tag.new(tagName);
        }else{
            throw Error("Making local tags not implemented.");
        }
    }
    async toggleVisible(setValue?:boolean, selected_block2?:Block_Visual){
        if(setValue!==undefined)
            this.visible = setValue;
        else this.visible = !this.visible;

        this.selected_block_visual = selected_block2 ?? null;
        
        // this.background.style.display = this.visible?'block':'none';
        if(this.visible)
            this.modal.show();
        else
            this.modal.hide();

        if(this.visible==true){
            if(this.selected_block_visual==null) throw Error("Toggling tagger on null selected block?");
            //let b = await BLOCKS(this.selected_block_visual!.blockId);
            //await this.updateQuill(await this.tags_to_string(b.tags));
            await this.loadExistingTags();           
            this.input.value = "";            
            this.input.focus();
            //this.input.setSelection(99999);
            this.Search();
        }else{
            selectBlock(selected_block);
        }
    }
    async addTag(tagId:Id){
        let b = await this.getBlock();
        console.warn(b,b.id);
        if(b){
            await BlkFn.TagBlock(tagId!,b.id);
            //b.tags.push(tag.id);
            //b.DIRTY();
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
            if(last.indexOf(',')!=-1)
                last = last.split(',').at(-1)!.trim();
            // if(last == "") return;

            if(this.mode == 'tags'){
                this.directs = [];
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
    async __ItemClick(event:MouseEvent){
        let item:HTMLElement = event.target as HTMLElement;
        if(item.hasAttribute('data-id')==false) return; // in case finderSuggestions element was clicked.
        if(item == this.recent || item == this.direct) return;

        let isBlock = item.getAttribute('data-isBlock')=='true';
        let id = item.getAttribute('data-id')!;
        
        await this.addTag(id);
        this.input.value = "";
        this.input.focus();
        this.loadExistingTags();
        this.Search();
        //this.toggleVisible(false);
    }
}
