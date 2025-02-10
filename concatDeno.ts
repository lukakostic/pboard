import { join, resolve, relative } from "https://deno.land/std@0.114.0/path/mod.ts";

async function concat(folderPath: string, includeExtensions: string[] = [], depth = 1, excludePaths: string[] = [], printFiles=false): Promise<string> {
    const resolvedExcludePaths = excludePaths.map(path => resolve(path));
    const resolvedFolderPath = resolve(folderPath);

    async function getAllFiles(dir: string, currentDepth: number): Promise<string[]> {
        if (currentDepth < 0) return [];
        if (resolvedExcludePaths.includes(resolve(dir))) return [];
        
        const entries = [];
        for await (const entry of Deno.readDir(dir)) {
            entries.push(entry);
        }
        
        let files: string[] = [];
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory) {
                files.push(...await getAllFiles(fullPath, currentDepth - 1));
            } else if (includeExtensions.length === 0 || includeExtensions.includes(fullPath.slice(fullPath.lastIndexOf(".")))) {
                files.push(fullPath);
            }
        }
        return files;
    }
    
    function parseSortableName(name: string): string {
        return name.replace(/\d+/g, (num) => num.padStart(10, "0"));
    }
    
    let allFiles = await getAllFiles(resolvedFolderPath, depth);
    
    allFiles.sort((a, b) => parseSortableName(a).localeCompare(parseSortableName(b)));
    
    if(printFiles){
        // console.log("Sorted file order:");
        // allFiles.forEach((file, index) => console.log(`${(index + 1).toString().padStart(2, " ")}| ${relative(resolvedFolderPath, file)}`));
        allFiles.forEach((file, index) => {
            const relativePath = relative(resolvedFolderPath, file);
            const parts = relativePath.split("/");
            const folders = parts.slice(0, -1).join("/");
            const fileName = parts[parts.length - 1];
            console.log(`${(index + 1).toString().padStart(2, " ")}| \x1b[31m${folders}\x1b[0m${folders ? '/' : ''}\x1b[34m${fileName}\x1b[0m`);
        });
    }

    let result = "";
    for (const file of allFiles) {
        result += `\n//######################\n// File: ${relative(resolvedFolderPath, file)}\n// Path: file://${file}\n//######################\n\n`;
        result += await Deno.readTextFile(file) + "\n";
    }
    
    return result;
}

async function parseArgumentsAndRun() {
    const args = Deno.args;
    if (args.length < 1) {
        console.error("Usage: deno run --allow-read script.ts <folderPath> [--extensions .js.ts] [--depth 2] [--excludePaths ./folder1 ./folder2]");
        Deno.exit(1);
    }
    
    const folderPath = args[0];
    let includeExtensions: string[] = [];
    let depth = 1;
    let excludePaths: string[] = [];
    let printFiles = false;
    
    for (let i = 1; i < args.length; i++) {
        if (args[i] === "--extensions" && i + 1 < args.length) {
            includeExtensions = args[i + 1].split(".").filter(ext => ext).map(ext => "." + ext);
            i++;
        } else if (args[i] === "--depth" && i + 1 < args.length) {
            depth = parseInt(args[i + 1], 10);
            if (isNaN(depth)) depth = 1;
            i++;
        } else if (args[i] === "--excludePaths") {
            i++;
            while (i < args.length && !args[i].startsWith("--")) {
                excludePaths.push(resolve(args[i]));
                i++;
            }
            i--; 
        } else if (args[i] === "--printFiles"){
            printFiles=true;
        }
    }
    
    const result = await concat(folderPath, includeExtensions, depth, excludePaths);
    console.log(result);
}

await parseArgumentsAndRun();
