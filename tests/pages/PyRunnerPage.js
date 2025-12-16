/**
 * Page Object Model for PyRunner Extension
 * Encapsulates UI interactions and selectors
 */
class PyRunnerPage {
  constructor(page) {
    this.page = page;

    // Main drawer selectors
    this.drawerButton = '#pyrunner-button';
    this.drawerToggle = '#pyrunner-button .drawer-toggle';
    this.drawerContent = '#pyrunner_drawer';

    // Enable toggle
    this.enabledCheckbox = '#pyrunner_enabled';

    // Collapsible sections
    this.sections = {
      mode: { header: '[data-target="pyrunner_section_mode"]', content: '#pyrunner_section_mode' },
      venv: { header: '[data-target="pyrunner_section_venv"]', content: '#pyrunner_section_venv' },
      functions: { header: '[data-target="pyrunner_section_functions"]', content: '#pyrunner_section_functions' },
      logging: { header: '[data-target="pyrunner_section_logging"]', content: '#pyrunner_section_logging' },
      settings: { header: '[data-target="pyrunner_section_settings"]', content: '#pyrunner_section_settings' },
      help: { header: '[data-target="pyrunner_section_help"]', content: '#pyrunner_section_help' }
    };

    // Mode section
    this.modeRadios = {
      pyodide: 'input[name="pyrunner_mode"][value="pyodide"]',
      server: 'input[name="pyrunner_mode"][value="server"]'
    };
    this.serverStatus = '#pyrunner_server_status';
    this.modeBadge = '#pyrunner_mode_badge';

    // Virtual Environments section
    this.venvSelect = '#pyrunner_venv_select';
    this.venvNameInput = '#pyrunner_venv_name';
    this.createVenvButton = '#pyrunner_create_venv';
    this.deleteVenvButton = '#pyrunner_delete_venv';
    this.venvBadge = '#pyrunner_venv_badge';

    // Package Management
    this.packageInput = '#pyrunner_package_input';
    this.installPackagesButton = '#pyrunner_install_packages';
    this.refreshPackagesButton = '#pyrunner_refresh_packages';
    this.packagesList = '#pyrunner_packages_list';

    // Functions Library section
    this.scopeCharacterButton = '#pyrunner_scope_character';
    this.scopeGlobalButton = '#pyrunner_scope_global';
    this.funcModeSelect = '#pyrunner_func_mode_select';
    this.funcSearchInput = '#pyrunner_func_search';
    this.functionsList = '#pyrunner_functions_list';
    this.createFunctionButton = '#pyrunner_create_function';
    this.funcCountBadge = '#pyrunner_func_count_badge';

    // Function Modal
    this.modal = '#pyrunner_func_modal';
    this.modalTitle = '#pyrunner_modal_title';
    this.modalNameInput = '#pyrunner_func_name';
    this.modalDescInput = '#pyrunner_func_desc';
    this.modalArgsInput = '#pyrunner_func_args';
    this.modalCodeInput = '#pyrunner_func_code';
    this.modalTarget = '#pyrunner_func_target';
    this.modalCloseButton = '#pyrunner_modal_close';
    this.modalCancelButton = '#pyrunner_modal_cancel';
    this.modalSaveButton = '#pyrunner_modal_save';

    // Settings section
    this.timeoutInput = '#pyrunner_timeout';
  }

  // Navigation methods
  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async openDrawer() {
    const drawer = await this.page.locator(this.drawerContent);
    const isOpen = await drawer.evaluate(el => !el.classList.contains('closedDrawer'));

    if (!isOpen) {
      await this.page.click(this.drawerToggle);
      await this.page.waitForTimeout(300); // Wait for animation
    }
  }

  async closeDrawer() {
    const drawer = await this.page.locator(this.drawerContent);
    const isOpen = await drawer.evaluate(el => !el.classList.contains('closedDrawer'));

    if (isOpen) {
      await this.page.click(this.drawerToggle);
      await this.page.waitForTimeout(300);
    }
  }

  async isDrawerOpen() {
    const drawer = await this.page.locator(this.drawerContent);
    return await drawer.evaluate(el => !el.classList.contains('closedDrawer'));
  }

  // Enable/Disable toggle
  async enableExtension() {
    await this.openDrawer();
    const checkbox = this.page.locator(this.enabledCheckbox);
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await checkbox.check();
      await this.page.waitForTimeout(200);
    }
  }

  async disableExtension() {
    await this.openDrawer();
    const checkbox = this.page.locator(this.enabledCheckbox);
    const isChecked = await checkbox.isChecked();
    if (isChecked) {
      await checkbox.uncheck();
      await this.page.waitForTimeout(200);
    }
  }

  async isExtensionEnabled() {
    return await this.page.locator(this.enabledCheckbox).isChecked();
  }

  // Collapsible sections
  async expandSection(sectionName) {
    const section = this.sections[sectionName];
    if (!section) throw new Error(`Unknown section: ${sectionName}`);

    const header = this.page.locator(section.header);
    const isCollapsed = await header.evaluate(el => el.classList.contains('collapsed'));

    if (isCollapsed) {
      await header.click();
      await this.page.waitForTimeout(200);
    }
  }

  async collapseSection(sectionName) {
    const section = this.sections[sectionName];
    if (!section) throw new Error(`Unknown section: ${sectionName}`);

    const header = this.page.locator(section.header);
    const isCollapsed = await header.evaluate(el => el.classList.contains('collapsed'));

    if (!isCollapsed) {
      await header.click();
      await this.page.waitForTimeout(200);
    }
  }

  async isSectionExpanded(sectionName) {
    const section = this.sections[sectionName];
    if (!section) throw new Error(`Unknown section: ${sectionName}`);

    const header = this.page.locator(section.header);
    return await header.evaluate(el => !el.classList.contains('collapsed'));
  }

  // Mode selection
  async selectMode(mode) {
    await this.openDrawer();
    await this.expandSection('mode');
    const radio = this.page.locator(this.modeRadios[mode]);
    await radio.check();
    await this.page.waitForTimeout(300);
  }

  async getSelectedMode() {
    const pyodideRadio = this.page.locator(this.modeRadios.pyodide);
    const isPyodideChecked = await pyodideRadio.isChecked();
    return isPyodideChecked ? 'pyodide' : 'server';
  }

  async getServerStatus() {
    return await this.page.locator(this.serverStatus).textContent();
  }

  // Virtual Environments
  async createVenv(name) {
    await this.openDrawer();
    await this.expandSection('venv');
    await this.page.fill(this.venvNameInput, name);
    await this.page.click(this.createVenvButton);
    await this.page.waitForTimeout(500); // Wait for creation
  }

  async selectVenv(name) {
    await this.openDrawer();
    await this.expandSection('venv');
    await this.page.selectOption(this.venvSelect, name);
    await this.page.waitForTimeout(300);
  }

  async deleteVenv() {
    await this.openDrawer();
    await this.expandSection('venv');

    // Handle confirmation dialog
    this.page.once('dialog', dialog => dialog.accept());
    await this.page.click(this.deleteVenvButton);
    await this.page.waitForTimeout(500);
  }

  async getSelectedVenv() {
    const select = this.page.locator(this.venvSelect);
    return await select.inputValue();
  }

  async isDeleteVenvButtonDisabled() {
    return await this.page.locator(this.deleteVenvButton).isDisabled();
  }

  // Package Management
  async installPackage(packageName) {
    await this.openDrawer();
    await this.expandSection('venv');
    await this.page.fill(this.packageInput, packageName);
    await this.page.click(this.installPackagesButton);
    await this.page.waitForTimeout(1000); // Wait for installation
  }

  async refreshPackageList() {
    await this.openDrawer();
    await this.expandSection('venv');
    await this.page.click(this.refreshPackagesButton);
    await this.page.waitForTimeout(500);
  }

  async getPackageList() {
    const listEl = this.page.locator(this.packagesList);
    const packageItems = await listEl.locator('.pyrunner-package-item').all();
    const packages = [];

    for (const item of packageItems) {
      const text = await item.textContent();
      packages.push(text.trim());
    }

    return packages;
  }

  async uninstallPackage(packageName) {
    await this.openDrawer();
    await this.expandSection('venv');

    const packageItem = this.page.locator(`.pyrunner-package-item[data-package="${packageName}"]`);
    await packageItem.click();

    // Wait for popup and click uninstall
    await this.page.waitForSelector('.pyrunner-package-popup');

    // Handle confirmation dialog
    this.page.once('dialog', dialog => dialog.accept());
    await this.page.click('[data-action="uninstall"]');
    await this.page.waitForTimeout(500);
  }

  // Functions Library
  async switchScope(scope) {
    await this.openDrawer();
    await this.expandSection('functions');

    if (scope === 'character') {
      await this.page.click(this.scopeCharacterButton);
    } else if (scope === 'global') {
      await this.page.click(this.scopeGlobalButton);
    }

    await this.page.waitForTimeout(200);
  }

  async getSelectedScope() {
    const charButton = this.page.locator(this.scopeCharacterButton);
    const isCharSelected = await charButton.evaluate(el => el.classList.contains('menu_button_selected'));
    return isCharSelected ? 'character' : 'global';
  }

  async selectFuncMode(mode) {
    await this.openDrawer();
    await this.expandSection('functions');
    await this.page.selectOption(this.funcModeSelect, mode);
    await this.page.waitForTimeout(200);
  }

  async searchFunctions(query) {
    await this.openDrawer();
    await this.expandSection('functions');
    await this.page.fill(this.funcSearchInput, query);
    await this.page.waitForTimeout(300);
  }

  async getFunctionsList() {
    const listEl = this.page.locator(this.functionsList);
    const funcItems = await listEl.locator('.pyrunner-function-item').all();
    const functions = [];

    for (const item of funcItems) {
      const name = await item.locator('.pyrunner-function-name').textContent();
      const desc = await item.locator('.pyrunner-function-desc').textContent();
      functions.push({ name: name.trim(), description: desc.trim() });
    }

    return functions;
  }

  async getFunctionCount() {
    const badge = this.page.locator(this.funcCountBadge);
    const text = await badge.textContent();
    return parseInt(text);
  }

  async openCreateFunctionModal() {
    await this.openDrawer();
    await this.expandSection('functions');
    await this.page.click(this.createFunctionButton);
    await this.page.waitForSelector(this.modal, { state: 'visible' });
  }

  async editFunction(functionName) {
    await this.openDrawer();
    await this.expandSection('functions');
    const editBtn = this.page.locator(`.pyrunner-func-edit[data-name="${functionName}"]`);
    await editBtn.click();
    await this.page.waitForSelector(this.modal, { state: 'visible' });
  }

  async deleteFunction(functionName) {
    await this.openDrawer();
    await this.expandSection('functions');

    // Handle confirmation dialog
    this.page.once('dialog', dialog => dialog.accept());

    const deleteBtn = this.page.locator(`.pyrunner-func-delete[data-name="${functionName}"]`);
    await deleteBtn.click();
    await this.page.waitForTimeout(300);
  }

  // Function Modal
  async isModalOpen() {
    const modal = this.page.locator(this.modal);
    const display = await modal.evaluate(el => window.getComputedStyle(el).display);
    return display !== 'none';
  }

  async getModalTitle() {
    return await this.page.locator(this.modalTitle).textContent();
  }

  async fillFunctionForm(data) {
    if (data.name !== undefined) {
      await this.page.fill(this.modalNameInput, data.name);
    }
    if (data.description !== undefined) {
      await this.page.fill(this.modalDescInput, data.description);
    }
    if (data.arguments !== undefined) {
      await this.page.fill(this.modalArgsInput, data.arguments);
    }
    if (data.code !== undefined) {
      await this.page.fill(this.modalCodeInput, data.code);
    }
  }

  async getFunctionFormData() {
    return {
      name: await this.page.inputValue(this.modalNameInput),
      description: await this.page.inputValue(this.modalDescInput),
      arguments: await this.page.inputValue(this.modalArgsInput),
      code: await this.page.inputValue(this.modalCodeInput)
    };
  }

  async getModalTarget() {
    return await this.page.locator(this.modalTarget).textContent();
  }

  async saveFunction() {
    await this.page.click(this.modalSaveButton);
    await this.page.waitForTimeout(300);
  }

  async cancelModal() {
    await this.page.click(this.modalCancelButton);
    await this.page.waitForTimeout(200);
  }

  async closeModal() {
    await this.page.click(this.modalCloseButton);
    await this.page.waitForTimeout(200);
  }

  // Chat/Command execution
  async executeCommand(command) {
    const chatInput = this.page.locator('#send_textarea');
    // Pipe output to /sendas to display in chat window
    if (!command.includes('|')) {
      command = `${command} | /sendas name=System`;
    }
    await chatInput.fill(command);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500);
  }

  async getLastChatMessage() {
    const messages = this.page.locator('.mes');
    const lastMessage = messages.last();
    return await lastMessage.locator('.mes_text').textContent();
  }

  // Settings
  async setTimeout(value) {
    await this.openDrawer();
    await this.expandSection('settings');
    await this.page.fill(this.timeoutInput, value.toString());
  }

  async getTimeout() {
    const input = this.page.locator(this.timeoutInput);
    return parseInt(await input.inputValue());
  }
}

module.exports = { PyRunnerPage };
