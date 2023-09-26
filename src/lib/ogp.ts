import puppeteer from "puppeteer";
import * as fs from "fs";
import { Post } from "$lib/posts";
import { getPostById } from "$lib/posts";

export async function generateOgpImage(postId: string) {
  const post: Post = await getPostById(postId);
  //if (fs.existsSync(`static/ogp/${post.id}.png`)) { return; }
  // TODO html escape
  let title = post.title;
  let createdAt = post.createdAt;

  const browser = await puppeteer.launch({
      headless: "new",
    });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1500,
    height:800
  });

 
  const nameFont = fs.readFileSync("static/Helvetica-Bold.ttf", {encoding: "base64"});
  const titleFont = fs.readFileSync("static/hiragino-w5.ttc", {encoding: "base64"});

  const goatImg = fs.readFileSync("static/goat.png", {encoding: "base64"});
  const imgSize = {x: 619, y:495 }
  const scale = 0.5
  const html = `
  <div id=ogp style="width:1200px;height:630px;display:flex;justify-content:flex-start;">
    <div style="width:285px;height:630px;">
      <img style="margin-left:36px;margin-top:300px;width:${imgSize.y*scale}px;height:${imgSize.x*scale}px" src="data:image/png;base64,${goatImg}">
    </div>
    <div style="width:600px;height:630px;padding:36px;">
      <div style="height:100px;box-sizing:border-box;font-family:NameFont;">
        <div style="margin:0;color:#C60000;font-size:40px;">RIKO'TEKI</div>
        <div style="margin:0;color:#C60000;font-size:26px">rikotekiのノート</div>
      </div>
      <div style="height:310px;box-sizing:border-box;">
        <div style="font-family:Titlefont;color:#000000;-webkit-box-orient:vertical;overflow:hidden;display:-webkit-box;text-overflow:ellipsis;-webkit-line-clamp:3;font-size:72px;overflow-wrap:break-word">
            ${title}
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <p style="font-family:MyFont;font-size:26px;margin-top:130px;">${createdAt}</p>
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
