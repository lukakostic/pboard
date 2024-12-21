/*
User is viewing a single page.
*/

import { Id } from "../Common.ts";
import { _BLOCKS, Block, BLOCKS } from "./Blocks.ts";
import { Block_Visual } from "./View_Blocks_Visual.ts";
import { load, loadBlock } from "./client.ts";

export class Page_Visual{
    pageId : Id;
    children : Block_Visual[];
    
    constructor(){
        this.pageId = "";
        this.children = [];
    }
    page():Block{
        return _BLOCKS[this.pageId]!;
    }
    async openPage(newPageId:Id){
        await loadBlock(newPageId,1);
        this.pageId = newPageId;
        this.children = [];
        this.render();
    }
    render(){
        const p = this.page();
    }
};