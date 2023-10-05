import fs from "fs";
import { parseMarkdown } from "$lib/markdown";

export class Post {
  title: string;
  id: string;
  description: string;
  author: string;
  createdAt: string;
  content: string;
  isDraft: boolean;

  constructor(
    title: string,
    id: string,
    description: string,
    author: string,
    createdAt: string,
    isDraft: boolean,
    content: string
  ) {
    this.title = title;
    this.id = id;
    this.description = description;
    this.author = author;
    this.createdAt = createdAt;
    this.isDraft = isDraft;
    this.content = content;
  }
}

export async function getPosts(): Post[] {
    const dirPath = "src/contents/"
    const files = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith(".md"));
    
    let posts: Post[] = new Array();

    for(let i = 0; i < files.length; i++) {
      if(files[i].name) {
        const md = await parseMarkdown(`${dirPath}${files[i].name}`);
        if (md && md.isDraft == false ) {
            posts.push(md);
        }
      }
    };
    return posts.sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getPostById(id: string): Post|undefined {
  const posts = await getPosts();
  return posts.find(post => post.id === id);
}
