/*
User is viewing a single page.
*/

import { Id } from "../Common.ts";
import { Block, BLOCKS } from "./Blocks.ts";

export class View_Page{
    pageId : Id;
    
    constructor(pageId:Id){
        this.pageId = pageId;
    }
    page():Block{
        return BLOCKS[this.pageId];
    }
    openPage(newPageId:Id){
        this.pageId = newPageId;
        this.render();
    }
    render(){
        const p = this.page();
    }
};