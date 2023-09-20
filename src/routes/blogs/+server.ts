import { error } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import fs from "fs";

export function GET() {
    //const dirPath = "src/contents/"
    //const files = fs.readdirSync(dirPath, { withFileTypes: true })
    //  .filter(dirent => dirent.isFile() && dirent.name.endsWith(".md"));
    //return json(files);
    return json("test");
}

