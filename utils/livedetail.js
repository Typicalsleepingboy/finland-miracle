let hls = null;
let player = null;
let video = null;

function decompressStreamData(streamId) {
    const data = localStorage.getItem(`stream_${streamId}`);
    if (!data) return null;

    const streamData = JSON.parse(data);
    if (streamData.exp < Date.now()) {
        localStorage.removeItem(`stream_${streamId}`);
        return null;
    }

    return streamData;
}

function playM3u8(url) {
    if (!video) {
        console.error('Video element not initialized');
        showOfflineState();
        return;
    }

    if (Hls.isSupported()) {
        const savedVolume = localStorage.getItem('playerVolume');
        video.volume = savedVolume ? parseFloat(savedVolume) : 0.3;
        if (hls) {
            hls.destroy();
        }

        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });

        const m3u8Url = decodeURIComponent(url);
        hls.loadSource(m3u8Url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            video.play().catch(e => {
                console.error('Error autoplaying:', e);
                showOfflineState();
            });
        });

        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                console.error('Fatal HLS error:', data);
                showOfflineState();
                hls.destroy();
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('canplay', function () {
            video.play().catch(e => {
                console.error('Error autoplaying:', e);
                showOfflineState();
            });
        });
        const savedVolume = localStorage.getItem('playerVolume');
        video.volume = savedVolume ? parseFloat(savedVolume) : 0.3;
    }
}

// Player controls
function playPause() {
    if (!video) return;
    video.paused ? video.play() : video.pause();
}

function volumeUp() {
    if (!video) return;
    if (video.volume <= 0.9) {
        video.volume += 0.1;
        localStorage.setItem('playerVolume', video.volume);
    }
}

function volumeDown() {
    if (!video) return;
    if (video.volume >= 0.1) {
        video.volume -= 0.1;
        localStorage.setItem('playerVolume', video.volume);
    }
}

function vidFullscreen() {
    if (!video) return;
    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.mozRequestFullScreen) {
        video.mozRequestFullScreen();
    } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
    }
}

function initializePlyr() {
    const plyrOptions = {
        controls: [
            'play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'pip', 'airplay', 'fullscreen'
        ],
        settings: ['quality', 'speed'],
        keyboard: { focused: true, global: true },
        tooltips: { controls: true, seek: true },
        quality: {
            default: 720,
            options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240]
        }
    };

    player = new Plyr('#liveStream', plyrOptions);
    player.on('volumechange', () => {
        localStorage.setItem('playerVolume', player.volume);
    });
    player.on('error', (error) => {
        console.error('Plyr error:', error);
        showErrorState('Error playing video stream');
    });

    return player.elements.container.querySelector('video');
}

function updateStageUsersList(stageUsers) {
    const stageUsersList = document.getElementById('stageUsersList');
    const container = document.getElementById('stageUsersContainer');
    if (!stageUsers || stageUsers.length === 0) {
        stageUsersList.classList.add('hidden');
        return;
    }
    stageUsersList.classList.remove('hidden');
    container.innerHTML = '';
    stageUsers.forEach(stageUser => {
        const userDiv = document.createElement('div');
        userDiv.className = 'flex items-center space-x-4 p-2 hover:bg-gray-50 rounded-lg transition-colors';
        const imageContainer = document.createElement('div');
        imageContainer.className = 'flex-shrink-0 relative';

        const userImage = document.createElement('img');
        userImage.className = 'w-12 h-12 rounded-full object-cover';
        userImage.src = stageUser.user.avatar_url || 'https://static.showroom-live.com/assets/img/no_profile.jpg';
        userImage.alt = stageUser.user.name;

        const rankBadge = document.createElement('span');
        rankBadge.className = 'absolute -top-1 -right-1 bg-rose-300 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center';
        rankBadge.textContent = stageUser.rank;

        imageContainer.appendChild(userImage);
        imageContainer.appendChild(rankBadge);

        const userInfo = document.createElement('div');
        userInfo.className = 'flex-grow min-w-0';

        const userName = document.createElement('p');
        userName.className = 'text-sm font-medium text-gray-900 truncate';
        userName.textContent = stageUser.user.name;

        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'flex items-center space-x-1';

        const avatarImage = document.createElement('img');
        avatarImage.className = 'w-4 h-4';
        avatarImage.src = stageUser.user.avatar_url || '';
        avatarImage.alt = 'Avatar';

        avatarContainer.appendChild(avatarImage);
        userInfo.appendChild(userName);
        userInfo.appendChild(avatarContainer);
        userDiv.appendChild(imageContainer);
        userDiv.appendChild(userInfo);

        container.appendChild(userDiv);
    });
}


async function refreshPodiumData() {
    try {
        const pathSegments = window.location.pathname.split('/');
        const platform = pathSegments[2];
        const memberName = pathSegments[3];
        if (platform === 'showroom' || platform === 'sr') {
            const response = await fetch('https://48intensapi.my.id/api/showroom/jekatepatlapan');
            if (!response.ok) throw new Error('Failed to fetch Showroom data');

            const data = await response.json();
            const streamData = data.find(stream =>
                stream.room_url_key.replace('JKT48_', '').toLowerCase() === memberName.toLowerCase()
            );

            if (streamData && streamData.stage_users) {
                updateStageUsersList(streamData.stage_users);
                const container = document.getElementById('stageUsersContainer');
                container.style.opacity = '0';
                setTimeout(() => {
                    container.style.opacity = '1';
                }, 150);
            }
        }
    } catch (error) {
        console.error('Error refreshing podium data:', error);
    }
}

async function updateStreamInfo(platform, memberName) {
    try {
        let streamData;
        const normalizedMemberName = memberName.toLowerCase();

        if (platform === 'idn') {
            const response = await fetch('https://48intensapi.my.id/api/idnlive/jkt48');
            if (!response.ok) throw new Error('Failed to fetch IDN data');

            const data = await response.json();
            streamData = data.data.find(stream =>
                stream.user.username.replace('jkt48_', '').toLowerCase() === normalizedMemberName
            );

            if (!streamData) {
                throw new Error('Stream not found');
            }
            updateIDNStreamInfo(streamData);
        } else if (platform === 'showroom' || platform === 'sr') {
            const response = await fetch('https://48intensapi.my.id/api/showroom/jekatepatlapan');
            if (!response.ok) throw new Error('Failed to fetch Showroom data');

            const data = await response.json();
            streamData = data.find(stream =>
                stream.room_url_key.replace('JKT48_', '').toLowerCase() === normalizedMemberName
            );

            if (!streamData) {
                throw new Error('Stream not found');
            }
            updateShowroomStreamInfo(streamData);
        }
    } catch (error) {
        console.error('Error updating stream info:', error);
        showOfflineState();
        throw error; 
    }
}

function updateIDNStreamInfo(data) {
    if (!data || !data.user) {
        showErrorState('Invalid stream data received');
        return;
    }

    try {
        document.getElementById('memberName').textContent = data.user.name || 'Unknown Member';
        document.getElementById('streamTitle').textContent = data.title || 'No Title';
        document.getElementById('viewCount').textContent = `${data.view_count || 0} viewers`;
        document.getElementById('startTime').textContent = data.live_at
            ? new Date(data.live_at).toLocaleTimeString()
            : 'Unknown';
        document.getElementById('streamQuality').textContent = 'HD';

        const streamDescription =
            `🎥 ${data.user.name} sedang live streaming di IDN Live! ${data.title || ''}\n` +
            `👥 ${data.view_count || 0} viewers\n` +
            `📺 Nonton sekarang di 48intens!`;
        const thumbnailUrl = data.user.avatar || data.image || data.user.profile_pic || 'https://res.cloudinary.com/dlx2zm7ha/image/upload/v1737299881/intens_iwwo2a.webp';

        updateMetaTags({
            title: `${data.user.name} Live Streaming | 48intens`,
            description: streamDescription,
            image: thumbnailUrl,
            imageWidth: '500',
            imageHeight: '500',
            url: window.location.href
        });
    } catch (err) {
        console.error('Error updating IDN stream info:', err);
        showErrorState('Error displaying stream information');
    }
}

function updateShowroomStreamInfo(data) {
    if (!data) {
        showErrorState('Invalid stream data received');
        return;
    }

    const originalQuality = data.streaming_url_list?.find(stream => stream.label === 'original quality');
    if (!originalQuality) {
        throw new Error('Original quality stream not found');
    }

    document.getElementById('memberName').textContent = data.main_name || 'Unknown Member';
    document.getElementById('streamTitle').textContent = data.genre_name || 'No Title';
    document.getElementById('viewCount').textContent = `${(data.view_num || 0).toLocaleString()} viewers`;
    document.getElementById('startTime').textContent = data.started_at
        ? new Date(data.started_at * 1000).toLocaleTimeString()
        : 'Unknown';
    document.getElementById('streamQuality').textContent = originalQuality.label || 'Unknown';

    const streamDescription =
        `🎥 ${data.main_name} sedang live streaming di SHOWROOM!\n` +
        `${data.genre_name || ''}\n` +
        `👥 ${data.view_num?.toLocaleString() || 0} viewers\n` +
        `📺 Nonton sekarang di 48intens!`;

    const thumbnailUrl = data.image_square || data.image || data.room_url_key || 'https://res.cloudinary.com/dlx2zm7ha/image/upload/v1737299881/intens_iwwo2a.webp';

    updateMetaTags({
        title: `${data.main_name} Live Streaming | 48intens`,
        description: streamDescription,
        image: thumbnailUrl,
        imageWidth: '320',
        imageHeight: '320',
        url: window.location.href
    });
    if (data.stage_users) {
        updateStageUsersList(data.stage_users);
    }

    playM3u8(originalQuality.url);
}


function showErrorState(message) {
    document.getElementById('memberName').textContent = 'Error';
    document.getElementById('streamTitle').textContent = message || 'Failed to load stream data';
    document.getElementById('viewCount').textContent = '-';
    document.getElementById('startTime').textContent = '-';
    document.getElementById('streamQuality').textContent = '-';

    document.getElementById('stageUsersList').classList.add('hidden');

    updateMetaTags({
        title: '48intens - Stream Error',
        description: message || 'Failed to load stream data',
        image: '/assets/image/icon.png',
        url: window.location.href
    });
}

function updateMetaTags({ title, description, image, imageWidth, imageHeight, url }) {
    document.title = title;

    function updateMetaTag(attrs) {
        let tag = document.querySelector(
            attrs.property ? 
            `meta[property="${attrs.property}"]` : 
            `meta[name="${attrs.name}"]`
        );
        
        if (!tag) {
            tag = document.createElement('meta');
            document.head.appendChild(tag);
        }
        
        Object.entries(attrs).forEach(([key, value]) => {
            tag.setAttribute(key, value);
        });
    }

    // Basic meta tags
    updateMetaTag({ name: 'description', content: description });
    updateMetaTag({ name: 'keywords', content: 'JKT48, live streaming, 48intens, idol, live' });

    // Open Graph tags
    updateMetaTag({ property: 'og:site_name', content: '48intens' });
    updateMetaTag({ property: 'og:title', content: title });
    updateMetaTag({ property: 'og:description', content: description });
    updateMetaTag({ property: 'og:type', content: 'website' });
    updateMetaTag({ property: 'og:url', content: url });
    updateMetaTag({ property: 'og:image', content: image });
    updateMetaTag({ property: 'og:image:secure_url', content: image });
    updateMetaTag({ property: 'og:image:width', content: imageWidth });
    updateMetaTag({ property: 'og:image:height', content: imageHeight });
    updateMetaTag({ property: 'og:image:alt', content: title });

    // Twitter Card tags
    updateMetaTag({ name: 'twitter:card', content: 'summary_large_image' });
    updateMetaTag({ name: 'twitter:site', content: '@48intens' });
    updateMetaTag({ name: 'twitter:creator', content: '@48intens' });
    updateMetaTag({ name: 'twitter:title', content: title });
    updateMetaTag({ name: 'twitter:description', content: description });
    updateMetaTag({ name: 'twitter:image', content: image });
    updateMetaTag({ name: 'twitter:image:alt', content: title });

    // Update favicon
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
    }
    favicon.href = '/assets/image/icon.png';
}


function showOfflineState() {
    const offlineContainer = document.createElement('div');
    offlineContainer.className = 'flex flex-col items-center justify-center h-full p-8 bg-gray-50 rounded-lg';
    
    const offlineIcon = document.createElement('div');
    offlineIcon.className = 'text-gray-400 mb-4';
    offlineIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    `;

    const offlineText = document.createElement('h3');
    offlineText.className = 'text-lg font-medium text-gray-900 mb-2';
    offlineText.textContent = 'Room is Offline';

    const offlineDescription = document.createElement('p');
    offlineDescription.className = 'text-sm text-gray-500';
    offlineDescription.textContent = 'This room is currently not streaming. Please check back later.';

    offlineContainer.appendChild(offlineIcon);
    offlineContainer.appendChild(offlineText);
    offlineContainer.appendChild(offlineDescription);

    // Replace video player with offline state
    const videoContainer = document.getElementById('liveStream').parentElement;
    videoContainer.innerHTML = '';
    videoContainer.appendChild(offlineContainer);

    // Update stream info
    document.getElementById('memberName').textContent = 'Room Offline';
    document.getElementById('streamTitle').textContent = 'No active stream';
    document.getElementById('viewCount').textContent = '-';
    document.getElementById('startTime').textContent = '-';
    document.getElementById('streamQuality').textContent = '-';

    // Hide stage users list
    document.getElementById('stageUsersList').classList.add('hidden');

    // Update meta tags
    updateMetaTags({
        title: '48intens - Room Offline',
        description: 'This room is currently not streaming. Please check back later.',
        image: 'https://res.cloudinary.com/dlx2zm7ha/image/upload/v1737299881/intens_iwwo2a.webp',
        url: window.location.href
    });
}


async function initializePlayer() {
    try {
        video = document.getElementById('liveStream');
        if (!video) {
            throw new Error('Video element not found');
        }

        const pathSegments = window.location.pathname.split('/');
        const platform = pathSegments[2];
        const memberName = pathSegments[3];
        const streamId = pathSegments[4];

        if (platform === 'showroom' || platform === 'sr') {
            video = initializePlyr();
        } else if (platform === 'idn') {
            video = document.getElementById('liveStream');
        }

        const streamData = decompressStreamData(streamId);
        if (!streamData) {
            showOfflineState();
            return;
        }

        Mousetrap.bind('space', playPause);
        Mousetrap.bind('up', volumeUp);
        Mousetrap.bind('down', volumeDown);
        Mousetrap.bind('f', vidFullscreen);
        video.addEventListener('click', playPause);
        video.addEventListener('error', function (e) {
            console.error('Video error:', e);
            showOfflineState();
        });
        
        try {
            await updateStreamInfo(platform, memberName);
            playM3u8(streamData.mpath);
        } catch (error) {
            console.error('Error loading stream:', error);
            showOfflineState();
        }
    } catch (error) {
        console.error('Error initializing player:', error);
        showOfflineState();
    }
}

document.addEventListener('DOMContentLoaded', initializePlayer);