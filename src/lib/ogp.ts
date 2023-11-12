import puppeteer from "puppeteer";
import * as fs from "fs";
import { Post } from "$lib/posts";
import { getPostById } from "$lib/posts";

export async function generateOgpImage(postId: string) {
  const post: Post = await getPostById(postId);
  if (fs.existsSync(`static/ogp/${post.id}.png`)) { return; }
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
    <div id=ogp style="width:1200px;height:630px;padding:40px;">
    <div style="width:1000;margin:auto">
      <div style="height:120px;font-family:NameFont;">
        <div style="color:#C60000;font-size:40px;">RIKO'TEKI</div>
        <div style="color:#C60000;font-size:26px">tekitouna blog</div>
      </div>
      <div style="height:310px;box-sizing:border-box;background:white;">
        <div style="font-family:Titlefont;color:#000000;-webkit-box-orient:vertical;overflow:hidden;display:-webkit-box;text-overflow:ellipsis;-webkit-line-clamp:4;font-size:72px;overflow-wrap:break-word">
            ${title}
        </div>
      </div>
      <p style="font-family:MyFont;font-size:26px;margin-top:130px;">${createdAt}</p>
    </div>
    <div style="position:absolute;right:300px;top:350px;">
      <img style="width:${imgSize.y*scale}px;height:${imgSize.x*scale}px" src="data:image/png;base64,${goatImg}">
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
  await div.screenshot({path: `static/ogp/${post.id}.png`});

  await browser.close();
}
