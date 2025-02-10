//deno , not node.
import * as fs from "node:fs";
import * as path from "node:path";
//node:
// import * as fs from "fs";
// import * as path from "path";

function concat(folderPath: string, includeExtensions: string[] = [], depth = 1): string {
    function getAllFiles(dir: string, currentDepth: number): string[] {
        if (currentDepth < 0) return [];
        let entries = fs.readdirSync(dir, { withFileTypes: true });
        
        let files: string[] = [];
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...getAllFiles(fullPath, currentDepth - 1));
            } else if (includeExtensions.length === 0 || includeExtensions.includes(path.extname(entry.name))) {
                files.push(fullPath);
            }
        }
        return files;
    }
    
    function parseSortableName(name: string): string {
        return name.replace(/\d+/g, (num) => num.padStart(10, "0"));
    }
    
    let allFiles = getAllFiles(folderPath, depth);
    
    allFiles.sort((a, b) => parseSortableName(a).localeCompare(parseSortableName(b)));
 
    console.log("Sorted file order:");
    allFiles.forEach((file, index) => console.log(`${index + 1}: ${file}`));
       
    let result = "";
    for (const file of allFiles) {
        result += `// File:  ${file}\n\n`;
        result += fs.readFileSync(file, "utf-8") + "\n";
    }
    
    return result;
}


function parseArgumentsAndRun() {
    //nodejs:
    // const args = process.argv.slice(2);
    //deno:
    const args = Deno.args.slice(2);

    if (args.length < 1) {
        console.error("Usage: node script.js <folderPath> [--extensions .js.ts] [--depth 2]");
        //nodejs:
        // process.exit(1);
        //deno:
        Deno.exit(1);
    }
    
    const folderPath = args[0];
    let includeExtensions: string[] = [];
    let depth = 1;
    
    for (let i = 1; i < args.length; i++) {
        if (args[i] === "--extensions" && i + 1 < args.length) {
            includeExtensions = args[i + 1].split(".").filter(ext => ext).map(ext => "." + ext);
            i++;
        } else if (args[i] === "--depth" && i + 1 < args.length) {
            depth = parseInt(args[i + 1], 10);
            if (isNaN(depth)) depth = 1;
            i++;
        }
    }
    
    const result = concat(folderPath, includeExtensions, depth);
    console.log(result);
}

parseArgumentsAndRun();