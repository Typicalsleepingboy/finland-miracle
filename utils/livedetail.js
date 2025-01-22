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


function handleAutoplayError(error, videoElement) {
    if (error.name === 'NotAllowedError') {
        const playButton = createPlayButton();
        const videoContainer = videoElement.parentElement;
        videoContainer.style.position = 'relative';
        videoContainer.appendChild(playButton);

        playButton.addEventListener('click', async () => {
            try {
                await videoElement.play();
                playButton.remove();
            } catch (err) {
                showOfflineState();
            }
        });
        return true;
    }
    return false;
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

    offlineContainer.append(offlineIcon, offlineText, offlineDescription);

    const videoContainer = document.getElementById('liveStream').parentElement;
    videoContainer.innerHTML = '';
    videoContainer.appendChild(offlineContainer);

    // Update UI elements
    const elements = {
        'memberName': 'Room Offline',
        'streamTitle': 'No active stream',
        'viewCount': '-',
        'startTime': '-',
        'streamQuality': '-'
    };

    Object.entries(elements).forEach(([id, text]) => {
        document.getElementById(id).textContent = text;
    });

    document.getElementById('stageUsersList').classList.add('hidden');
}

async function playM3u8(url) {
    return new Promise((resolve, reject) => {
        if (!video) {
            reject(new Error('Video element not initialized'));
            return;
        }

        if (Hls.isSupported()) {
            const savedVolume = localStorage.getItem('playerVolume') || 0.3;
            video.volume = parseFloat(savedVolume);

            if (hls) hls.destroy();

            hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });

            const m3u8Url = decodeURIComponent(url);
            hls.loadSource(m3u8Url);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, async () => {
                try {
                    await video.play();
                    resolve();
                } catch (error) {
                    if (handleAutoplayError(error, video)) {
                        resolve();
                    } else {
                        reject(error);
                    }
                }
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    showOfflineState();
                    hls.destroy();
                    reject(new Error('Fatal HLS error'));
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.addEventListener('canplay', async () => {
                try {
                    await video.play();
                    resolve();
                } catch (error) {
                    if (handleAutoplayError(error, video)) {
                        resolve();
                    } else {
                        reject(error);
                    }
                }
            });
            video.volume = parseFloat(localStorage.getItem('playerVolume') || 0.3);
        } else {
            reject(new Error('HLS not supported'));
        }
    });
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
        // Only proceed if it's a Showroom stream
        if (platform === 'showroom' || platform === 'sr') {
            const response = await fetch('https://48intensapi.my.id/api/showroom/jekatepatlapan');
            if (!response.ok) throw new Error('Failed to fetch Showroom data');

            const data = await response.json();
            const streamData = data.find(stream =>
                stream.room_url_key.replace('JKT48_', '').toLowerCase() === memberName.toLowerCase()
            );

            if (streamData && streamData.stage_users) {
                updateStageUsersList(streamData.stage_users);

                // Add a subtle animation to show the refresh was successful
                const container = document.getElementById('stageUsersContainer');
                container.style.opacity = '0';
                setTimeout(() => {
                    container.style.opacity = '1';
                }, 150);
            }
        }
    } catch (error) {
        showOfflineState();
    }
}


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


async function initializePlyr(streamingUrlList) {
    // Validasi streamingUrlList
    if (!Array.isArray(streamingUrlList) || streamingUrlList.length === 0) {
        console.error('Invalid streamingUrlList:', streamingUrlList);
        return;
    }

    // Select the video element
    const video = document.getElementById('video-player');

    if (!video) {
        console.error('Video element not found!');
        return;
    }

    // Check if HLS is supported
    if (Hls.isSupported()) {
        const hls = new Hls();

        // Set up quality options from streamingUrlList
        const qualityLevels = streamingUrlList.map((stream) => {
            return {
                label: stream.label,
                url: stream.url,
                quality: stream.quality,
                is_default: stream.is_default || false,
            };
        });

        // Sort qualities by quality level (low to high)
        qualityLevels.sort((a, b) => a.quality - b.quality);

        // Load default (highest quality or specified default)
        const defaultStream = qualityLevels.find(q => q.is_default) || qualityLevels[qualityLevels.length - 1];
        hls.loadSource(defaultStream.url);
        hls.attachMedia(video);

        // Initialize Plyr
        const player = new Plyr(video, {
            controls: ['play', 'progress', 'volume', 'settings', 'fullscreen'],
            settings: ['quality'],
        });

        // Add quality control to Plyr settings
        player.on('ready', () => {
            const settingsMenu = document.querySelector('.plyr__menu__container [data-plyr="settings"]');

            if (settingsMenu) {
                qualityLevels.forEach((quality, index) => {
                    const qualityItem = document.createElement('button');
                    qualityItem.type = 'button';
                    qualityItem.className = 'plyr__control';
                    qualityItem.dataset.plyr = 'quality';
                    qualityItem.textContent = quality.label;

                    // Handle click to change quality
                    qualityItem.addEventListener('click', () => {
                        hls.loadSource(quality.url);
                        hls.attachMedia(video);
                        player.play(); // Resume playing after quality change
                    });

                    settingsMenu.appendChild(qualityItem);
                });
            }
        });

        // Handle autoplay issues
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            video.play().catch(() => {
                const playButton = document.getElementById('manual-play');
                if (playButton) {
                    playButton.style.display = 'block';
                    playButton.addEventListener('click', () => {
                        video.play();
                        playButton.style.display = 'none';
                    });
                }
            });
        });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari, etc.)
        video.src = streamingUrlList.find(q => q.is_default)?.url || streamingUrlList[0].url;
    } else {
        console.error('HLS is not supported in this browser.');
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

            if (streamData) {
                const streamDescription =
                    `🎥 ${streamData.user.name} sedang live streaming di IDN Live! ${streamData.title || ''}\n` +
                    `👥 ${streamData.view_count || 0} viewers\n` +
                    `📺 Nonton sekarang di 48intens!`;
                const thumbnailUrl = streamData.user.avatar || streamData.image || streamData.user.profile_pic || 'https://res.cloudinary.com/dlx2zm7ha/image/upload/v1737299881/intens_iwwo2a.webp';

                updateMetaTags({
                    title: `${streamData.user.name} Live Streaming | 48intens`,
                    description: streamDescription,
                    image: thumbnailUrl,
                    imageWidth: '500',
                    imageHeight: '500',
                    url: window.location.href
                });

                updateIDNStreamInfo(streamData);
            } else {
                throw new Error('Stream not found');
            }
        } else if (platform === 'showroom' || platform === 'sr') {
            const response = await fetch('https://48intensapi.my.id/api/showroom/jekatepatlapan');
            if (!response.ok) throw new Error('Failed to fetch Showroom data');

            const data = await response.json();
            streamData = data.find(stream =>
                stream.room_url_key.replace('JKT48_', '').toLowerCase() === normalizedMemberName
            );

            if (streamData) {
                const streamDescription =
                    `🎥 ${streamData.main_name} sedang live streaming di SHOWROOM!\n` +
                    `${streamData.genre_name || ''}\n` +
                    `👥 ${streamData.view_num?.toLocaleString() || 0} viewers\n` +
                    `📺 Nonton sekarang di 48intens!`;
                const thumbnailUrl = streamData.image_square || streamData.image || 'https://res.cloudinary.com/dlx2zm7ha/image/upload/v1737299881/intens_iwwo2a.webp';

                updateMetaTags({
                    title: `${streamData.main_name} Live Streaming | 48intens`,
                    description: streamDescription,
                    image: thumbnailUrl,
                    imageWidth: '320',
                    imageHeight: '320',
                    url: window.location.href
                });

                updateShowroomStreamInfo(streamData);
            } else {
                throw new Error('Stream not found');
            }
        }
    } catch (error) {
        showOfflineState();
    }
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
            throw new Error('Stream has been finished');
        }
        Mousetrap.bind('space', playPause);
        Mousetrap.bind('up', volumeUp);
        Mousetrap.bind('down', volumeDown);
        Mousetrap.bind('f', vidFullscreen);
        video.addEventListener('click', playPause);
        video.addEventListener('error', function (e) {
            showOfflineState();
        });
        playM3u8(streamData.mpath);

        await updateStreamInfo(platform, memberName);
    } catch (error) {
        showOfflineState();
    }
}


function updateMetaTags({
    title = 'Live Streaming | 48intens',
    description = 'Watch JKT48 members live streaming on 48intens',
    image = 'https://res.cloudinary.com/dlx2zm7ha/image/upload/v1737299881/intens_iwwo2a.webp',
    imageWidth = '1200',
    imageHeight = '630',
    url = window.location.href
}) {
    // Ensure we have default values
    const baseUrl = 'https://finland-miracle.vercel.app';
    const currentUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    const safeDescription = description || 'Watch JKT48 members live streaming on 48intens';
    const timestamp = Math.floor(Date.now() / 1000);

    // Create meta tags configuration
    const metaTags = [
        // Basic meta tags
        { name: 'description', content: safeDescription },
        { name: 'keywords', content: 'JKT48, IDN Live, Showroom, Live Streaming, 48intens, idol, JKT48 Live' },
        { name: 'author', content: '48intens' },
        { name: 'robots', content: 'index, follow' },

        // Open Graph tags
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: '48intens' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: safeDescription },
        { property: 'og:url', content: currentUrl },
        { property: 'og:image', content: image },
        { property: 'og:image:secure_url', content: image },
        { property: 'og:image:width', content: imageWidth },
        { property: 'og:image:height', content: imageHeight },
        { property: 'og:image:alt', content: title },
        { property: 'og:locale', content: 'id_ID' },
        { property: 'og:updated_time', content: timestamp.toString() },

        // Twitter Card tags
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@48intens' },
        { name: 'twitter:creator', content: '@48intens' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: safeDescription },
        { name: 'twitter:image', content: image },
        { name: 'twitter:image:alt', content: title },

        // Additional tags for SEO and sharing
        { name: 'application-name', content: '48intens' },
        { name: 'theme-color', content: '#ffffff' }
    ];

    document.title = title;

    function updateMetaTag(tagData) {
        const { name, property, content } = tagData;
        const selector = property ?
            `meta[property="${property}"]` :
            `meta[name="${name}"]`;

        let tag = document.querySelector(selector);

        if (!tag) {
            tag = document.createElement('meta');
            if (property) {
                tag.setAttribute('property', property);
            } else {
                tag.setAttribute('name', name);
            }
            document.head.appendChild(tag);
        }

        tag.setAttribute('content', content);
    }

    metaTags.forEach(updateMetaTag);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    canonical.href = currentUrl;
    const icons = [
        { rel: 'icon', href: '/assets/image/icon.png' },
        { rel: 'apple-touch-icon', href: '/assets/image/icon.png' }
    ];

    icons.forEach(({ rel, href }) => {
        let link = document.querySelector(`link[rel="${rel}"]`);
        if (!link) {
            link = document.createElement('link');
            link.rel = rel;
            document.head.appendChild(link);
        }
        link.href = href;
    });
}

function updateIDNStreamInfo(data) {
    if (!data?.user) {
        return;
    }

    try {
        const elements = {
            'memberName': data.user.name || 'Unknown Member',
            'streamTitle': data.title || 'No Title',
            'viewCount': `${data.view_count || 0} viewers`,
            'startTime': data.live_at ? new Date(data.live_at).toLocaleTimeString() : 'Unknown',
            'streamQuality': 'HD'
        };

        Object.entries(elements).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = text;
        });

        const streamDescription = [
            `🎥 ${data.user.name} sedang live streaming di IDN Live!`,
            data.title || '',
            `👥 ${data.view_count || 0} viewers sedang menonton`,
            '📺 Nonton sekarang di 48intens!'
        ].filter(Boolean).join('\n');

        const thumbnailUrl = data.user.avatar || data.image || data.user.profile_pic ||
            'https://res.cloudinary.com/dlx2zm7ha/image/upload/v1737299881/intens_iwwo2a.webp';

        updateMetaTags({
            title: `${data.user.name} Live Streaming | 48intens`,
            description: streamDescription,
            image: thumbnailUrl,
            imageWidth: '1200',
            imageHeight: '630',
            url: window.location.href
        });
    } catch (err) {
        showOfflineState();
    }
}

function updateShowroomStreamInfo(data) {
    if (!data) {
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





document.addEventListener('DOMContentLoaded', initializePlayer);