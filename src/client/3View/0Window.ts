type WindowType = 'view'|'preferences'|'file-preview';

class Window_Tab {
    rootWindow : Window ;
    contentsWindow : Window ;
}
class Window {
    name: string;
    tabs: Window_Tab[];

    html(){
        LEEJS.div( {class:"window"},
            LEEJS.div({class:"header"}),
            LEEJS.div({class:"body"}  // is flow , so tabs can be vertical or horizontal.
                LEEJS.div({class:"tabs"}),
                LEEJS.div({class:"contents"}),
            ),
        );
    }
}