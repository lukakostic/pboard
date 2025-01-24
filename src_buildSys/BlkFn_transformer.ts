#!/usr/bin/env -S deno run --allow-all
/*
See BlkFn_server header for explanations.
We transform the server functions into client functions.
*/

/*
Read BlkFn_server.ts , use eval and regex magic.
*/

let $IS_CLIENT$ = true;
declare var BlkFn : any;

// CONTENTS OF BlkFn GO BELOW "(//)INSERT_HERE" !!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//INSERT_HERE

let fnTypes = {
    "clone":"let $$$CL_clone;",
    "ret":"let $$$CL_ret;",
    "diff":"let $$$CL_diff;",
    "local":"let $$$CL_local;",
};
let fnType_entrs = Object.entries(fnTypes);
let getType = (fnStr:string)=>{
    let matches = fnType_entrs.filter(t=>fnStr.includes(t[1])).map(t=>t[0]);
    return matches;
}

function parseFnArgs(str:string):[string[],number]|undefined{ // "fn(a:string,b,...c){...}" -> ['a','b','...c']
    let inArgs = false; // entered first '(' of args declaration fn(..args..)
    let args:string[] = [];
    let curArg = "";
    let endCur=()=>{
        curArg = curArg.trim();
        if(curArg!="")args.push(curArg);
        curArg = "";
    }
    // let argsEndIdx = -1; // ')' closing paren of arguments declaration
    // let args = ():string=>{
    //     let argsStr = str.substring(argsStartIdx+1,argsEndIdx); // (...) without ()
    //     let ar = argsStr.split(',');
    // }
    let level_curlyBrace = 0;
    let level_parentheses = 0;
    let level = 0; // total level (added)
    let inTypeDecl = false;  // ' arg : type '
    for(let i = 0; i<str.length;i++){
        if(str[i]=='/'&&str[i+1]=='/'){ // '//' -> '\n'
            while(str[i]!='\n' && i<str.length)i++;
        }else if(str[i]=='/'&&str[i+1]=='*'){ // '/*' -> '*/'
            while(str[i]!='*' && str[i]!='/' && i<str.length)i++;
        }else{
            if(str[i]=='{'){
                // if(argsEndIdx>-1) return args();
                level_curlyBrace++;
                level++;
            }else if(str[i]=='}'){
                level_curlyBrace--;
                level--;
            }else if(str[i]=='('){
                if(level == 0) inArgs=true;
                //if(reachedEndOfArgs) return {args:args,bodyStartIdx:i+1};
                level_parentheses++;
                level++;
            }else if(str[i]==')'){
                if(level==1){ endCur(); return [args,i]; }
                level_parentheses--;
                level--;
            }else{
                if(!inTypeDecl){
                    if(str[i]==':'||str[i]=='='){
                        inTypeDecl = true;
                        endCur();
                    }else if(str[i]==','){
                        endCur();
                    }else{
                       if(level==1) curArg+=str[i];
                    }
                }else{
                    if(str[i]=='<'){
                        level++;
                    }else if(str[i]=='>'){
                        level--;
                    }else if(str[i]==','){
                        if(level==1)inTypeDecl=false;
                    }
                }
            }
            
        }
    }
    return undefined; //error.
}

let finalOutput = "\nlet $CL=true;\nconst BlkFn = {\n";

let fns = Object.keys(BlkFn);
for(let i=0;i<fns.length;i++){
    let fn = BlkFn[fns[i]];
    let fnTxt = fn.toString();
    let types = getType(fnTxt);
    // console.log(types);
    if(types.length!=1){
        let errText = `No 1 type (found ${types}):\n${fnTxt}\n\n\n\nSee BlkFn_server.ts top for explanation.`;
        console.error(errText);
        throw new Error(errText);
    }
    let type = types[0];
    fnTxt = fnTxt
    .replaceAll("BLOCKS","_BLOCKS")
    .replaceAll("TAGS","_TAGS")
    .replaceAll(".children","._children")
    .replaceAll(".blocks","._blocks")
    .replaceAll(".tags","._tags");
    let fnType_idx = fnTxt.indexOf(fnTypes[type]);
    fnTxt = fnTxt.replaceAll(fnTypes[type],"  ")+',';

    let bodyStartIdx = fnTxt.indexOf("{");
    //if(type)
    let [args,argsEndIdx] = parseFnArgs(fnTxt)!;
    let fnHeader = fnTxt.substring(0,argsEndIdx+1);
    let argsTxt = args.map(a=>(','+a)).join('');
    let rpc = `(await rpc(\`BlkFn.${fns[i]}\`${argsTxt}))`;
    
    if(type=='clone'){
        fnTxt = fnTxt.substring(0,fnType_idx) + rpc+";" + fnTxt.substring(fnType_idx);
    }else if(type=='ret'){
        fnTxt = `${fnHeader}{\n\treturn ${rpc};\n},`;
    }else if(type=='local'){
        let rpcToken = "$$$CL_rpc";
        let rpcTokIdx;
        let start = 0;
        while((rpcTokIdx = fnTxt.indexOf(rpcToken,start)) != -1){
            fnTxt = fnTxt.substring(0,rpcTokIdx) + rpc + fnTxt.substring(rpcTokIdx+rpcToken.length);
            start = rpcTokIdx+rpc.length;
        }
    }else if(type=='diff'){

        fnTxt = `${fnHeader}{\n\t${rpc};\n\tawait ReLoadAllData();\n},`;
        
        // fnTxt = fnTxt.substring(0,fnType_idx) + rpc+";" + fnTxt.substring(fnType_idx);
    }else{
        throw new Error("Unexpected.");
    }

    
    finalOutput += fnTxt + "\n";
    // console.log(fnTxt);
}

finalOutput += "};";
console.log(finalOutput);