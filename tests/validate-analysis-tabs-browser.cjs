// SPDX-License-Identifier: MIT
'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const workspaceProject=require('./fixtures/workspace-project.cjs');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1480,height:930},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.setDefaultTimeout(90000);
    await page.goto(pathToFileURL(path.resolve(process.argv[2]||'index.html')).href);
    if(process.env.TAB_REVIEW_SCREENSHOT){
      const {setExplorerPreference}=require('./workspace-preferences.cjs');
      await setExplorerPreference(page,'#language-select','zh-CN');
      await setExplorerPreference(page,'#theme-select','dark');
    }
    const picker=page.waitForEvent('filechooser');await page.locator('[data-project-action=open-project]:visible').first().click();await (await picker).setFiles(process.argv[3]||await workspaceProject());
    await page.locator('.sw-space [data-unit]').first().waitFor();
    const run=page.locator('#event-analysis-button');await run.click();
    const panels=page.locator('#analysis-pages > section'),first=panels.first();
    await first.locator('[name=eventType] option[value=image_change]').waitFor({state:'attached'});
    const inputs=first.locator('[data-ea-inputs]');
    assert(await inputs.evaluate(el=>el.open));
    assert.equal(await first.locator('[data-ea-unit]').count(),0);
    const advanced=first.locator('[data-ea-settings]'), tips=inputs.locator('.context-help:visible'), tooltip=page.locator('#context-tooltip');
    assert(await inputs.locator('[name=start]').isVisible());
    await advanced.locator('summary').click();
    for(const name of ['coverage','timeScale','k','normalization','seed','excludeRepeated','stability']){
      const parameter=advanced.locator('[name='+name+']').locator('xpath=ancestor::div[contains(concat(" ", @class, " ")," ea-parameter ") or contains(concat(" ", @class, " ")," ea-check ")][1]');
      assert(await parameter.locator('.context-help').isVisible(),'Missing help for '+name);
    }
    const descriptions=await tips.evaluateAll(buttons=>buttons.map(button=>button.title));
    assert.equal(new Set(descriptions).size,descriptions.length);assert(descriptions.every(text=>text.length>30));
    const scale=first.locator('[name=timeScale]'), readWindow=()=>Promise.all(['start','end','binWidth'].map(name=>inputs.locator('[name='+name+']').inputValue()));
    for(const [name,window] of [['fast',['-0.1','0.4','0.005']],['behavior',['-2','3','0.05']],['slow',['-120','120','1']]]){
      await scale.selectOption(name);assert.deepEqual(await readWindow(),window);
      assert(await first.locator('[data-ea-capacity]').isVisible());
    }
    await inputs.locator('[name=end]').fill('60');await inputs.locator('[name=end]').press('Tab');assert.equal(await scale.inputValue(),'custom');
    await inputs.locator('[name=binWidth]').fill('0.07');await inputs.locator('[name=binWidth]').press('Tab');
    assert.match(await first.locator('[data-ea-capacity]').innerText(),/divid|整数|complet/i);
    await scale.selectOption('autoScale');assert.notDeepEqual(await readWindow(),['-120','60','1']);
    const checkbox=advanced.locator('[name=stability]'),hint=tips.last(),initial=await checkbox.isChecked();
    await hint.hover();assert(await tooltip.isHidden());await page.waitForFunction(()=>!document.querySelector('#context-tooltip').hidden,null,{timeout:1000});
    assert.equal(await tooltip.innerText(),descriptions.at(-1));
    assert.equal(await hint.getAttribute('aria-describedby'),'context-tooltip');
    await page.keyboard.press('Escape');await hint.click();assert(await tooltip.isVisible());assert.equal(await checkbox.isChecked(),initial);
    await checkbox.focus();await page.keyboard.press('Tab');assert(await tooltip.isVisible());
    await page.keyboard.press('Escape');assert(await tooltip.isHidden());assert(await first.isVisible());
    await hint.tap();assert(await tooltip.isVisible());assert.equal(await checkbox.isChecked(),initial);
    const count=advanced.locator('[name=repeats]'),field=first.locator('[name=conditionField]');
    await advanced.locator('[name=k]').fill('2');await advanced.locator('[name=k]').press('Tab');
    assert(await count.isHidden());await checkbox.check();assert.equal(await count.inputValue(),'50');assert.match(await first.locator('[data-ea-capacity]').innerText(),/split limit|可分半|divisiones/);
    await field.selectOption('');assert.equal(await count.inputValue(),'50');
    await count.fill('3');await count.press('Tab');await field.selectOption('side');assert.equal(await count.inputValue(),'3');
    await first.locator('[name=referenceValue]').selectOption('"right"');
    await first.locator('[name=comparisonValue]').selectOption('"left"');
    for(const invalid of ['0','1001','2.5']){await count.fill(invalid);assert(!await count.evaluate(input=>input.checkValidity()));}
    await checkbox.uncheck();assert(await count.isDisabled());await checkbox.check();
    await count.fill('3');await advanced.locator('[name=k]').fill('2');
    await advanced.locator('summary').click();
    await page.waitForFunction(()=>document.querySelector('#behavior-video').readyState>=2);
    const videoUrl=await page.locator('#behavior-video').evaluate(v=>v.currentSrc);
    for(const layout of ['side','stacked']){
      await page.locator('[data-workspace-layout='+layout+']').click();
      const video=await page.locator('#behavior-video').boundingBox(), analysis=await first.boundingBox();
      assert(video?.width>0&&analysis?.width>0&&await page.locator('#mini-probe').isVisible());
      if(layout==='side')assert(analysis.x+analysis.width<=video.x+2);
      else assert(video.y+video.height<=analysis.y+2);
      assert.equal(await page.locator('#activity-canvas-frame').isVisible(),false);
      assert.equal(await page.locator('#behavior-video').evaluate(v=>v.currentSrc),videoUrl);
    }
    await page.setViewportSize({width:800,height:850});
    assert(await first.isVisible()&&await page.locator('#behavior-video').isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.setViewportSize({width:1480,height:930});await page.locator('[data-workspace-layout=side]').click();
    await first.locator('[data-ea-run]').click();
    const image=first.locator('[data-ea-unit] canvas').first();await image.waitFor();
    const method=first.locator('[data-ea-method]');
    await method.locator('summary').click();
    assert.match(await first.locator('[data-ea-method-text]').innerText(),/3\/3/);
    await method.locator('[data-ea-action=save]').click();
    await first.locator('[data-ea-status]').filter({hasText:/saved|已保存|guardad/i}).waitFor();
    await page.locator('#open-folder-button').click();await page.locator('[data-project-action=open-saved-clusters]').click();
    const restored=panels.nth(1);await restored.locator('[data-ea-unit]').first().waitFor();
    assert(await restored.locator('[name=stability]').isChecked());assert.equal(await restored.locator('[name=repeats]').inputValue(),'3');
    assert.equal(await restored.locator('[name=conditionField]').inputValue(),'side');
    assert.equal(await restored.locator('[name=referenceValue]').inputValue(),'"right"');
    assert.equal(await restored.locator('[name=comparisonValue]').inputValue(),'"left"');
    await page.locator('[data-analysis-close]').nth(1).click();await page.locator('[data-analysis-tab]').first().click();
    assert(await image.evaluate(c=>c.height>0&&c.getBoundingClientRect().height<=180&&new Set(c.getContext('2d').getImageData(0,0,c.width,c.height).data).size>3));
    const download=page.waitForEvent('download');await first.locator('[data-ea-png]').click();
    const file=await download, bytes=await fs.readFile(await file.path());assert.match(file.suggestedFilename(),/clusters\.png$/);assert.equal(bytes.subarray(1,4).toString(),'PNG');
    if(process.env.TAB_REVIEW_SCREENSHOT){
      await file.saveAs(process.env.TAB_REVIEW_SCREENSHOT.replace(/\.png$/i,'-plot.png'));
      await image.scrollIntoViewIfNeeded();await page.screenshot({path:process.env.TAB_REVIEW_SCREENSHOT});
    }
    const unit=first.locator('[data-ea-unit]').first(),id=await unit.getAttribute('data-ea-unit');await unit.click();
    const trial=first.locator('[data-ea-trial]').first();await trial.waitFor();await trial.click();
    const tabs=page.locator('[data-analysis-tab]'),signal=page.locator('[data-analysis-signal]'),create=page.locator('#analysis-tabs select');
    await page.waitForFunction(()=>document.querySelector('[data-analysis-signal]').getAttribute('aria-pressed')==='true');
    await tabs.first().click();assert.equal(await unit.getAttribute('aria-pressed'),'true');assert.equal(await unit.getAttribute('data-ea-unit'),id);
    await run.click();await panels.nth(1).waitFor();assert.equal(await tabs.count(),2);
    assert(await panels.nth(1).locator('[data-ea-inputs]').evaluate(el=>el.open));
    assert.equal(await panels.nth(1).locator('[data-ea-unit]').count(),0);
    await panels.nth(1).locator('[data-ea-run]').click();
    await panels.nth(1).locator('[data-ea-unit]').first().waitFor();
    assert.equal(await panels.nth(1).locator('[data-ea-action=shape-groups]').getAttribute('aria-pressed'),'false');
    await create.selectOption('dynamics');await panels.nth(2).locator('[data-pd-run]').waitFor();
    assert.equal(await create.locator('option[value=patterns]').count(),0);
    await tabs.first().click();assert.equal(await unit.getAttribute('aria-pressed'),'true');
    await page.locator('[data-analysis-close]').last().click();assert.equal(await tabs.count(),2);
    await page.keyboard.press('Escape');await signal.click();await run.waitFor();assert.equal(await tabs.count(),2);
    const camera=page.locator('[data-close-video]:visible').first();
    const hasCamera=await camera.count()>0;
    const attr=hasCamera?'data-close-video':'data-close-recording';
    const source=hasCamera?camera:page.locator('[data-close-recording]:visible').first();
    const sourceId=await source.getAttribute(attr);await source.click();
    await page.locator('['+attr+'='+JSON.stringify(sourceId)+']').waitFor({state:'detached'});
    await tabs.first().click();await trial.click();
    const warning=page.locator('.toast[data-severity=error]').first();
    await warning.waitFor();assert.match(await warning.innerText(),hasCamera?/video|视频/i:/probe/i);
    await tabs.first().click();assert.equal(await unit.getAttribute('aria-pressed'),'true');
    assert.deepEqual(errors,[]);console.log('PASS signal-pane tabs with the same video in side, stacked and narrow layouts; compact plot, PNG, trial return, new analysis, existing tab recall and closed-source message.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
