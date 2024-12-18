let __runningId = 0;
export function genId(){return (++__runningId).toString();}
export type Id = string;
// export var ID : {[index:Id]:any} = {}; //all everything

export type objectA = {[index:string]:any};
