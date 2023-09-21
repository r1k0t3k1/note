import fs from "fs";
import { parseMarkdown } from "$lib/markdown";

export class Post {
  title: string;
  author: string;
  createdAt: string;
  content: string;

  constructor(title: string, author: string, createdAt: string, content: string) {
    this.title = title;
    this.author = author;
    this.createdAt = createdAt;
    this.content = content;
  }
}

export async function getPosts(): string[] {
    const dirPath = "src/contents/"
    const files = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith(".md"));
    
    let posts: Post[] = new Array();

    for(let i = 0; i < files.length; i++) {
      if(files[i].name) {
        const md = await parseMarkdown(`${dirPath}${files[i].name}`);
        //const md = fs.readFileSync(`${dirPath}${files[i].name}`, { encoding: "utf8" });
        if (md) {
            posts.push(md);
        }
      }
    };
    return posts;
}
