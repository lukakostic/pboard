class ProjectClass {
    running_change_hash: string;
    __runningId : number;
    version : string;

    DIRTY(){DIRTY.mark("PROJECT");}

    constructor(){
        this.running_change_hash = "-";
        this.__runningId = 1;
        this.version = "1";
    }

    genChangeHash():string{
        this.running_change_hash = numToShortStr(
                (Date.now() - (new Date(2025,0,1)).getTime())*1000 +
                Math.floor(Math.random()*1000)
            );
        this.DIRTY();
        return this.running_change_hash;
    }
    
    genId():string{
        ++this.__runningId;
        this.DIRTY();
        return this.__runningId.toString();
    }
    
}
RegClass(ProjectClass);

