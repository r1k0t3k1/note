import fs from "fs";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkExtractFrontmatter from "remark-extract-frontmatter";
import remarkRehype from "remark-rehype";
import remarkBreaks from "remark-breaks";
import rehypeStringify from "rehype-stringify";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import yaml from "yaml";
import { Post } from "$lib/posts";

const processor = unified()
  .use(remarkFrontmatter, [{
    type: "yaml", marker: "-",
    anywhere: false
  }])
  .use(remarkExtractFrontmatter, {
    yaml: yaml.parse,
    name: "frontMatter"
  })
  .use(remarkParse)
  .use(remarkBreaks)
  .use(remarkRehype)
  .use(remarkGfm)
  .use(rehypeHighlight)
  .use(rehypeStringify);

export async function parseMarkdown(path: string): Post {
  const inputMarkdown = fs.readFileSync(path, "utf-8");
  const result = processor.processSync(inputMarkdown);
  return new Post(
    result.data.frontMatter.title,
    result.data.frontMatter.id,
    result.data.frontMatter.description,
    result.data.frontMatter.author,
    result.data.frontMatter.createdAt,
    result.data.frontMatter.isDraft,
    result.value
  );
}

