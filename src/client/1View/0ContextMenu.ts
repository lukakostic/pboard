/*
Kontekst meniji su dinamicni zavisno od onog na sta klikcemo.
*/

declare type TippyJs = any;
declare var tippy : any;

let contextmenuHandlers :{[name:string]:
        ((target:EventTarget)=>ContextMenuItem[]|null|undefined) |
        ((                  )=>ContextMenuItem[]|null|undefined)
    } = {};
let contextMenuInstance :TippyJs|null = null;

type ContextMenuItem = readonly [
    text:string, clickFn:Function, 
    details?:{attribs?:any, children?:any[], tooltip?:string, classMod?:((classesStr:string)=>string)|(()=>string)}
];
const Html_ContextMenu = ( (items:ContextMenuItem[]) => 
    LEEJS.div(LEEJS.$I`context-menu`, {style:"display: none;"},
        items.map(it=>
            LEEJS.button({class:(it[2]?.classMod??(x=>x))("context-menu-item btn btn-outline-light btn-sm"), tabindex:"-1", type:'button',
                ...( it[2]?.attribs ?? {}), 
                ...( (it[2]?.tooltip) ? {"data-tooltip":it[2].tooltip,"data-tooltip-side":"right"} : {} ),
                $click:(e:MouseEvent)=>{closeContextMenu();it[1](e);}
            }, it[0], ...(it[2]?.children ?? []))
        ),
));

function applyTooltipsGlobally(){
    document.querySelectorAll('[data-tooltip]:not([data-tippy-loaded])').forEach(e=>{
        e.setAttribute('data-tippy-loaded','1');
        let side = e.getAttribute('data-tooltip-side') || 'bottom';
        tippy(e,{content:e.getAttribute('data-tooltip'),zIndex:99999,placement:side,allowHTML:true,touch:'hold'});
    });
}
setInterval(()=>{
    applyTooltipsGlobally();
},400);
function closeContextMenu(){
    if(contextMenuInstance)
        contextMenuInstance.hide();
}

// document.addEventListener("DOMContentLoaded", function() {

document.addEventListener("contextmenu", function(event) {
    if(!(event.target)) return;
    if(openContextMenu(event.target as HTMLElement, event.clientX, event.clientY))
        event.preventDefault();
});
document.addEventListener("click", function(event:MouseEvent) {
    if (contextMenuInstance && !(event.target as HTMLElement).closest(".tippy-box")) {
        closeContextMenu();
    }
});

function openContextMenu(targetElement:HTMLElement , x:number, y:number){
    let target = targetElement.closest("[data-contextmenu]");
    if(!target) return;
    let cmInfo = target.getAttribute("data-contextmenu");
    if(!cmInfo) return;
    let fn = contextmenuHandlers[cmInfo];
    if(!fn) return;
    let items = fn(target);
    if(!items && Array.isArray(items)==false) return;

    if (contextMenuInstance) {
        contextMenuInstance.hide();
        contextMenuInstance.destroy();
    }

    const menuContent = Html_ContextMenu(items)();
    menuContent.style.display = "";
    
    contextMenuInstance = tippy(document.body, {
        content: menuContent, 
        allowHTML: true,
        interactive: true,
        trigger: "manual",
        duration: [100,50],
        theme: "light-border",
        placement: "right-start",
        getReferenceClientRect: () => ({
            width: 0, height: 0,
            top: y, bottom: y,
            left: x, right: x,
        })
    });

    contextMenuInstance.show();
    menuContent.addEventListener("keydown", function(event:KeyboardEvent) {
        if (event.key === "Escape" && contextMenuInstance) {
            closeContextMenu();
        }
    });
    setTimeout(() => {
        menuContent.querySelector('.context-menu-item').focus();
    }, 10);
    return true;
}
