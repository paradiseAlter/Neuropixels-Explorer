// SPDX-License-Identifier: MIT
'use strict';
async function setExplorerPreference(page, selector, value) {
  const dialog=page.locator('#workspace-settings');
  await page.locator('#settings-button').click();
  await dialog.locator(selector).selectOption(value);
  await dialog.locator('form[method=dialog] button').click();
}
module.exports={setExplorerPreference};
