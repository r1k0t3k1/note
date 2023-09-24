import puppeteer from "puppeteer";
import * as fs from "fs";
import { Post } from "$lib/posts";
import { getPostById } from "$lib/posts";

export async function generateOgpImage(postId: string) {
  const post: Post = await getPostById(postId);
  console.log(post);  
  // TODO html escape
  let title = post.title;
  let createdAt = post.createdAt;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({
    width: 1500,
    height:800
  });

 
  const nameFont = fs.readFileSync("static/Helvetica-Bold.ttf", {encoding: "base64"});
  const titleFont = fs.readFileSync("static/hiragino-w5.ttc", {encoding: "base64"});

  const goatImg = fs.readFileSync("static/goat.png", {encoding: "base64"});
  const imgSize = {x: 619, y:495 }
  const scale = 0.35
  const html = `
  <div id=ogp style="width:1200px;height:630px">
    <div style="width:630px;height:630px;margin:0 auto;">
      <div style="height:100px;box-sizing:border-box;padding:8px;font-family:NameFont;">
        <div style="margin:0;color:#C60000;font-size:40px;">RIKO'TEKI</div>
        <div style="margin:0;color:#C60000;font-size:26px">rikotekiのノート</div>
      </div>
      <div style="height:310px;box-sizing:border-box;padding:8px;">
        <div style="font-family:Titlefont;color:#000000;-webkit-box-orient:vertical;overflow:hidden;display:-webkit-box;text-overflow:ellipsis;-webkit-line-clamp:3;font-size:72px;overflow-wrap:break-word">
            ${title}
        </div>
      </div>
      <div style="display:flex;justify-content:space-between">
        <img style="margin-left:16px;width:${imgSize.y*scale}px;height:${imgSize.x*scale}px" src="data:image/png;base64,${goatImg}">
        <p style="font-family:MyFont;font-size:26px;margin-top:150px">${createdAt}</p>
      </div>
    </div>
  </div>
  <style>
    @font-face {
      font-family: "NameFont";
      src: url("data:font/ttf;base64,${nameFont}")
    }
    @font-face {
      font-family: "TitleFont";
      src: url("data:font/ttf;base64,${titleFont}")
    }
  </style>
  `;

  await page.setContent(html)

  const div = await page.$("#ogp");
  if(!div) { return }
  await div.screenshot({ path: `static/ogp/${post.id}.png` });

  await browser.close();
}
