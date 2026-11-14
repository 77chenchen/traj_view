import assert from 'node:assert/strict';
import { join } from 'node:path';

export async function checkLive(page, url, artifacts, append, progress) {
  await page.goto(url);
  await page.getByText(/Live capture · 1 runs/).waitFor();
  await page.getByRole('button',{name:'qa-live',exact:true}).click();
  await page.getByText('1 nodes · 0 visible edges',{exact:true}).waitFor();
  const graph=page.getByRole('group',{name:'Process graph for qa-live-expanded',exact:true});
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  const widthBefore=await graph.evaluate(svg=>svg.viewBox.baseVal.width);
  append(2);
  await page.getByText(/^2 nodes ·/).waitFor({timeout:15000});
  assert.ok(Math.abs(await graph.evaluate(svg=>svg.viewBox.baseVal.width)-widthBefore)<.01,'Live growth preserves camera zoom');
  await page.getByRole('button',{name:'Pause updates',exact:true}).click();
  append(3);
  await page.waitForTimeout(3000);
  await page.getByText(/^2 nodes ·/).waitFor();
  await page.getByRole('button',{name:'Resume updates',exact:true}).click();
  await page.getByText(/^3 nodes ·/).waitFor({timeout:15000});
  const search=page.getByRole('searchbox',{name:'Find a node in qa-live-expanded'});
  await search.fill('#2');await search.press('Enter');
  await page.getByRole('complementary',{name:'Step inspector'}).getByRole('button',{name:'Error Output',exact:true}).click();
  await page.getByRole('complementary',{name:'Step inspector'}).getByText('live result 3',{exact:true}).waitFor();
  await progress();
  await page.getByText('1 completed · 0 running · 0 failed',{exact:true}).waitFor({timeout:7000});
  // A transient graph fetch must preserve the inspected source and graph controls.
  await page.route('**/data/runs/*.json', route=>route.abort(), {times:1});
  append(4);
  await page.getByText(/Live refresh failed. Showing the last available graph/).waitFor({timeout:15000});
  await page.getByRole('complementary',{name:'Step inspector'}).getByText('live result 3',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Retry refresh',exact:true}).click();
  await page.getByText(/^4 nodes ·/).waitFor({timeout:15000});
  await page.locator('.graph-options > summary').click();
  await page.getByRole('button',{name:'Hierarchy',exact:true}).click();
  await page.getByRole('button',{name:/Loop · 4 × 1 calls/}).waitFor();
  await page.getByRole('complementary',{name:'Step inspector'}).getByRole('button',{name:'Error Output',exact:true}).click();
  await page.screenshot({path:join(artifacts,'live-stream.png'),fullPage:true});
  assert.ok(await page.getByText(/Live capture/).count());
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{
    if(document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0,0);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
  await page.getByRole('button',{name:/Loop · 4 × 1 calls/}).waitFor();
  await page.getByRole('complementary',{name:'Step inspector'}).getByText('live result 3',{exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:join(artifacts,'live-mobile.png'),fullPage:true,animations:'disabled'});
}
