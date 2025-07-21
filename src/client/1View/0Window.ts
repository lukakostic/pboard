type WindowType = 'view'|'preferences'|'file-preview';

class Window_Tab {
    rootWindow : Window ;
    contentsWindow : Window ;

    constructor(
        rootWindow : Window ,
        contentsWindow : Window
    ){
            this.rootWindow = rootWindow;
            this.contentsWindow = contentsWindow;
        }
}
class WindowPB {
    name: string;
    tabs: Window_Tab[];

    constructor(name:string){
        this.name = name;
        this.tabs = [];
    }

    html(){
        LEEJS.div( {class:"window"},
            LEEJS.div({class:"window-header"}),
            LEEJS.div({class:"window-body"},  // is flow , so tabs can be vertical or horizontal.
                LEEJS.div({class:"window-tabs"}),
                LEEJS.div({class:"window-contents"}),
            ),
        );
    }
}


type WindowNode = WindowPB | WindowSplit;
class WindowSystem {
    root : WindowNode;

    constructor( 
        root : WindowNode 
    ){
        this.root = root;
    }
}
class WindowSplit {
    vertical : boolean;   // split direction
    windows : WindowNode[];

    constructor(
        vertical : boolean   // split direction
    ){
        this.vertical = vertical;
        this.windows = [];
    }    
}
