type WindowType = 'view'|'preferences'|'file-preview';

class Window_Tab {
    rootWindow : Window ;
    contentsWindow : Window ;

    constructor(
        rootWindow : Window ,
        contentsWindow : Window){
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
            LEEJS.div({class:"header"}),
            LEEJS.div({class:"body"},  // is flow , so tabs can be vertical or horizontal.
                LEEJS.div({class:"tabs"}),
                LEEJS.div({class:"contents"}),
            ),
        );
    }
}