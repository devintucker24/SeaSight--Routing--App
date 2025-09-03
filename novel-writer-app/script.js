// Novel Writer App - Main JavaScript File

class NovelWriter {
    constructor() {
        this.currentChapter = 1;
        this.chapters = {
            1: {
                title: 'Chapter 1',
                content: '<p>Start writing your novel here...</p>'
            }
        };
        this.novelData = {
            title: '',
            summary: '',
            chapters: this.chapters
        };
        this.worldbuilding = { // Old structure, will be populated from codexEntries
            magic: [],
            power: [],
            location: [],
            character: [],
            lore: [],
            progression: []
        };
        this.codexEntries = []; // New unified structure for all worldbuilding entries
        this.apiKey = localStorage.getItem('openrouter_api_key') || '';
        this.selectedModel = 'anthropic/claude-3-haiku'; // Default model
        this.undoStack = [];
        this.redoStack = [];
        this.currentTab = 'writing';
        this.editingEntry = null;
        this.currentCodexCategory = 'all'; // Default filter for codex

        // Floating AI Toolbar elements
        this.floatingAiToolbar = null;
        this.aiModelFloatingSelect = null;
        this.aiRephraseBtn = null;
        this.aiExpandBtn = null;
        this.aiSummarizeBtn = null;

        // Codex UI elements
        this.codexSearchInput = null;
        this.codexCategoryButtons = null;
        this.addCodexEntryBtn = null;
        this.codexList = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFromStorage();
        this.updateStats();
        this.setupAutoSave();
        this.setupFloatingAiToolbar();
        this.setupCodexSystem(); // New setup for codex system
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('closeSettingsModal').addEventListener('click', () => this.closeSettings());
        document.getElementById('openrouterKey').addEventListener('input', (e) => this.saveApiKey(e.target.value));

        // Chapter management
        document.getElementById('addChapterBtn').addEventListener('click', () => this.addChapter());
        document.addEventListener('click', (e) => {
            if (e.target.closest('.chapter-item')) {
                const chapterNum = parseInt(e.target.closest('.chapter-item').dataset.chapter);
                this.switchChapter(chapterNum);
            }
            if (e.target.closest('.chapter-delete')) {
                e.stopPropagation();
                const chapterNum = parseInt(e.target.closest('.chapter-item').dataset.chapter);
                this.deleteChapter(chapterNum);
            }
        });

        // Worldbuilding modal (now used for Codex entries)
        document.getElementById('closeWorldbuildingModal').addEventListener('click', () => this.closeWorldbuildingModal());
        document.getElementById('cancelWorldbuilding').addEventListener('click', () => this.closeWorldbuildingModal());
        document.getElementById('worldbuildingForm').addEventListener('submit', (e) => this.saveCodexEntry(e)); // Changed to saveCodexEntry
        document.getElementById('entryType').addEventListener('change', (e) => this.toggleConditionalFields(e.target.value));

        // Editor tools
        document.getElementById('boldBtn').addEventListener('click', () => this.formatText('bold'));
        document.getElementById('italicBtn').addEventListener('click', () => this.formatText('italic'));
        document.getElementById('underlineBtn').addEventListener('click', () => this.formatText('underline'));
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());

        // AI Modal
        document.getElementById('closeModal').addEventListener('click', () => this.closeAIModal());
        document.getElementById('acceptSuggestion').addEventListener('click', () => this.acceptSuggestion());
        document.getElementById('rejectSuggestion').addEventListener('click', () => this.closeAIModal());

        // Save and Export
        document.getElementById('saveBtn').addEventListener('click', () => this.saveNovel());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportNovel());

        // Novel info
        document.getElementById('novelTitle').addEventListener('input', (e) => {
            this.novelData.title = e.target.value;
            this.saveToStorage();
        });
        document.getElementById('novelSummary').addEventListener('input', (e) => {
            this.novelData.summary = e.target.value;
            this.saveToStorage();
        });

        // Editor content changes
        const editor = document.getElementById('textEditor');
        editor.addEventListener('input', () => {
            this.saveCurrentChapter();
            this.updateStats();
            // this.highlightWorldbuildingTerms(); // Call highlight function on input - Temporarily disabled for focus issue
        });
        editor.addEventListener('click', (e) => { // Add click listener for highlighted terms
            const highlightedSpan = e.target.closest('.worldbuilding-highlight');
            if (highlightedSpan) {
                const id = highlightedSpan.dataset.id;
                const type = highlightedSpan.dataset.type;
                this.viewCodexEntry(id, type); // Changed to viewCodexEntry
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Modal close on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });

        // Codex item interactions (replaces old worldbuilding item interactions)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.codex-entry-item') && !e.target.closest('.action-btn')) {
                const item = e.target.closest('.codex-entry-item');
                this.viewCodexEntry(item.dataset.id, item.dataset.type);
            }
            if (e.target.closest('.action-btn.edit')) {
                e.stopPropagation();
                const item = e.target.closest('.codex-entry-item');
                this.editCodexEntry(item.dataset.id, item.dataset.type);
            }
            if (e.target.closest('.action-btn.delete')) {
                e.stopPropagation();
                const item = e.target.closest('.codex-entry-item');
                this.deleteCodexEntry(item.dataset.id, item.dataset.type);
            }
        });

        // Floating AI Toolbar events
        editor.addEventListener('mouseup', () => this.handleTextSelection());
        editor.addEventListener('keyup', () => this.handleTextSelection());
        document.addEventListener('selectionchange', () => this.handleTextSelection()); // More robust selection change detection

        // New AI toolbar buttons
        this.aiRephraseBtn = document.getElementById('aiRephraseBtn');
        this.aiExpandBtn = document.getElementById('aiExpandBtn');
        this.aiSummarizeBtn = document.getElementById('aiSummarizeBtn');

        if (this.aiRephraseBtn) this.aiRephraseBtn.addEventListener('click', () => this.rephraseSelectedText());
        if (this.aiExpandBtn) this.aiExpandBtn.addEventListener('click', () => this.expandSelectedText());
        if (this.aiSummarizeBtn) this.aiSummarizeBtn.addEventListener('click', () => this.summarizeSelectedText());
    }

    setupFloatingAiToolbar() {
        this.floatingAiToolbar = document.getElementById('floatingAiToolbar');
        this.aiModelFloatingSelect = document.getElementById('aiModelFloating');

        if (this.aiModelFloatingSelect) {
            this.aiModelFloatingSelect.addEventListener('change', (e) => {
                this.selectedModel = e.target.value;
            });
            // Set initial selected model from the dropdown
            this.selectedModel = this.aiModelFloatingSelect.value;
        }
    }

    setupCodexSystem() {
        this.codexSearchInput = document.getElementById('codexSearch');
        this.codexCategoryButtons = document.querySelectorAll('.codex-category-btn');
        this.addCodexEntryBtn = document.getElementById('addCodexEntryBtn');
        this.codexList = document.getElementById('codexList');

        if (this.codexSearchInput) {
            this.codexSearchInput.addEventListener('input', () => this.renderCodexList());
        }

        if (this.codexCategoryButtons) {
            this.codexCategoryButtons.forEach(btn => {
                btn.addEventListener('click', (e) => this.handleCategoryFilter(e.target.dataset.category));
            });
        }

        if (this.addCodexEntryBtn) {
            this.addCodexEntryBtn.addEventListener('click', () => this.openCodexEntryModal('magic')); // Default to magic for new entry
        }

        this.renderCodexList(); // Initial render of codex list
    }

    handleTextSelection() {
        const selection = window.getSelection();
        const editor = document.getElementById('textEditor');

        // Check if selection is within the editor and is not empty
        if (selection.rangeCount > 0 && !selection.isCollapsed && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const editorRect = editor.getBoundingClientRect();

            // Position the toolbar above the selection
            const toolbarX = rect.left + (rect.width / 2) - (this.floatingAiToolbar.offsetWidth / 2);
            const toolbarY = rect.top - this.floatingAiToolbar.offsetHeight - 10; // 10px above selection

            this.showFloatingAiToolbar(toolbarX, toolbarY);
        } else {
            this.hideFloatingAiToolbar();
        }
    }

    showFloatingAiToolbar(x, y) {
        if (this.floatingAiToolbar) {
            this.floatingAiToolbar.style.left = `${x}px`;
            this.floatingAiToolbar.style.top = `${y}px`;
            this.floatingAiToolbar.style.display = 'flex';
        }
    }

    hideFloatingAiToolbar() {
        if (this.floatingAiToolbar) {
            this.floatingAiToolbar.style.display = 'none';
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.saveNovel();
                    break;
                case 'b':
                    e.preventDefault();
                    this.formatText('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    this.formatText('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    this.formatText('underline');
                    break;
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    break;
            }
        }
    }

    // Chapter Management
    addChapter() {
        const newChapterNum = Math.max(...Object.keys(this.chapters).map(Number)) + 1;
        this.chapters[newChapterNum] = {
            title: `Chapter ${newChapterNum}`,
            content: '<p></p>'
        };
        this.renderChaptersList();
        this.switchChapter(newChapterNum);
        this.saveToStorage();
    }

    deleteChapter(chapterNum) {
        if (Object.keys(this.chapters).length <= 1) {
            this.showNotification('Cannot delete the last chapter', 'error');
            return;
        }

        if (confirm(`Are you sure you want to delete Chapter ${chapterNum}?`)) {
            delete this.chapters[chapterNum];
            
            // Switch to first available chapter
            const availableChapters = Object.keys(this.chapters).map(Number).sort((a, b) => a - b);
            this.switchChapter(availableChapters[0]);
            
            this.renderChaptersList();
            this.saveToStorage();
        }
    }

    switchChapter(chapterNum) {
        this.saveCurrentChapter();
        this.currentChapter = chapterNum;
        
        const editor = document.getElementById('textEditor');
        editor.innerHTML = this.chapters[chapterNum].content;
        
        document.getElementById('currentChapterTitle').textContent = this.chapters[chapterNum].title;
        
        // Update active chapter in sidebar
        document.querySelectorAll('.chapter-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.chapter) === chapterNum) {
                item.classList.add('active');
            }
        });
        
        this.updateStats();
        editor.classList.add('chapter-transition');
        setTimeout(() => editor.classList.remove('chapter-transition'), 300);
    }

    saveCurrentChapter() {
        const editor = document.getElementById('textEditor');
        this.chapters[this.currentChapter].content = editor.innerHTML;
        this.saveToStorage();
    }

    renderChaptersList() {
        const chaptersList = document.getElementById('chaptersList');
        const sortedChapters = Object.keys(this.chapters).map(Number).sort((a, b) => a - b);
        
        chaptersList.innerHTML = sortedChapters.map(chapterNum => `
            <div class="chapter-item ${chapterNum === this.currentChapter ? 'active' : ''}" data-chapter="${chapterNum}">
                <span class="chapter-number">${chapterNum}</span>
                <span class="chapter-title">${this.chapters[chapterNum].title}</span>
                <button class="chapter-delete" title="Delete Chapter">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    // Text Formatting
    formatText(command) {
        document.execCommand(command, false, null);
        this.saveCurrentChapter();
        
        // Update button states
        const button = document.getElementById(command + 'Btn');
        if (button) {
            button.classList.toggle('active', document.queryCommandState(command));
        }
    }

    undo() {
        if (this.undoStack.length > 0) {
            const currentState = document.getElementById('textEditor').innerHTML;
            this.redoStack.push(currentState);
            const previousState = this.undoStack.pop();
            document.getElementById('textEditor').innerHTML = previousState;
            this.saveCurrentChapter();
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const currentState = document.getElementById('textEditor').innerHTML;
            this.undoStack.push(currentState);
            const nextState = this.redoStack.pop();
            document.getElementById('textEditor').innerHTML = nextState;
            this.saveCurrentChapter();
        }
    }

    // Tab Management
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');
    }

    // Codex Management (replaces old Worldbuilding Management)
    openCodexEntryModal(type) {
        this.editingEntry = null;
        document.getElementById('worldbuildingModalTitle').textContent = `Add ${this.getTypeDisplayName(type)}`;
        document.getElementById('entryType').value = type;
        this.toggleConditionalFields(type);
        this.clearWorldbuildingForm();
        document.getElementById('worldbuildingModal').classList.add('active');
    }

    editCodexEntry(id, type) {
        const entry = this.codexEntries.find(item => item.id === id && item.type === type);
        if (!entry) return;

        this.editingEntry = { id, type };
        document.getElementById('worldbuildingModalTitle').textContent = `Edit ${this.getTypeDisplayName(type)}`;
        
        // Populate form
        document.getElementById('entryName').value = entry.name;
        document.getElementById('entryType').value = type;
        document.getElementById('entryAliases').value = entry.aliases.join(', ');
        document.getElementById('entryDescription').value = entry.description;

        // Populate type-specific fields
        this.populateTypeSpecificFields(entry, type);
        this.toggleConditionalFields(type);
        
        document.getElementById('worldbuildingModal').classList.add('active');
    }

    populateTypeSpecificFields(entry, type) {
        switch (type) {
            case 'magic':
                if (entry.source) document.getElementById('magicSource').value = entry.source;
                if (entry.limitations) document.getElementById('magicLimitations').value = entry.limitations;
                if (entry.rules) document.getElementById('magicRules').value = entry.rules;
                break;
            case 'power':
                if (entry.levels) document.getElementById('powerLevels').value = entry.levels;
                if (entry.progression) document.getElementById('powerProgression').value = entry.progression;
                break;
            case 'character':
                if (entry.level) document.getElementById('characterLevel').value = entry.level;
                if (entry.class) document.getElementById('characterClass').value = entry.class;
                if (entry.abilities) document.getElementById('characterAbilities').value = entry.abilities;
                break;
            case 'location':
                if (entry.locationType) document.getElementById('locationType').value = entry.locationType;
                if (entry.danger) document.getElementById('locationDanger').value = entry.danger;
                break;
            case 'progression':
                if (entry.current) document.getElementById('progressionCurrent').value = entry.current;
                if (entry.next) document.getElementById('progressionNext').value = entry.next;
                if (entry.requirements) document.getElementById('progressionRequirements').value = entry.requirements;
                break;
        }
    }

    viewCodexEntry(id, type) {
        const entry = this.codexEntries.find(item => item.id === id && item.type === type);
        if (!entry) return;

        let content = `<h3>${entry.name}</h3>`;
        content += `<p><strong>Type:</strong> ${this.getTypeDisplayName(type)}</p>`;
        content += `<p><strong>Description:</strong> ${entry.description}</p>`;
        
        if (entry.aliases && entry.aliases.length > 0) {
            content += `<p><strong>Keywords:</strong> ${entry.aliases.join(', ')}</p>`;
        }

        // Add type-specific details
        content += this.getTypeSpecificDisplay(entry, type);

        this.showAIResponse(content, `${entry.name} Details`, false);
    }

    getTypeSpecificDisplay(entry, type) {
        let content = '';
        switch (type) {
            case 'magic':
                if (entry.source) content += `<p><strong>Power Source:</strong> ${entry.source}</p>`;
                if (entry.limitations) content += `<p><strong>Limitations:</strong> ${entry.limitations}</p>`;
                if (entry.rules) content += `<p><strong>Rules:</strong> ${entry.rules}</p>`;
                break;
            case 'power':
                if (entry.levels) content += `<p><strong>Power Levels:</strong> ${entry.levels}</p>`;
                if (entry.progression) content += `<p><strong>Progression:</strong> ${entry.progression}</p>`;
                break;
            case 'character':
                if (entry.level) content += `<p><strong>Level:</strong> ${entry.level}</p>`;
                if (entry.class) content += `<p><strong>Class:</strong> ${entry.class}</p>`;
                if (entry.abilities) content += `<p><strong>Abilities:</strong> ${entry.abilities}</p>`;
                break;
            case 'location':
                if (entry.locationType) content += `<p><strong>Type:</strong> ${entry.locationType}</p>`;
                if (entry.danger) content += `<p><strong>Danger Level:</strong> ${entry.danger}</p>`;
                break;
            case 'progression':
                if (entry.current) content += `<p><strong>Current Level:</strong> ${entry.current}</p>`;
                if (entry.next) content += `<p><strong>Next Milestone:</strong> ${entry.next}</p>`;
                if (entry.requirements) content += `<p><strong>Requirements:</strong> ${entry.requirements}</p>`;
                break;
        }
        return content;
    }

    deleteCodexEntry(id, type) {
        const entryIndex = this.codexEntries.findIndex(item => item.id === id && item.type === type);
        if (entryIndex === -1) return;

        if (confirm(`Are you sure you want to delete "${this.codexEntries[entryIndex].name}"?`)) {
            this.codexEntries.splice(entryIndex, 1);
            this.renderCodexList();
            this.saveToStorage();
            this.showNotification('Entry deleted successfully', 'success');
        }
    }

    saveCodexEntry(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const type = document.getElementById('entryType').value;
        
        const entry = {
            id: this.editingEntry ? this.editingEntry.id : this.generateId(),
            name: document.getElementById('entryName').value,
            type: type,
            aliases: document.getElementById('entryAliases').value.split(',').map(s => s.trim()).filter(s => s),
            description: document.getElementById('entryDescription').value,
            createdAt: this.editingEntry ? this.codexEntries.find(item => item.id === this.editingEntry.id).createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Add type-specific fields
        this.addTypeSpecificFields(entry, type);

        if (this.editingEntry) {
            // Update existing entry
            const index = this.codexEntries.findIndex(item => item.id === this.editingEntry.id && item.type === this.editingEntry.type);
            this.codexEntries[index] = entry;
            this.showNotification('Entry updated successfully', 'success');
        } else {
            // Add new entry
            this.codexEntries.push(entry);
            this.showNotification('Entry added successfully', 'success');
        }

        this.renderCodexList();
        this.saveToStorage();
        this.closeWorldbuildingModal(); // Reusing the same modal
    }

    addTypeSpecificFields(entry, type) {
        switch (type) {
            case 'magic':
                entry.source = document.getElementById('magicSource').value;
                entry.limitations = document.getElementById('magicLimitations').value;
                entry.rules = document.getElementById('magicRules').value;
                break;
            case 'power':
                entry.levels = document.getElementById('powerLevels').value;
                entry.progression = document.getElementById('powerProgression').value;
                break;
            case 'character':
                entry.level = document.getElementById('characterLevel').value;
                entry.class = document.getElementById('characterClass').value;
                entry.abilities = document.getElementById('characterAbilities').value;
                break;
            case 'location':
                entry.locationType = document.getElementById('locationType').value;
                entry.danger = document.getElementById('locationDanger').value;
                break;
            case 'progression':
                entry.current = document.getElementById('progressionCurrent').value;
                entry.next = document.getElementById('progressionNext').value;
                entry.requirements = document.getElementById('progressionRequirements').value;
                break;
        }
    }

    toggleConditionalFields(type) {
        // Hide all conditional fields
        document.querySelectorAll('.conditional-fields').forEach(field => {
            field.style.display = 'none';
        });
        
        // Show relevant fields
        const fieldsMap = {
            magic: 'magicFields',
            power: 'powerFields',
            character: 'characterFields',
            location: 'locationFields',
            progression: 'progressionFields'
        };
        
        if (fieldsMap[type]) {
            document.getElementById(fieldsMap[type]).style.display = 'block';
        }
    }

    clearWorldbuildingForm() {
        document.getElementById('worldbuildingForm').reset();
        document.querySelectorAll('.conditional-fields').forEach(field => {
            field.style.display = 'none';
        });
    }

    closeWorldbuildingModal() {
        document.getElementById('worldbuildingModal').classList.remove('active');
        this.editingEntry = null;
    }

    // New Codex rendering and filtering
    renderCodexList() {
        if (!this.codexList) return;

        const searchTerm = this.codexSearchInput ? this.codexSearchInput.value.toLowerCase() : '';
        const filteredEntries = this.codexEntries.filter(entry => {
            const matchesSearch = searchTerm === '' || 
                                  entry.name.toLowerCase().includes(searchTerm) ||
                                  entry.description.toLowerCase().includes(searchTerm) ||
                                  entry.aliases.some(alias => alias.toLowerCase().includes(searchTerm));
            const matchesCategory = this.currentCodexCategory === 'all' || entry.type === this.currentCodexCategory;
            return matchesSearch && matchesCategory;
        });

        this.codexList.innerHTML = filteredEntries.map(entry => 
            this.createCodexEntryItemHTML(entry)
        ).join('');
    }

    createCodexEntryItemHTML(entry) {
        return `
            <div class="codex-entry-item" data-id="${entry.id}" data-type="${entry.type}">
                <div>
                    <span class="codex-entry-item-name">${entry.name}</span>
                    <span class="codex-entry-item-type">${this.getTypeDisplayName(entry.type)}</span>
                </div>
                <div class="codex-entry-item-actions">
                    <button class="action-btn edit" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    handleCategoryFilter(category) {
        this.currentCodexCategory = category;
        this.codexCategoryButtons.forEach(btn => {
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        this.renderCodexList();
    }

    getTypeDisplayName(type) {
        const names = {
            magic: 'Magic System',
            power: 'Power System',
            location: 'Location',
            character: 'Character',
            lore: 'Lore',
            progression: 'Progression'
        };
        return names[type] || type;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Enhanced AI Integration with Worldbuilding Context (now Codex Context)
    getWorldbuildingContext(text) {
        let context = '';
        const relevantEntries = [];

        // Search for aliases/keywords in the text
        this.codexEntries.forEach(entry => {
            entry.aliases.forEach(alias => {
                if (text.toLowerCase().includes(alias.toLowerCase())) {
                    relevantEntries.push(entry);
                }
            });
            
            // Also check if the entry name is mentioned
            if (text.toLowerCase().includes(entry.name.toLowerCase())) {
                relevantEntries.push(entry);
            }
        });

        // Remove duplicates
        const uniqueEntries = relevantEntries.filter((entry, index, self) => 
            index === self.findIndex(e => e.id === entry.id)
        );

        if (uniqueEntries.length > 0) {
            context += '\n\nRelevant Codex Context:\n';
            uniqueEntries.forEach(entry => {
                context += `\n${entry.name} (${this.getTypeDisplayName(entry.type)}): ${entry.description}`;
                if (entry.aliases.length > 0) {
                    context += ` [Keywords: ${entry.aliases.join(', ')}]`;
                }
            });
        }

        return context;
    }

    // AI Integration (unchanged, uses this.selectedModel)
    async getAISuggestions() {
        if (!this.apiKey) {
            this.showNotification('Please set your OpenRouter API key in settings', 'error');
            this.openSettings();
            return;
        }

        const editor = document.getElementById('textEditor');
        const currentText = this.getPlainText(editor.innerHTML);
        
        if (!currentText.trim()) {
            this.showNotification('Please write some content first', 'error');
            return;
        }

        const worldbuildingContext = this.getWorldbuildingContext(currentText);
        const prompt = `Based on the following novel excerpt, provide 3 creative suggestions for what could happen next. Keep each suggestion to 2-3 sentences and make them engaging and plot-driven.

${worldbuildingContext}

Novel excerpt:
${currentText.slice(-1000)}`;

        await this.callAI(prompt, 'Story Suggestions');
    }

    async continueWriting() {
        if (!this.apiKey) {
            this.showNotification('Please set your OpenRouter API key in settings', 'error');
            this.openSettings();
            return;
        }

        const editor = document.getElementById('textEditor');
        const currentText = this.getPlainText(editor.innerHTML);
        
        if (!currentText.trim()) {
            this.showNotification('Please write some content first', 'error');
            return;
        }

        const novelContext = this.novelData.summary ? `Novel Summary: ${this.novelData.summary}\n\n` : '';
        const worldbuildingContext = this.getWorldbuildingContext(currentText);
        const prompt = `${novelContext}${worldbuildingContext}

Continue this story naturally and engagingly. Write the next 2-3 paragraphs that flow seamlessly from the existing text. Maintain consistency with the established worldbuilding elements:

${currentText.slice(-1500)}`;

        await this.callAI(prompt, 'Continue Writing', true);
    }

    async improveText() {
        if (!this.apiKey) {
            this.showNotification('Please set your OpenRouter API key in settings', 'error');
            this.openSettings();
            return;
        }

        const selection = window.getSelection();
        let textToImprove = '';
        
        if (selection.toString().trim()) {
            textToImprove = selection.toString();
        } else {
            const editor = document.getElementById('textEditor');
            const currentText = this.getPlainText(editor.innerHTML);
            textToImprove = currentText.slice(-500);
        }

        if (!textToImprove.trim()) {
            this.showNotification('Please select text or write some content first', 'error');
            return;
        }

        const worldbuildingContext = this.getWorldbuildingContext(textToImprove);
        const prompt = `Improve the following text by enhancing clarity, flow, and literary quality while maintaining the original meaning and style. Ensure consistency with any worldbuilding elements mentioned:

${worldbuildingContext}

Text to improve:
${textToImprove}`;

        await this.callAI(prompt, 'Text Improvement', true);
    }

    // New AI functions for floating toolbar
    async rephraseSelectedText() {
        const selectedText = window.getSelection().toString().trim();
        if (!selectedText) {
            this.showNotification('Please select text to rephrase.', 'error');
            return;
        }
        if (!this.apiKey) {
            this.showNotification('Please set your OpenRouter API key in settings', 'error');
            this.openSettings();
            return;
        }
        const worldbuildingContext = this.getWorldbuildingContext(selectedText);
        const prompt = `Rephrase the following text to improve its clarity, flow, or style, while retaining its original meaning. Consider the following worldbuilding context if relevant:

${worldbuildingContext}

Text to rephrase:
${selectedText}`;
        await this.callAI(prompt, 'Rephrased Text', true);
    }

    async expandSelectedText() {
        const selectedText = window.getSelection().toString().trim();
        if (!selectedText) {
            this.showNotification('Please select text to expand.', 'error');
            return;
        }
        if (!this.apiKey) {
            this.showNotification('Please set your OpenRouter API key in settings', 'error');
            this.openSettings();
            return;
        }
        const worldbuildingContext = this.getWorldbuildingContext(selectedText);
        const prompt = `Expand on the following text, adding more detail, description, or narrative. Maintain consistency with the established worldbuilding elements if relevant:

${worldbuildingContext}

Text to expand:
${selectedText}`;
        await this.callAI(prompt, 'Expanded Text', true);
    }

    async summarizeSelectedText() {
        const selectedText = window.getSelection().toString().trim();
        if (!selectedText) {
            this.showNotification('Please select text to summarize.', 'error');
            return;
        }
        if (!this.apiKey) {
            this.showNotification('Please set your OpenRouter API key in settings', 'error');
            this.openSettings();
            return;
        }
        const worldbuildingContext = this.getWorldbuildingContext(selectedText);
        const prompt = `Summarize the following text concisely.

${worldbuildingContext}

Text to summarize:
${selectedText}`;
        await this.callAI(prompt, 'Summarized Text', true);
    }

    async callAI(prompt, title, isReplacement = false) {
        this.showLoading(true);
        
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Title': 'AI Novel Writer'
                },
                body: JSON.stringify({
                    model: this.selectedModel, // Use the currently selected model
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            
            this.showAIResponse(aiResponse, title, isReplacement);
            
        } catch (error) {
            console.error('AI API Error:', error);
            this.showNotification(`AI Error: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showAIResponse(response, title, isReplacement = false) {
        const modal = document.getElementById('aiModal');
        const responseDiv = document.getElementById('aiResponse');
        
        modal.querySelector('.modal-header h3').textContent = title;
        responseDiv.textContent = response;
        
        // Store for potential acceptance
        this.currentAIResponse = response;
        this.isReplacementSuggestion = isReplacement;
        
        modal.classList.add('active');
    }

    acceptSuggestion() {
        const editor = document.getElementById('textEditor');
        
        if (this.isReplacementSuggestion) {
            // Save current state for undo
            this.undoStack.push(editor.innerHTML);
            this.redoStack = [];
            
            // Replace or append content
            const selection = window.getSelection();
            if (selection.toString().trim()) {
                // Replace selected text
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(this.currentAIResponse));
            } else {
                // Append to end
                const newParagraph = document.createElement('p');
                newParagraph.textContent = this.currentAIResponse;
                editor.appendChild(newParagraph);
            }
        } else {
            // For suggestions, just show notification
            this.showNotification('Suggestion noted! Use it as inspiration for your writing.', 'success');
        }
        
        this.saveCurrentChapter();
        this.updateStats();
        this.closeAIModal();
    }

    closeAIModal() {
        document.getElementById('aiModal').classList.remove('active');
    }

    // Statistics
    updateStats() {
        const editor = document.getElementById('textEditor');
        const text = this.getPlainText(editor.innerHTML);
        
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        const charCount = text.length;
        const pageCount = Math.ceil(wordCount / 250); // Assuming 250 words per page
        
        document.getElementById('wordCount').textContent = wordCount.toLocaleString();
        document.getElementById('charCount').textContent = charCount.toLocaleString();
        document.getElementById('pageCount').textContent = pageCount.toLocaleString();
    }

    getPlainText(html) {
        // Temporarily remove highlight spans to get pure text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.querySelectorAll('.worldbuilding-highlight').forEach(span => {
            span.outerHTML = span.textContent;
        });
        return tempDiv.textContent || tempDiv.innerText || '';
    }

    highlightWorldbuildingTerms() {
        const editor = document.getElementById('textEditor');
        const originalHTML = editor.innerHTML;
        const originalText = this.getPlainText(originalHTML); // Get plain text without highlights

        let newHTML = originalText; // Start with plain text

        // Collect all worldbuilding terms (names and aliases)
        const termsToHighlight = [];
        this.codexEntries.forEach(entry => { // Changed to codexEntries
            termsToHighlight.push({
                term: entry.name,
                id: entry.id,
                type: entry.type
            });
            entry.aliases.forEach(alias => {
                termsToHighlight.push({
                    term: alias,
                    id: entry.id,
                    type: entry.type
                });
            });
        });

        // Sort terms by length in descending order to avoid partial matches
        termsToHighlight.sort((a, b) => b.term.length - a.term.length);

        // Create a temporary div to work with HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalHTML;

        // Get current selection/cursor position
        const selection = window.getSelection();
        let range;
        let startOffset = 0;
        let endOffset = 0;
        let startNode = null;
        let endNode = null;

        if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
            startNode = range.startContainer;
            endNode = range.endContainer;
            startOffset = range.startOffset;
            endOffset = range.endOffset;
        }

        // Function to get the text content of a node, ignoring highlight spans
        const getNodeText = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('worldbuilding-highlight')) {
                return node.textContent; // Treat highlighted text as plain text for matching
            }
            return '';
        };

        // Recursively replace terms in text nodes
        const replaceInNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                let text = node.textContent;
                let replaced = false;
                for (const { term, id, type } of termsToHighlight) {
                    const regex = new RegExp(`\\b(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
                    if (regex.test(text)) {
                        const newText = text.replace(regex, `<span class="worldbuilding-highlight" data-id="${id}" data-type="${type}">$&</span>`);
                        const tempSpan = document.createElement('span');
                        tempSpan.innerHTML = newText;
                        while (tempSpan.firstChild) {
                            node.parentNode.insertBefore(tempSpan.firstChild, node);
                        }
                        node.parentNode.removeChild(node);
                        replaced = true;
                        break; // Only replace the first matched term in this text node
                    }
                }
                return replaced;
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && !node.classList.contains('worldbuilding-highlight')) {
                // Process children, but skip already highlighted spans
                let child = node.firstChild;
                while (child) {
                    const nextChild = child.nextSibling;
                    replaceInNode(child);
                    child = nextChild;
                }
            }
            return false;
        };

        // Clear existing highlights before re-highlighting
        tempDiv.querySelectorAll('.worldbuilding-highlight').forEach(span => {
            span.outerHTML = span.textContent;
        });

        replaceInNode(tempDiv);
        editor.innerHTML = tempDiv.innerHTML;

        // Restore selection/cursor position
        if (range) {
            try {
                const newRange = document.createRange();
                newRange.setStart(startNode, startOffset);
                newRange.setEnd(endNode, endOffset);
                selection.removeAllRanges();
                selection.addRange(newRange);
            } catch (e) {
                console.warn("Could not restore selection:", e);
                // Fallback: set cursor to end if restoration fails
                const lastChild = editor.lastChild;
                if (lastChild) {
                    selection.collapse(lastChild, lastChild.textContent.length);
                }
            }
        }
    }

    // Settings
    openSettings() {
        const modal = document.getElementById('settingsModal');
        const keyInput = document.getElementById('openrouterKey');
        keyInput.value = this.apiKey;
        modal.classList.add('active');
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    saveApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('openrouter_api_key', key);
    }

    // Storage
    saveToStorage() {
        this.novelData.chapters = this.chapters;
        localStorage.setItem('novel_data', JSON.stringify(this.novelData));
        
        // Convert flat codexEntries back to categorized worldbuilding for storage
        const categorizedWorldbuilding = {
            magic: [],
            power: [],
            location: [],
            character: [],
            lore: [],
            progression: []
        };
        this.codexEntries.forEach(entry => {
            if (categorizedWorldbuilding[entry.type]) {
                categorizedWorldbuilding[entry.type].push(entry);
            }
        });
        this.worldbuilding = categorizedWorldbuilding; // Update worldbuilding object before saving

        localStorage.setItem('worldbuilding_data', JSON.stringify(this.worldbuilding));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('novel_data');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.novelData = data;
                this.chapters = data.chapters || this.chapters;
                
                document.getElementById('novelTitle').value = data.title || '';
                document.getElementById('novelSummary').value = data.summary || '';
                
                this.renderChaptersList();
                this.switchChapter(this.currentChapter);
            } catch (error) {
                console.error('Error loading saved data:', error);
            }
        }

        // Load worldbuilding data and convert to flat codexEntries
        const savedWorldbuilding = localStorage.getItem('worldbuilding_data');
        if (savedWorldbuilding) {
            try {
                this.worldbuilding = JSON.parse(savedWorldbuilding);
                this.codexEntries = []; // Clear existing
                Object.keys(this.worldbuilding).forEach(type => {
                    this.worldbuilding[type].forEach(entry => {
                        this.codexEntries.push(entry);
                    });
                });
                this.renderCodexList(); // Initial render after loading
            } catch (error) {
                console.error('Error loading worldbuilding data:', error);
            }
        }
        
        // Load API key
        const savedKey = localStorage.getItem('openrouter_api_key');
        if (savedKey) {
            this.apiKey = savedKey;
        }
    }

    setupAutoSave() {
        setInterval(() => {
            this.saveCurrentChapter();
        }, 30000); // Auto-save every 30 seconds
    }

    // Save and Export
    saveNovel() {
        this.saveCurrentChapter();
        this.showNotification('Novel saved successfully!', 'success');
    }

    exportNovel() {
        this.saveCurrentChapter();
        
        const sortedChapters = Object.keys(this.chapters).map(Number).sort((a, b) => a - b);
        let content = '';
        
        if (this.novelData.title) {
            content += `${this.novelData.title}\n${'='.repeat(this.novelData.title.length)}\n\n`;
        }
        
        if (this.novelData.summary) {
            content += `Summary:\n${this.novelData.summary}\n\n`;
        }
        
        sortedChapters.forEach(chapterNum => {
            const chapter = this.chapters[chapterNum];
            content += `${chapter.title}\n${'-'.repeat(chapter.title.length)}\n\n`;
            content += this.getPlainText(chapter.content) + '\n\n';
        });
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.novelData.title || 'My Novel'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Novel exported successfully!', 'success');
    }

    // Utilities
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    z-index: 3000;
                    animation: slideInRight 0.3s ease;
                    max-width: 300px;
                }
                .notification-success { border-left: 4px solid #27ae60; }
                .notification-error { border-left: 4px solid #e74c3c; }
                .notification-info { border-left: 4px solid #3498db; }
                .notification-success i { color: #27ae60; }
                .notification-error i { color: #e74c3c; }
                .notification-info i { color: #3498db; }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NovelWriter();
});

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
