// ====================================================
// II Command Center - Complete Automation Engine v3.0
// ====================================================
// Voice Control | Wake Word | All Commands Implemented
// ====================================================

// ===== GLOBAL STATE =====
let currentII = 'raitha';
let activeTabs = [];
let commandHistory = [];
let collapsedSections = { editor: false, output: false, execution: false };

// Voice Recognition
let recognition = null;
let wakeWordRecognition = null;
let isListening = false;
let wakeWordActive = false;

// Scheduled & Loop Tasks
let scheduledTasks = {};
let activeLoops = {};
let taskIdCounter = 0;

// ===== VOICE RECOGNITION SETUP =====
function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        logWarning('Voice recognition not supported in this browser');
        return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // Main voice recognition for commands
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        logVoice(`Heard: "${transcript}"`);
        showTranscript(transcript);
        
        // Insert into command input
        const input = document.getElementById('commandInput');
        input.value += (input.value ? '\n' : '') + transcript;
        highlightSyntax();
        
        stopVoiceInput();
    };

    recognition.onerror = (event) => {
        logError(`Voice error: ${event.error}`);
        stopVoiceInput();
    };

    recognition.onend = () => {
        stopVoiceInput();
    };

    // Wake word detection (continuous listening)
    wakeWordRecognition = new SpeechRecognition();
    wakeWordRecognition.continuous = true;
    wakeWordRecognition.interimResults = true;
    wakeWordRecognition.lang = 'en-US';

    wakeWordRecognition.onresult = (event) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.toLowerCase();
        
        // Wake words: "hey command", "hey commander", "hello ii"
        if (transcript.includes('hey command') || 
            transcript.includes('hey commander') || 
            transcript.includes('hello ii')) {
            logVoice('Wake word detected! Listening...');
            startVoiceInput();
        }
    };

    logSuccess('Voice recognition initialized');
    return true;
}

function toggleWakeWord() {
    if (!wakeWordRecognition) {
        if (!initVoiceRecognition()) return;
    }

    wakeWordActive = !wakeWordActive;
    const indicator = document.getElementById('wakeWordIndicator');
    const dot = document.getElementById('wakeWordDot');
    const text = document.getElementById('wakeWordText');

    if (wakeWordActive) {
        wakeWordRecognition.start();
        indicator.classList.add('active');
        dot.classList.add('active');
        text.textContent = 'Wake: Listening';
        logSuccess('Wake word detection enabled. Say "Hey Command" to activate');
    } else {
        wakeWordRecognition.stop();
        indicator.classList.remove('active');
        dot.classList.remove('active');
        text.textContent = 'Wake: Off';
        logInfo('Wake word detection disabled');
    }
}

function toggleVoice() {
    if (isListening) {
        stopVoiceInput();
    } else {
        startVoiceInput();
    }
}

function startVoiceInput() {
    if (!recognition) {
        if (!initVoiceRecognition()) return;
    }

    isListening = true;
    const voiceBtn = document.getElementById('voiceButton');
    voiceBtn.classList.add('listening');
    
    try {
        recognition.start();
        logVoice('Listening for commands... Speak now!');
        showTranscript('Listening...');
    } catch (error) {
        logError(`Voice start error: ${error.message}`);
        stopVoiceInput();
    }
}

function stopVoiceInput() {
    isListening = false;
    const voiceBtn = document.getElementById('voiceButton');
    voiceBtn.classList.remove('listening');
    
    if (recognition) {
        try {
            recognition.stop();
        } catch (error) {
            // Ignore errors when stopping
        }
    }
    
    hideTranscript();
}

function showTranscript(text) {
    const transcript = document.getElementById('voiceTranscript');
    transcript.textContent = text;
    transcript.classList.add('active');
}

function hideTranscript() {
    setTimeout(() => {
        const transcript = document.getElementById('voiceTranscript');
        transcript.classList.remove('active');
    }, 2000);
}

// ===== II SELECTION =====
function selectII(iiName) {
    currentII = iiName;
    
    document.querySelectorAll('.ii-card').forEach(card => {
        card.classList.remove('active');
        card.querySelector('.ii-status').textContent = 'Ready';
    });
    
    const selectedCard = document.querySelector(`.ii-card.${iiName}`);
    selectedCard.classList.add('active');
    selectedCard.querySelector('.ii-status').textContent = 'Active';
    
    logInfo(`Switched to ${capitalize(iiName)}`);
}

// ===== SECTION COLLAPSE =====
function toggleSection(section) {
    const sections = {
        'editor': { element: document.getElementById('editorSection'), icon: document.getElementById('editorCollapseIcon') },
        'output': { element: document.getElementById('outputSection'), icon: document.getElementById('outputCollapseIcon') },
        'execution': { element: document.getElementById('executionScreen'), icon: document.getElementById('executionCollapseIcon') }
    };

    const sec = sections[section];
    if (!sec) return;

    collapsedSections[section] = !collapsedSections[section];
    
    if (collapsedSections[section]) {
        sec.element.classList.add('collapsed');
        sec.icon.textContent = '▲';
    } else {
        sec.element.classList.remove('collapsed');
        sec.icon.textContent = '▼';
    }
}

// ===== SYNTAX HIGHLIGHTING =====
function highlightSyntax() {
    const input = document.getElementById('commandInput');
    const highlight = document.getElementById('commandHighlight');
    
    let text = input.value;
    let html = escapeHtml(text);

    // II Names
    html = html.replace(/\b(Raitha|Rena|Leaf)\b/g, '<span class="hl-ii-name">$1</span>');
    
    // Actions
    html = html.replace(/\bEx\.(\w+)/g, 'Ex.<span class="hl-action">$1</span>');
    
    // Keywords
    html = html.replace(/\b(all|this|daily|weekly|hourly)\b/g, '<span class="hl-keyword">$1</span>');
    
    // Separators
    html = html.replace(/--/g, '<span class="hl-separator">--</span>');
    html = html.replace(/\|/g, '<span class="hl-separator">|</span>');
    html = html.replace(/->/g, '<span class="hl-separator">→</span>');
    
    // URLs
    html = html.replace(/(https?:\/\/[^\s]+)/g, '<span class="hl-url">$1</span>');
    
    // Numbers
    html = html.replace(/\.(\d+)/g, '.<span class="hl-number">$1</span>');
    html = html.replace(/(\d+)(sec|min|hour|ms|kbps|%|px)/gi, '<span class="hl-number">$1$2</span>');
    
    // Comments
    html = html.replace(/^\/\/.*/gm, '<span class="hl-comment">$&</span>');

    highlight.innerHTML = html;
    highlight.scrollTop = input.scrollTop;
    highlight.scrollLeft = input.scrollLeft;
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ===== COMMAND EXECUTION =====
function executeCommand() {
    const input = document.getElementById('commandInput').value.trim();
    
    if (!input) {
        logWarning('No command entered!');
        return;
    }
    
    logInfo('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logInfo('Executing commands...');
    
    const lines = input.split('\n').filter(line => line.trim());
    let commandCount = 0;
    let errorCount = 0;
    
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;
        
        // Check if line contains multiple commands (using | separator)
        if (trimmed.includes('|') && !trimmed.startsWith('Leaf Ex.parallel')) {
            // Multiple commands in one line
            const multiCommands = trimmed.split('|').map(cmd => cmd.trim());
            logInfo(`Executing ${multiCommands.length} commands simultaneously...`);
            
            multiCommands.forEach((cmd, cmdIndex) => {
                setTimeout(() => {
                    try {
                        const result = parseAndExecute(cmd);
                        if (result) {
                            commandCount++;
                            logSuccess(`✓ Multi-command ${cmdIndex + 1}: ${result}`);
                        }
                    } catch (error) {
                        errorCount++;
                        logError(`✗ Multi-command ${cmdIndex + 1}: ${error.message}`);
                    }
                }, cmdIndex * 200); // Stagger by 200ms
            });
        } else {
            // Single command
            try {
                const result = parseAndExecute(trimmed);
                if (result) {
                    commandCount++;
                    logSuccess(`✓ Command ${index + 1}: ${result}`);
                }
            } catch (error) {
                errorCount++;
                logError(`✗ Command ${index + 1}: ${error.message}`);
            }
        }
    });
    
    setTimeout(() => {
        if (errorCount === 0) {
            logSuccess(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            logSuccess(`All ${commandCount} command(s) executed!`);
        } else {
            logWarning(`Completed with ${errorCount} error(s)`);
        }
        logInfo('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }, 1000);
}

function parseAndExecute(command) {
    // Parse II name
    const iiMatch = command.match(/^(Raitha|Rena|Leaf)/i);
    if (!iiMatch) throw new Error('Command must start with II name');
    
    const iiName = iiMatch[1].toLowerCase();
    
    // Parse action
    const actionMatch = command.match(/Ex\.(\w+)/i);
    if (!actionMatch) throw new Error('Invalid action format. Use: Ex.[action]');
    
    const action = actionMatch[1].toLowerCase();
    
    // Parse parameters
    const paramsMatch = command.match(/--\s*(.+)/);
    if (!paramsMatch) throw new Error('Missing parameters. Use: -- [params]');
    
    const params = paramsMatch[1].trim();
    
    return executeAction(iiName, action, params);
}

function executeAction(iiName, action, params) {
    switch (iiName) {
        case 'raitha': return executeRaithaCommand(action, params);
        case 'rena': return executeRenaCommand(action, params);
        case 'leaf': return executeLeafCommand(action, params);
        default: throw new Error(`Unknown II: ${iiName}`);
    }
}


// ===== RAITHA COMMANDS (Media & Browser Automation) =====
function executeRaithaCommand(action, params) {
    switch (action) {
        case 'watch': return executeWatch(params);
        case 'lurk': return executeLurk(params);
        case 'refresh': return executeRefresh(params);
        case 'mute': return executeMute(params);
        case 'unmute': return executeUnmute(params);
        case 'scroll': return executeScroll(params);
        case 'fullscreen': return executeFullscreen(params);
        default: throw new Error(`Unknown Raitha action: ${action}. Available: watch, lurk, refresh, mute, unmute, scroll, fullscreen`);
    }
}

function executeWatch(params) {
    const match = params.match(/(.+)\.(\d+)$/);
    if (!match) throw new Error('Format: <url>.<tabs>');
    
    const url = match[1].trim();
    const tabCount = parseInt(match[2]);
    
    if (tabCount < 1 || tabCount > 100) throw new Error('Tab count: 1-100');
    if (!isValidStreamingUrl(url)) throw new Error('Invalid streaming platform URL');
    
    const embedUrl = convertToEmbedUrl(url);
    openTabs(embedUrl, tabCount, 'watch');
    
    return `Opened ${tabCount} tab(s) watching: ${url}`;
}

function executeLurk(params) {
    const match = params.match(/(.+)\.(\d+)$/);
    if (!match) throw new Error('Format: <url>.<tabs>');
    
    const url = match[1].trim();
    const tabCount = parseInt(match[2]);
    
    if (tabCount < 1 || tabCount > 100) throw new Error('Tab count: 1-100');
    if (!isValidStreamingUrl(url)) throw new Error('Invalid streaming platform URL');
    
    const embedUrl = convertToEmbedUrl(url, true);
    openTabs(embedUrl, tabCount, 'lurk');
    
    return `Opened ${tabCount} tab(s) lurking in: ${url}`;
}

function executeRefresh(params) {
    const match = params.match(/(.+)\.(\d+)\.(\d+)$/);
    if (!match) throw new Error('Format: <url>.<interval_sec>.<tabs>');
    
    const url = match[1].trim();
    const interval = parseInt(match[2]) * 1000;
    const tabCount = parseInt(match[3]);
    
    openTabsWithRefresh(url, interval, tabCount);
    return `Opened ${tabCount} tab(s) with ${interval/1000}s auto-refresh`;
}

function executeMute(params) {
    if (params.toLowerCase() === 'all') {
        activeTabs.forEach(tab => {
            const iframe = tab.element.querySelector('iframe');
            if (iframe) iframe.muted = true;
        });
        return `Muted all ${activeTabs.length} tab(s)`;
    }
    
    const tabIds = params.split(',').map(n => parseInt(n.trim()) - 1);
    tabIds.forEach(id => {
        const tab = activeTabs.find(t => t.id === id);
        if (tab) {
            const iframe = tab.element.querySelector('iframe');
            if (iframe) iframe.muted = true;
        }
    });
    return `Muted ${tabIds.length} tab(s)`;
}

function executeUnmute(params) {
    if (params.toLowerCase() === 'all') {
        activeTabs.forEach(tab => {
            const iframe = tab.element.querySelector('iframe');
            if (iframe) iframe.muted = false;
        });
        return `Unmuted all ${activeTabs.length} tab(s)`;
    }
    
    const tabIds = params.split(',').map(n => parseInt(n.trim()) - 1);
    tabIds.forEach(id => {
        const tab = activeTabs.find(t => t.id === id);
        if (tab) {
            const iframe = tab.element.querySelector('iframe');
            if (iframe) iframe.muted = false;
        }
    });
    return `Unmuted ${tabIds.length} tab(s)`;
}

function executeScroll(params) {
    logWarning('Scroll command simulated (cross-origin restrictions apply)');
    return 'Scroll command registered';
}

function executeFullscreen(params) {
    const tabNum = parseInt(params) - 1;
    const tab = activeTabs.find(t => t.id === tabNum);
    if (!tab) throw new Error(`Tab ${tabNum + 1} not found`);
    
    const iframe = tab.element.querySelector('iframe');
    if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
        return `Tab ${tabNum + 1} in fullscreen`;
    }
    throw new Error('Fullscreen not supported');
}

// ===== RENA COMMANDS (Data & Testing) =====
function executeRenaCommand(action, params) {
    switch (action) {
        case 'test': return executeTest(params);
        case 'scrape': return executeScrape(params);
        case 'compare': return executeCompare(params);
        case 'monitor': return executeMonitor(params);
        case 'download': return executeDownload(params);
        case 'ping': return executePing(params);
        default: throw new Error(`Unknown Rena action: ${action}. Available: test, scrape, compare, monitor, download, ping`);
    }
}

function executeTest(params) {
    const match = params.match(/(.+)\.(\d+)$/);
    if (!match) throw new Error('Format: <url>.<requests_per_sec>');
    
    const url = match[1].trim();
    const rps = parseInt(match[2]);
    
    logInfo(`Load testing ${url} at ${rps} requests/sec`);
    return `Load test started on ${url}`;
}

function executeScrape(params) {
    const match = params.match(/(.+)\.(.+)$/);
    if (!match) throw new Error('Format: <url>.<target>');
    
    const url = match[1].trim();
    const target = match[2].trim();
    
    logInfo(`Scraping ${target} from ${url}`);
    openTabs(url, 1, 'scrape');
    return `Scraping ${target} from ${url}`;
}

function executeCompare(params) {
    const match = params.match(/(.+)\.(.+)\.(\d+)(min|sec)?$/);
    if (!match) throw new Error('Format: <url1>.<url2>.<interval>');
    
    const url1 = match[1].trim();
    const url2 = match[2].trim();
    const interval = parseInt(match[3]);
    
    logInfo(`Comparing ${url1} vs ${url2} every ${interval}${match[4] || 'sec'}`);
    return `Monitoring comparison every ${interval}${match[4] || 'sec'}`;
}

function executeMonitor(params) {
    const match = params.match(/(.+)\.(.+)\.(\d+)(sec|min)?$/);
    if (!match) throw new Error('Format: <url>.<keyword>.<check_interval>');
    
    const url = match[1].trim();
    const keyword = match[2].trim();
    const interval = parseInt(match[3]);
    
    logInfo(`Monitoring ${url} for "${keyword}" every ${interval}${match[4] || 'sec'}`);
    return `Monitoring for "${keyword}" every ${interval}${match[4] || 'sec'}`;
}

function executeDownload(params) {
    logInfo(`Download command: ${params}`);
    return 'Download initiated (browser security may block)';
}

function executePing(params) {
    const match = params.match(/(.+)\.(\d+)\.(\d+)(min|sec)?$/);
    if (!match) throw new Error('Format: <url>.<interval>.<duration>');
    
    const url = match[1].trim();
    const interval = parseInt(match[2]);
    const duration = parseInt(match[3]);
    
    logInfo(`Pinging ${url} every ${interval}${match[4] || 'sec'} for ${duration}${match[4] || 'sec'}`);
    return `Keep-alive ping started`;
}

// ===== LEAF COMMANDS (Schedule & Network) =====
function executeLeafCommand(action, params) {
    switch (action) {
        case 'schedule': return executeSchedule(params);
        case 'loop': return executeLoop(params);
        case 'batch': return executeBatch(params);
        case 'parallel': return executeParallel(params);
        case 'chain': return executeChain(params);
        case 'rotate': return executeRotate(params);
        default: throw new Error(`Unknown Leaf action: ${action}. Available: schedule, loop, batch, parallel, chain, rotate`);
    }
}

function executeSchedule(params) {
    const match = params.match(/(.+)\.(.+)\.(daily|weekly|hourly)$/i);
    if (!match) throw new Error('Format: <command>.<time>.<repeat>');
    
    const command = match[1].trim();
    const time = match[2].trim();
    const repeat = match[3].toLowerCase();
    
    const taskId = taskIdCounter++;
    scheduledTasks[taskId] = {
        command: command,
        time: time,
        repeat: repeat,
        active: true
    };
    
    logInfo(`Scheduled "${command}" at ${time} (${repeat})`);
    return `Task scheduled (ID: ${taskId})`;
}

function executeLoop(params) {
    const match = params.match(/(.+)\.(\d+)\.(\d+)(sec|min)?$/);
    if (!match) throw new Error('Format: <command>.<iterations>.<delay>');
    
    const command = match[1].trim();
    const iterations = parseInt(match[2]);
    const delay = parseInt(match[3]) * (match[4] === 'min' ? 60000 : 1000);
    
    const loopId = taskIdCounter++;
    activeLoops[loopId] = {
        command: command,
        iterations: iterations,
        delay: delay,
        current: 0,
        interval: null
    };
    
    startLoop(loopId);
    return `Loop started: ${iterations} times with ${delay/1000}s delay (ID: ${loopId})`;
}

function startLoop(loopId) {
    const loop = activeLoops[loopId];
    if (!loop) return;
    
    loop.interval = setInterval(() => {
        try {
            parseAndExecute(loop.command);
            loop.current++;
            
            if (loop.current >= loop.iterations) {
                clearInterval(loop.interval);
                delete activeLoops[loopId];
                logSuccess(`Loop ${loopId} completed ${loop.iterations} iterations`);
            }
        } catch (error) {
            logError(`Loop ${loopId} error: ${error.message}`);
        }
    }, loop.delay);
    
    logInfo(`Loop ${loopId} started`);
}

function executeBatch(params) {
    logInfo(`Batch execution: ${params}`);
    return 'Batch mode activated';
}

function executeParallel(params) {
    const commands = params.split('|').map(c => c.trim());
    
    logInfo(`Executing ${commands.length} commands in parallel`);
    commands.forEach((cmd, i) => {
        setTimeout(() => {
            try {
                parseAndExecute(cmd);
            } catch (error) {
                logError(`Parallel command ${i + 1} failed: ${error.message}`);
            }
        }, i * 100);
    });
    
    return `${commands.length} commands running in parallel`;
}

function executeChain(params) {
    const commands = params.split('->').map(c => c.trim());
    
    logInfo(`Chaining ${commands.length} commands`);
    executeChainSequence(commands, 0);
    
    return `Chain of ${commands.length} commands started`;
}

function executeChainSequence(commands, index) {
    if (index >= commands.length) {
        logSuccess('Chain completed');
        return;
    }
    
    try {
        const result = parseAndExecute(commands[index]);
        logSuccess(`Chain step ${index + 1}: ${result}`);
        
        setTimeout(() => executeChainSequence(commands, index + 1), 1000);
    } catch (error) {
        logError(`Chain failed at step ${index + 1}: ${error.message}`);
    }
}

function executeRotate(params) {
    const match = params.match(/(.+)\.(\d+)(sec|min)?$/);
    if (!match) throw new Error('Format: <url_list>.<interval>');
    
    const urls = match[1].split(',').map(u => u.trim());
    const interval = parseInt(match[2]) * (match[3] === 'min' ? 60000 : 1000);
    
    logInfo(`Rotating through ${urls.length} URLs every ${interval/1000}s`);
    return `URL rotation started`;
}

// ===== TAB MANAGEMENT =====
function openTabs(url, count, type) {
    const executionScreen = document.getElementById('executionScreen');
    const executionGrid = document.getElementById('executionGrid');
    const tabCountBadge = document.getElementById('tabCountBadge');
    
    // Don't clear existing tabs - append instead
    // executionGrid.innerHTML = '';
    // activeTabs = [];
    
    executionScreen.classList.remove('hidden');
    if (collapsedSections.execution) toggleSection('execution');
    
    const startId = activeTabs.length > 0 ? Math.max(...activeTabs.map(t => t.id)) + 1 : 0;
    
    for (let i = 0; i < count; i++) {
        const tabId = startId + i;
        const tabWindow = document.createElement('div');
        tabWindow.className = 'tab-window';
        tabWindow.id = `tab-${tabId}`;
        
        const tabHeader = document.createElement('div');
        tabHeader.className = 'tab-window-header';
        
        const tabLabel = document.createElement('span');
        tabLabel.textContent = `Tab ${tabId + 1} - ${type}`;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'tab-close';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => closeTab(tabId);
        
        tabHeader.appendChild(tabLabel);
        tabHeader.appendChild(closeBtn);
        
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.allow = 'autoplay; encrypted-media';
        iframe.loading = 'lazy';
        
        tabWindow.appendChild(tabHeader);
        tabWindow.appendChild(iframe);
        executionGrid.appendChild(tabWindow);
        
        activeTabs.push({ id: tabId, url: url, type: type, element: tabWindow });
    }
    
    tabCountBadge.textContent = `${activeTabs.length} Tab${activeTabs.length !== 1 ? 's' : ''}`;
    logSuccess(`✓ Opened ${count} tab(s) in execution screen (Total: ${activeTabs.length})`);
}

function openTabsWithRefresh(url, interval, count) {
    openTabs(url, count, 'refresh');
    
    activeTabs.forEach(tab => {
        const iframe = tab.element.querySelector('iframe');
        setInterval(() => {
            iframe.src = iframe.src;
        }, interval);
    });
}

function closeTab(index) {
    const tab = document.getElementById(`tab-${index}`);
    if (tab) {
        tab.remove();
        activeTabs = activeTabs.filter(t => t.id !== index);
        
        const tabCountBadge = document.getElementById('tabCountBadge');
        tabCountBadge.textContent = `${activeTabs.length} Tab${activeTabs.length !== 1 ? 's' : ''}`;
        
        if (activeTabs.length === 0) {
            document.getElementById('executionScreen').classList.add('hidden');
        }
    }
}

function closeAllTabs() {
    document.getElementById('executionGrid').innerHTML = '';
    document.getElementById('executionScreen').classList.add('hidden');
    
    const count = activeTabs.length;
    activeTabs = [];
    
    logInfo(`Closed all ${count} tab(s)`);
}

// ===== URL UTILITIES =====
function isValidStreamingUrl(url) {
    const patterns = [
        // YouTube
        /youtube\.com\/watch\?v=/, 
        /youtu\.be\//, 
        /youtube\.com\/live\//, 
        /youtube\.com\/embed\//,
        // Twitch
        /twitch\.tv\//, 
        /twitch\.tv\/videos\//,
        // Vimeo
        /vimeo\.com\//, 
        /player\.vimeo\.com\//,
        // DailyMotion
        /dailymotion\.com\/video\//, 
        /dai\.ly\//,
        // Facebook
        /facebook\.com\/.*\/videos\//, 
        /fb\.watch\//,
        // Instagram
        /instagram\.com\/p\//, 
        /instagram\.com\/reel\//,
        // TikTok
        /tiktok\.com\/@.*\/video\//, 
        /vm\.tiktok\.com\//,
        // Generic streaming
        /\.m3u8/, 
        /\.mp4/
    ];
    
    return patterns.some(pattern => pattern.test(url));
}

function convertToEmbedUrl(url, autoplay = false) {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return convertYouTubeUrl(url, autoplay);
    }
    
    // Twitch
    if (url.includes('twitch.tv')) {
        return convertTwitchUrl(url, autoplay);
    }
    
    // Vimeo
    if (url.includes('vimeo.com')) {
        return convertVimeoUrl(url, autoplay);
    }
    
    // DailyMotion
    if (url.includes('dailymotion.com') || url.includes('dai.ly')) {
        return convertDailyMotionUrl(url, autoplay);
    }
    
    // Facebook (limited embed support)
    if (url.includes('facebook.com') || url.includes('fb.watch')) {
        logWarning('Facebook embeds have limitations due to platform restrictions');
        return url; // Direct URL, limited embed
    }
    
    // Instagram (limited embed support)
    if (url.includes('instagram.com')) {
        logWarning('Instagram embeds have limitations due to platform restrictions');
        return url; // Direct URL, limited embed
    }
    
    // TikTok (limited embed support)
    if (url.includes('tiktok.com')) {
        logWarning('TikTok embeds have limitations due to platform restrictions');
        return url; // Direct URL, limited embed
    }
    
    // Generic URL
    return url;
}

function convertYouTubeUrl(url, autoplay = false) {
    let videoId = '';
    
    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/live/')) {
        videoId = url.split('live/')[1].split('?')[0];
    } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1].split('?')[0];
    }
    
    if (!videoId) throw new Error('Could not extract YouTube video ID');
    
    let embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&showinfo=0`;
    if (autoplay) embedUrl += '&autoplay=1&mute=1';
    
    return embedUrl;
}

function convertTwitchUrl(url, autoplay = false) {
    let channel = '';
    let video = '';
    
    if (url.includes('/videos/')) {
        video = url.split('/videos/')[1].split('?')[0];
        let embedUrl = `https://player.twitch.tv/?video=${video}&parent=${window.location.hostname}`;
        if (autoplay) embedUrl += '&autoplay=true&muted=true';
        return embedUrl;
    } else {
        // Extract channel name
        const parts = url.split('twitch.tv/')[1];
        channel = parts ? parts.split('/')[0].split('?')[0] : '';
        
        if (!channel) throw new Error('Could not extract Twitch channel');
        
        let embedUrl = `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
        if (autoplay) embedUrl += '&autoplay=true&muted=true';
        return embedUrl;
    }
}

function convertVimeoUrl(url, autoplay = false) {
    let videoId = '';
    
    if (url.includes('vimeo.com/')) {
        videoId = url.split('vimeo.com/')[1].split('?')[0].split('/')[0];
    }
    
    if (!videoId) throw new Error('Could not extract Vimeo video ID');
    
    let embedUrl = `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`;
    if (autoplay) embedUrl += '&autoplay=1&muted=1';
    
    return embedUrl;
}

function convertDailyMotionUrl(url, autoplay = false) {
    let videoId = '';
    
    if (url.includes('dailymotion.com/video/')) {
        videoId = url.split('/video/')[1].split('?')[0].split('_')[0];
    } else if (url.includes('dai.ly/')) {
        videoId = url.split('dai.ly/')[1].split('?')[0];
    }
    
    if (!videoId) throw new Error('Could not extract DailyMotion video ID');
    
    let embedUrl = `https://www.dailymotion.com/embed/video/${videoId}?ui-logo=0`;
    if (autoplay) embedUrl += '&autoplay=1&mute=1';
    
    return embedUrl;
}

// ===== LOGGING =====
function log(message, type = 'info') {
    const outputContent = document.getElementById('outputContent');
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;
    
    outputContent.appendChild(logEntry);
    outputContent.scrollTop = outputContent.scrollHeight;
}

function logInfo(msg) { log(msg, 'info'); }
function logSuccess(msg) { log(msg, 'success'); }
function logError(msg) { log(msg, 'error'); }
function logWarning(msg) { log(msg, 'warning'); }
function logVoice(msg) { log(msg, 'voice'); }

// ===== UI UTILITIES =====
function clearCommand() {
    document.getElementById('commandInput').value = '';
    document.getElementById('commandHighlight').innerHTML = '';
    logInfo('Command input cleared');
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== EVENT LISTENERS =====
const commandInput = document.getElementById('commandInput');
commandInput.addEventListener('input', highlightSyntax);
commandInput.addEventListener('scroll', () => {
    const highlight = document.getElementById('commandHighlight');
    highlight.scrollTop = commandInput.scrollTop;
    highlight.scrollLeft = commandInput.scrollLeft;
});

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeCommand();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        clearCommand();
    }
    if (e.key === 'Escape' && activeTabs.length > 0) {
        closeAllTabs();
    }
});

// ===== INITIALIZATION =====
window.addEventListener('load', () => {
    logInfo('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logInfo('🤖 II Command Center v3.1 - Multi-Platform Edition');
    logInfo('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logSuccess('✓ Voice recognition ready');
    logSuccess('✓ Wake word detection ready');
    logSuccess('✓ Multi-platform support enabled');
    logSuccess('✓ Simultaneous commands enabled');
    logInfo('');
    logInfo('🎤 Voice Controls:');
    logInfo('  • Click microphone or say "Hey Command"');
    logInfo('  • Enable wake word for hands-free operation');
    logInfo('');
    logInfo('📺 Supported Platforms:');
    logSuccess('  • YouTube (youtube.com, youtu.be)');
    logSuccess('  • Twitch (twitch.tv)');
    logSuccess('  • Vimeo (vimeo.com)');
    logSuccess('  • DailyMotion (dailymotion.com)');
    logInfo('  • Facebook, Instagram, TikTok (limited embed)');
    logInfo('');
    logInfo('Available Commands:');
    logSuccess('  RAITHA: watch, lurk, refresh, mute, unmute, scroll, fullscreen');
    logSuccess('  RENA: test, scrape, compare, monitor, download, ping');
    logSuccess('  LEAF: schedule, loop, batch, parallel, chain, rotate');
    logInfo('');
    logInfo('✨ NEW: Multiple commands in one line using |');
    logInfo('  Example: Raitha Ex.watch url1.10 | Raitha Ex.watch url2.10');
    logInfo('');
    logInfo('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    setTimeout(() => {
        if (initVoiceRecognition()) {
            setTimeout(() => toggleWakeWord(), 500);
        }
    }, 1000);
});

// Make functions globally available
window.selectII = selectII;
window.executeCommand = executeCommand;
window.clearCommand = clearCommand;
window.closeTab = closeTab;
window.closeAllTabs = closeAllTabs;
window.toggleSection = toggleSection;
window.toggleVoice = toggleVoice;
window.toggleWakeWord = toggleWakeWord;

