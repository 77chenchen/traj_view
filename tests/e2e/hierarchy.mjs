import assert from 'node:assert/strict';
import { join } from 'node:path';

export async function checkHierarchy(page, url, artifacts) {
  await page.goto(url);
  await page.getByRole('button', {name:'dag-baseline',exact:true}).click();
  await page.locator('.graph-options > summary').click();
  await page.getByRole('button', {name:'Hierarchy',exact:true}).click();
  await page.locator('.graph-options > summary').click();
  const graph=page.getByRole('group',{name:'Process graph for dag-baseline-expanded',exact:true});
  const loop=graph.getByRole('button',{name:/Loop · 2 × 1 calls.*first source step #7/});
  await loop.waitFor();
  await loop.click();
  await page.getByRole('button',{name:'Clear inspected step',exact:true}).click();
  await page.getByText('Select a node or inspect the current timeline step.',{exact:true}).waitFor();
  await loop.click();
  await loop.click();
  const iteration=graph.getByRole('button',{name:/Iteration 2.*first source step #19/});
  await iteration.waitFor();
  await iteration.click();
  const call=graph.getByRole('button',{name:/^read_file.*first source step #19/});
  await call.waitFor();
  await call.click();
  const inspector=page.getByRole('complementary',{name:'Step inspector'});
  await inspector.getByText('#19',{exact:true}).waitFor();
  await inspector.getByText('None recorded',{exact:true}).first().waitFor();
  const nodes=await graph.locator('[data-node]').evaluateAll(nodes=>nodes.map(node=>({id:node.getAttribute('data-node-id'),x:node.transform.baseVal.consolidate().matrix.e,y:node.transform.baseVal.consolidate().matrix.f})));
  assert.ok(new Set(nodes.map(n=>n.y)).size>=3,'Three visible hierarchy levels');
  const positions=new Map(nodes.map((node,index)=>[node.id,index]));
  for(const edge of await graph.locator('[data-edge-type]').evaluateAll(edges=>edges.map(e=>({source:e.dataset.source,target:e.dataset.target})))) {
    assert.ok(positions.get(edge.source)<positions.get(edge.target),'Visible hierarchy edges remain topologically ordered');
  }
  assert.ok(await graph.locator('[data-edge-type="structural"]').count()>0);
  await page.screenshot({path:join(artifacts,'hierarchy.png'),fullPage:true});
  if(await page.locator('.graph-options').getAttribute('open')===null)await page.locator('.graph-options > summary').click();
  await page.getByRole('button',{name:'Collapse groups',exact:true}).click();
  assert.equal(await graph.getByRole('button',{name:/Iteration/}).count(),0);
  await page.getByRole('button',{name:'Steps',exact:true}).click();
  await page.locator('.graph-options > summary').click();
  const find=page.getByRole('searchbox',{name:'Find a node in dag-baseline-expanded'});
  await find.fill('#9007199254741007');await find.press('Enter');
  await inspector.getByRole('button',{name:'Context',exact:true}).click();
  await inspector.locator('summary').filter({hasText:'Related steps'}).click();
  await inspector.getByRole('button',{name:/From #9007199254740993 · dependency/}).waitFor();
  await page.locator('.graph-options > summary').click();
  await page.getByLabel('Errors only',{exact:true}).check();
  await find.fill('#9007199254741021');await find.press('Enter');
  await inspector.getByRole('button',{name:'Context',exact:true}).click();
  const relations=inspector.locator('details').filter({hasText:'Related steps'});
  if(await relations.getAttribute('open') === null) await relations.locator('summary').click();
  await inspector.getByRole('button',{name:/From #9007199254741007 · temporal/}).click();
  assert.equal(await page.getByLabel('Errors only',{exact:true}).isChecked(),false);
  await inspector.locator('.step-content').getByText('Synthetic baseline step 3.',{exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Hierarchy',exact:true}).click();
  await page.locator('.graph-options > summary').click();
  const mobileLoop=graph.getByRole('button',{name:/Loop · 2 × 1 calls.*first source step #7/});
  if((await mobileLoop.getAttribute('aria-label')).includes('collapsed')) {
    await mobileLoop.focus();await mobileLoop.press('Enter');
  }
  const graphBox=await graph.boundingBox(), controlBox=await page.locator('.canvas-controls').boundingBox();
  assert.ok(graphBox.x>=controlBox.x+controlBox.width,'Camera controls have a reserved gutter outside the SVG');
  const second=graph.getByRole('button',{name:/Iteration 2.*first source step #19/});
  if(!(await graph.getByRole('button',{name:/^read_file.*first source step #19/}).count())) {
    await second.focus();await second.press('Enter');
  }
  const mobileCall=graph.getByRole('button',{name:/^read_file.*first source step #19/});
  await mobileCall.focus();await mobileCall.press('Enter');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.evaluate(async () => {
    document.activeElement?.blur(); window.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({path:join(artifacts,'hierarchy-mobile.png'),fullPage:true});
}
