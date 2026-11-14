import assert from 'node:assert/strict';
import {join} from 'node:path';

export async function checkPlaybackPreferences(page,url,artifacts,offline=false){
  const errors=[],requests=[];
  const onError=e=>errors.push(e.message),onRequest=r=>requests.push(r.url());
  page.on('pageerror',onError);page.on('request',onRequest);
  await page.setViewportSize({width:1586,height:912});
  await page.goto(url+'#view=replay&run=node-types-synthetic&step=60');
  const content=page.getByRole('group',{name:'Recorded content view',exact:true}),outputs=page.getByRole('group',{name:'Output view',exact:true});
  const diff=content.getByRole('button',{name:'Diff',exact:true}),slider=page.getByRole('slider',{name:'Replay position',exact:true});
  await page.getByLabel('Recorded patch',{exact:true}).waitFor();await diff.click();await outputs.getByRole('button',{name:'Tests',exact:true}).click();
  await page.getByRole('button',{name:'Show inspection',exact:true}).click();
  const inspection=page.getByRole('complementary',{name:'Step inspector',exact:true});
  await inspection.locator('.source-ref > summary').click();
  const workspace=await page.locator('.recorded-workspace').elementHandle(),dock=await page.locator('.replay-transport').elementHandle();
  const beforeRequests=requests.length;
  const assertPinned=async(idx)=>{
    assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),String(idx));
    assert.equal(await diff.getAttribute('aria-pressed'),'true');
    assert.equal(await outputs.getByRole('button',{name:'Tests',exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(await inspection.locator('.source-ref').getAttribute('open'),'');
    assert.ok(await workspace.evaluate(n=>n.isConnected),'The workspace stays mounted across action playback');
    assert.ok(await dock.evaluate(n=>n.isConnected),'Playback controls stay mounted');
  };
  await page.getByLabel('Replay speed',{exact:true}).selectOption('0.5');
  const playTo=async idx=>{
    await page.getByRole('button',{name:'Play replay',exact:true}).click();
    await page.waitForFunction(expected=>new URLSearchParams(location.hash.slice(1)).get('step')===String(expected),idx);
    await page.getByRole('button',{name:'Pause replay',exact:true}).click();await assertPinned(idx);
  };
  await playTo(70);
  assert.match(await page.locator('.recorded-code').innerText(),/No patch recorded/);
  assert.match(await page.getByLabel('Current step output',{exact:true}).innerText(),/1 passed \(synthetic output\)/);
  await page.screenshot({path:join(artifacts,(offline?'offline-':'')+'playback-diff-missing.png'),fullPage:true,animations:'disabled'});
  await playTo(80);
  assert.match(await page.getByLabel('Current step output',{exact:true}).innerText(),/No test output recorded/);
  await playTo(90);
  const changed=await page.getByLabel('Recorded patch',{exact:true}).innerText();assert.match(changed,/return 3/);
  assert.notEqual(await slider.inputValue(),'5');
  await page.screenshot({path:join(artifacts,(offline?'offline-':'')+'playback-diff-updated.png'),fullPage:true,animations:'disabled'});
  await slider.fill('5');await assertPinned(60);
  assert.notEqual(await page.getByLabel('Recorded patch',{exact:true}).innerText(),changed,'Seeking back shows that source patch, not a cached later patch');
  for(const [name,source] of [['File Context',70],['Updated File',80],['Output',90]]){
    await content.getByRole('button',{name,exact:true}).click();
    await page.getByRole('button',{name:'Next replay step',exact:true}).click();
    assert.equal(await content.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),String(source));
  }
  await outputs.getByRole('button',{name:'Hide terminal output',exact:true}).click();await page.getByRole('button',{name:'Next replay step',exact:true}).click();
  assert.equal(await outputs.getByRole('button',{name:'Show terminal output',exact:true}).getAttribute('aria-expanded'),'false');
  await content.getByRole('button',{name:'Automatic evidence view',exact:true}).click();await slider.fill('5');
  await page.getByLabel('Recorded patch',{exact:true}).waitFor();await slider.fill('6');await page.getByLabel('Selected step evidence',{exact:true}).waitFor();
  assert.equal(requests.length,beforeRequests,'Stepping and playback do not reload trace data');
  await page.getByRole('button',{name:'Execution graph',exact:true}).click();await page.locator('[data-node]').first().waitFor();
  const find=page.getByRole('searchbox',{name:/Find a node in/});await find.fill('#60');await find.press('Enter');
  await inspection.getByRole('button',{name:'Code Diff',exact:true}).click();await inspection.getByLabel('Recorded patch',{exact:true}).waitFor();
  await inspection.getByRole('button',{name:'Next inspected step',exact:true}).click();
  assert.equal(await inspection.getByRole('button',{name:'Code Diff',exact:true}).getAttribute('aria-pressed'),'true');
  assert.match(await inspection.innerText(),/No patch recorded/);
  await inspection.getByRole('button',{name:'Error Output',exact:true}).click();await inspection.getByRole('button',{name:'Next inspected step',exact:true}).click();
  assert.equal(await inspection.getByRole('button',{name:'Error Output',exact:true}).getAttribute('aria-pressed'),'true');
  await find.fill('#60');await find.press('Enter');
  await inspection.getByRole('button',{name:'Code Diff',exact:true}).click();
  const graphInspection=await inspection.elementHandle(),graphRequests=requests.length;
  const activity=page.locator('.graph-activity-disclosure');await activity.locator(':scope > summary').click();
  const playback=page.getByRole('region',{name:'Playback timeline',exact:true});
  const playGraphTo=async idx=>{
    await playback.getByRole('button',{name:'Play',exact:true}).click();
    await page.waitForFunction(expected=>new URLSearchParams(location.hash.slice(1)).get('step')===String(expected),idx);
    await playback.getByRole('button',{name:'Pause',exact:true}).click();
    assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('step'),String(idx));
    assert.equal(await inspection.getByRole('button',{name:'Code Diff',exact:true}).getAttribute('aria-pressed'),'true','Graph playback keeps the reader-selected detail tab');
    assert.ok(await graphInspection.evaluate(n=>n.isConnected),'Graph playback keeps the same mounted Inspector');
  };
  await playGraphTo(70);assert.match(await inspection.innerText(),/No patch recorded/);
  await page.screenshot({path:join(artifacts,(offline?'offline-':'')+'playback-inspector-diff-missing.png'),fullPage:true,animations:'disabled'});
  await playGraphTo(80);await playGraphTo(90);
  assert.match(await inspection.getByLabel('Recorded patch',{exact:true}).innerText(),/return 3/);
  await page.screenshot({path:join(artifacts,(offline?'offline-':'')+'playback-inspector-diff-updated.png'),fullPage:true,animations:'disabled'});
  assert.equal(requests.length,graphRequests,'Graph action playback does not reload trace data');
  assert.deepEqual(errors,[]);if(offline)assert.equal(requests.filter(r=>/^https?:/.test(r)).length,0);
  page.off('pageerror',onError);page.off('request',onRequest);
  return {automaticAndPinnedEvidence:true,playbackSources:[60,70,80,90],stepAndSeek:true,terminalTestsAndCollapsedState:true,rawDisclosurePreserved:true,sameMountedWorkspace:true,noReloadOrRefetch:true,inspectorTabsPreserved:true,graphAutoplayKeepsDiff:true,graphAutoplaySources:[60,70,80,90],offlineHttp:offline?0:undefined,pageErrors:errors};
}
