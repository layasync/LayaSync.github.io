// Main application logic
let currentStreams = [];
let currentStreamIndex = 0;
let currentPlayerMode = null;
window.currentPlayerMode = null;

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');

    // Update focusable elements after screen change
    setTimeout(() => navigation.updateFocusableElements(), 100);
}

function showLogin() {
    showScreen('loginScreen');
}

function showMainMenu() {
    showScreen('mainMenuScreen');
}

function showLive() {
    showScreen('liveScreen');
    loadLiveContent();
}

function showVOD() {
    showScreen('vodScreen');
    loadVODContent();
}

function showSeries() {
    showScreen('seriesScreen');
    loadSeriesContent();
}

function showSettings() {
    showScreen('settingsScreen');
}

// Login handling
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const serverUrl = document.getElementById('serverUrl').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Save credentials
    apiClient.setCredentials(serverUrl, username, password);

    try {
        // Try to authenticate
        const auth = await apiClient.authenticate();

        if (auth.user_info && auth.user_info.auth === 1) {
            // Show user info
            document.getElementById('userInfo').textContent = 
                `Welcome ${auth.user_info.username} | Expires: ${auth.user_info.exp_date}`;

            showMainMenu();
        } else {
            alert('Authentication failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Failed to connect to server. Using demo mode.');

        // Demo mode - still allow access
        document.getElementById('userInfo').textContent = `Demo User`;
        showMainMenu();
    }
});

// Live TV Content
async function loadLiveContent() {
    try {
        const categories = await apiClient.getLiveCategories();
        displayCategories(categories, 'liveCategories', loadLiveStreams);

        // Load all streams initially
        loadLiveStreams('');
    } catch (error) {
        console.error('Error loading live content:', error);
        document.getElementById('liveCategories').innerHTML = 
            '<p style="color: red;">Failed to load categories</p>';
    }
}

async function loadLiveStreams(categoryId) {
    try {
        const streams = await apiClient.getLiveStreams(categoryId);
        currentStreams = streams;
        currentPlayerMode = 'live';
        window.currentPlayerMode = 'live';
        displayChannels(streams, 'liveChannels');
    } catch (error) {
        console.error('Error loading live streams:', error);
        document.getElementById('liveChannels').innerHTML = 
            '<p style="color: red;">Failed to load streams</p>';
    }
}

// VOD Content
async function loadVODContent() {
    try {
        const categories = await apiClient.getVODCategories();
        displayCategories(categories, 'vodCategories', loadVODStreams);

        // Load all VOD initially
        loadVODStreams('');
    } catch (error) {
        console.error('Error loading VOD content:', error);
        document.getElementById('vodCategories').innerHTML = 
            '<p style="color: red;">Failed to load categories</p>';
    }
}

async function loadVODStreams(categoryId) {
    try {
        const vods = await apiClient.getVODStreams(categoryId);
        currentStreams = vods;
        currentPlayerMode = 'vod';
        window.currentPlayerMode = 'vod';
        displayVODs(vods, 'vodList');
    } catch (error) {
        console.error('Error loading VOD streams:', error);
        document.getElementById('vodList').innerHTML = 
            '<p style="color: red;">Failed to load VOD</p>';
    }
}

// Series Content
async function loadSeriesContent() {
    try {
        const categories = await apiClient.getSeriesCategories();
        displayCategories(categories, 'seriesCategories', loadSeriesStreams);

        // Load all series initially
        loadSeriesStreams('');
    } catch (error) {
        console.error('Error loading series content:', error);
        document.getElementById('seriesCategories').innerHTML = 
            '<p style="color: red;">Failed to load categories</p>';
    }
}

async function loadSeriesStreams(categoryId) {
    try {
        const series = await apiClient.getSeries(categoryId);
        currentStreams = series;
        currentPlayerMode = 'series';
        window.currentPlayerMode = 'series';
        displaySeries(series, 'seriesList');
    } catch (error) {
        console.error('Error loading series:', error);
        document.getElementById('seriesList').innerHTML = 
            '<p style="color: red;">Failed to load series</p>';
    }
}

// Display functions
function displayCategories(categories, containerId, onClickHandler) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    // Add "All" category
    const allCat = document.createElement('div');
    allCat.className = 'category-item focusable active';
    allCat.textContent = 'All Categories';
    allCat.onclick = () => {
        document.querySelectorAll(`#${containerId} .category-item`).forEach(item => {
            item.classList.remove('active');
        });
        allCat.classList.add('active');
        onClickHandler('');
    };
    container.appendChild(allCat);

    categories.forEach(category => {
        const div = document.createElement('div');
        div.className = 'category-item focusable';
        div.textContent = category.category_name;
        div.onclick = () => {
            document.querySelectorAll(`#${containerId} .category-item`).forEach(item => {
                item.classList.remove('active');
            });
            div.classList.add('active');
            onClickHandler(category.category_id);
        };
        container.appendChild(div);
    });

    navigation.updateFocusableElements();
}

function displayChannels(channels, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (!channels || channels.length === 0) {
        container.innerHTML = '<p>No channels available</p>';
        return;
    }

    channels.forEach((channel, index) => {
        const div = document.createElement('div');
        div.className = 'channel-item focusable';
        div.innerHTML = `
            ${channel.stream_icon ? `<img src="${channel.stream_icon}" class="channel-icon" onerror="this.style.display='none'">` : '<div class="channel-icon"></div>'}
            <div class="channel-name">${channel.name}</div>
            <div class="channel-number">Channel ${channel.num || index + 1}</div>
        `;
        div.onclick = () => playStream(index, 'live');
        container.appendChild(div);
    });

    navigation.updateFocusableElements();
}

function displayVODs(vods, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (!vods || vods.length === 0) {
        container.innerHTML = '<p>No movies available</p>';
        return;
    }

    vods.forEach((vod, index) => {
        const div = document.createElement('div');
        div.className = 'vod-item focusable';
        div.innerHTML = `
            <div class="vod-icon">🎬</div>
            <div class="vod-name">${vod.name}</div>
        `;
        div.onclick = () => playStream(index, 'vod');
        container.appendChild(div);
    });

    navigation.updateFocusableElements();
}

function displaySeries(series, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (!series || series.length === 0) {
        container.innerHTML = '<p>No series available</p>';
        return;
    }

    series.forEach((serie, index) => {
        const div = document.createElement('div');
        div.className = 'series-item focusable';
        div.innerHTML = `
            ${serie.cover ? `<img src="${serie.cover}" class="series-icon" onerror="this.style.display='none'">` : '<div class="series-icon">📺</div>'}
            <div class="series-name">${serie.name}</div>
        `;
        div.onclick = () => playStream(index, 'series');
        container.appendChild(div);
    });

    navigation.updateFocusableElements();
}

// Player functions
function playStream(index, type) {
    currentStreamIndex = index;
    currentPlayerMode = type;
    window.currentPlayerMode = type;

    const stream = currentStreams[index];
    const videoPlayer = document.getElementById('videoPlayer');

    let streamId;
    let streamName;
    let extension = 'ts';

    if (type === 'live') {
        streamId = stream.stream_id;
        streamName = stream.name;
    } else if (type === 'vod') {
        streamId = stream.stream_id;
        streamName = stream.name;
        extension = stream.container_extension || 'mp4';
    } else if (type === 'series') {
        streamId = stream.series_id;
        streamName = stream.name;
    }

    const streamURL = apiClient.getStreamURL(streamId, type, extension);

    document.getElementById('playerTitle').textContent = streamName;
    document.getElementById('playerDescription').textContent = 
        stream.plot || `Playing ${type} content`;

    videoPlayer.src = streamURL;
    videoPlayer.load();
    videoPlayer.play();

    showScreen('playerScreen');

    // Show controls initially
    showPlayerControls();

    // Auto-hide controls after 5 seconds
    setTimeout(hidePlayerControls, 5000);

    // Show controls on any interaction
    videoPlayer.addEventListener('mousemove', showPlayerControls);

    // Update subtitle and audio tracks when metadata is loaded
    videoPlayer.addEventListener('loadedmetadata', updateTracks);
}

let controlsTimeout;

function showPlayerControls() {
    const controls = document.getElementById('playerControls');
    controls.classList.add('visible');

    // Clear existing timeout
    if (controlsTimeout) {
        clearTimeout(controlsTimeout);
    }

    // Hide after 5 seconds
    controlsTimeout = setTimeout(hidePlayerControls, 5000);
}

function hidePlayerControls() {
    const controls = document.getElementById('playerControls');
    controls.classList.remove('visible');
}

function togglePlayPause() {
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer.paused) {
        videoPlayer.play();
    } else {
        videoPlayer.pause();
    }
    showPlayerControls();
}

function previousChannel() {
    if (currentStreamIndex > 0) {
        playStream(currentStreamIndex - 1, currentPlayerMode);
    } else {
        // Wrap to last channel
        playStream(currentStreams.length - 1, currentPlayerMode);
    }
}

function nextChannel() {
    if (currentStreamIndex < currentStreams.length - 1) {
        playStream(currentStreamIndex + 1, currentPlayerMode);
    } else {
        // Wrap to first channel
        playStream(0, currentPlayerMode);
    }
}

function closePlayer() {
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.pause();
    videoPlayer.src = '';

    // Return to appropriate screen
    if (currentPlayerMode === 'live') {
        showLive();
    } else if (currentPlayerMode === 'vod') {
        showVOD();
    } else if (currentPlayerMode === 'series') {
        showSeries();
    } else {
        showMainMenu();
    }
}

// Subtitle and audio track management
function updateTracks() {
    const videoPlayer = document.getElementById('videoPlayer');

    // Update subtitle tracks
    const subtitleContainer = document.getElementById('subtitleTracks');
    subtitleContainer.innerHTML = '';

    const textTracks = videoPlayer.textTracks;
    if (textTracks.length > 0) {
        for (let i = 0; i < textTracks.length; i++) {
            const track = textTracks[i];
            const div = document.createElement('div');
            div.className = 'track-item focusable';
            div.textContent = track.label || `Subtitle ${i + 1}`;
            div.onclick = () => selectSubtitleTrack(i);
            subtitleContainer.appendChild(div);
        }
    } else {
        subtitleContainer.innerHTML = '<p>No subtitles available</p>';
    }

    // Update audio tracks
    const audioContainer = document.getElementById('audioTracks');
    audioContainer.innerHTML = '';

    const audioTracks = videoPlayer.audioTracks;
    if (audioTracks && audioTracks.length > 0) {
        for (let i = 0; i < audioTracks.length; i++) {
            const track = audioTracks[i];
            const div = document.createElement('div');
            div.className = 'track-item focusable';
            div.textContent = track.label || `Audio ${i + 1}`;
            div.onclick = () => selectAudioTrack(i);
            audioContainer.appendChild(div);
        }
    } else {
        audioContainer.innerHTML = '<p>No audio tracks available</p>';
    }
}

function toggleSubtitles() {
    const selector = document.getElementById('subtitleSelector');
    const audioSelector = document.getElementById('audioSelector');

    audioSelector.style.display = 'none';

    if (selector.style.display === 'none' || selector.style.display === '') {
        selector.style.display = 'block';
        navigation.updateFocusableElements();
    } else {
        selector.style.display = 'none';
        navigation.updateFocusableElements();
    }

    showPlayerControls();
}

function toggleAudio() {
    const selector = document.getElementById('audioSelector');
    const subtitleSelector = document.getElementById('subtitleSelector');

    subtitleSelector.style.display = 'none';

    if (selector.style.display === 'none' || selector.style.display === '') {
        selector.style.display = 'block';
        navigation.updateFocusableElements();
    } else {
        selector.style.display = 'none';
        navigation.updateFocusableElements();
    }

    showPlayerControls();
}

function selectSubtitleTrack(index) {
    const videoPlayer = document.getElementById('videoPlayer');
    const textTracks = videoPlayer.textTracks;

    // Disable all tracks
    for (let i = 0; i < textTracks.length; i++) {
        textTracks[i].mode = 'disabled';
    }

    // Enable selected track
    if (index >= 0 && index < textTracks.length) {
        textTracks[index].mode = 'showing';
    }

    toggleSubtitles(); // Hide selector
}

function selectAudioTrack(index) {
    const videoPlayer = document.getElementById('videoPlayer');
    const audioTracks = videoPlayer.audioTracks;

    if (audioTracks && index >= 0 && index < audioTracks.length) {
        // Disable all tracks
        for (let i = 0; i < audioTracks.length; i++) {
            audioTracks[i].enabled = false;
        }

        // Enable selected track
        audioTracks[index].enabled = true;
    }

    toggleAudio(); // Hide selector
}

function logout() {
    apiClient.clearCredentials();
    showLogin();
}

// Initialize app
window.addEventListener('load', () => {
    // Check if credentials are stored
    if (apiClient.loadCredentials()) {
        // Auto-login
        document.getElementById('serverUrl').value = apiClient.credentials.serverUrl;
        document.getElementById('username').value = apiClient.credentials.username;
        document.getElementById('password').value = apiClient.credentials.password;

        // Trigger login
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    } else {
        showLogin();
    }
});