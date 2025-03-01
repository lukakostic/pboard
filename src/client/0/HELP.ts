

type HELP_CodeHint = { desc:string, sourceLocation:string[] };
type HELP_TOPIC = "Navigation";
const HELP = {
    topics: {
        Navigation:`
### all of these dont cycle. You wont wrap to first child if you keep going down. ###
ArrowUp : Above (any level)
ArrowUp + Shift : Above (same level)
ArrowDown : Below  (any level)
ArrowDown + Shift : Above (same level)
ArrowLeft : Select parent
ArrowRight : Select parent's sibling below
Tab : Below  (any level)
Tab + Shift: Above  (any level)

Escape (bock selection mode): Unselect block
Escape (text edit mode): Go to block selection mode

Enter (block selection mode):  Edit text  (go to text edit mode)

Delete : delete block
        `.trim(),
    } as Record<HELP_TOPIC,string>,
    // locations (and descriptions) in code to where you can find implementation of mentioned feature/topic
    codeHints:{} as { [topic in HELP_TOPIC ]?: HELP_CodeHint[] },
    logCodeHint(topic:HELP_TOPIC, description:string){
        function getCodeLocation(){
            return (new Error()).stack!.split("\n").reverse().slice(2);
            // const e = new Error();
            // const regex = /\((.*):(\d+):(\d+)\)$/
            // const match = regex.exec(e.stack!.split("\n")[2]);
            // return {
            //     filepath: match[1],
            //     line: match[2],
            //     column: match[3]
            // };
        }
        if(!(topic in this.topics))
            throw Error("Unknown topic: "+topic);
        if(this.codeHints[topic] && this.codeHints[topic].some(ch=>(ch.desc==description))){
            //code hint is already present.
            return;
        }
        
        ( // array of codeHints for topic
            (topic in this.codeHints) ? this.codeHints[topic]!  //get existing 
            : (this.codeHints[topic] = [])   // create new
        ).push(  // push codeHint object
            {desc:description,sourceLocation:getCodeLocation()}
        );
        
    }
}

