import fs from "fs";

class Blog {
  title: string
  author: string
  createdAt: string
  content: string
}

export function getBlogs(): string[] {
    const dirPath = "src/contents/"
    const files = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith(".md"));
    console.log(JSON.stringify(files));
    
    let blogs: string[] = new Array();

    for(let i = 0; i < files.length; i++) {
      if(files[i].name) {
        const md = fs.readFileSync(`${dirPath}${files[i].name}`, { encoding: "utf8" });
        console.log(`md: ${md}`);
        if (md) {
            blogs.push(md);
        }
      }
    };
    return blogs;
}
