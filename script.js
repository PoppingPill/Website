// MediaHub - Personal Media Platform
// Main JavaScript File

// State Management
const state = {
    videos: [],
    photos: [],
    favorites: [],
    recentlyViewed: [],
    watchProgress: {},
    currentPage: 'home',
    currentVideo: null,
    currentPhoto: null,
    currentPhotoIndex: 0,
    slideshowInterval: null,
    settings: {
        darkMode: true,
        accentColor: '#e50914',
        autoplay: false,
        videoQuality: 'auto',
        externalSearchEnabled: true,
        defaultSource: 'e621',
        apiKey: ''
    },
    externalSearch: {
        currentPage: 1,
        results: [],
        totalResults: 0,
        currentQuery: '',
        currentSource: 'e621'
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeNavigation();
    initializeSidebar();
    initializeSearch();
    initializeUpload();
    initializeSettings();
    initializeExternalSearch();
    renderHomePage();
    setupKeyboardShortcuts();
});

// Data Management
function loadData() {
    const storedVideos = localStorage.getItem('mediahub_videos');
    const storedPhotos = localStorage.getItem('mediahub_photos');
    const storedFavorites = localStorage.getItem('mediahub_favorites');
    const storedRecentlyViewed = localStorage.getItem('mediahub_recentlyViewed');
    const storedWatchProgress = localStorage.getItem('mediahub_watchProgress');
    const storedSettings = localStorage.getItem('mediahub_settings');

    if (storedVideos) state.videos = JSON.parse(storedVideos);
    if (storedPhotos) state.photos = JSON.parse(storedPhotos);
    if (storedFavorites) state.favorites = JSON.parse(storedFavorites) || [];
    if (storedRecentlyViewed) state.recentlyViewed = JSON.parse(storedRecentlyViewed) || [];
    if (storedWatchProgress) state.watchProgress = JSON.parse(storedWatchProgress) || {};
    if (storedSettings) state.settings = { ...state.settings, ...JSON.parse(storedSettings) };

    applySettings();
}

function saveData() {
    localStorage.setItem('mediahub_videos', JSON.stringify(state.videos));
    localStorage.setItem('mediahub_photos', JSON.stringify(state.photos));
    localStorage.setItem('mediahub_favorites', JSON.stringify(state.favorites));
    localStorage.setItem('mediahub_recentlyViewed', JSON.stringify(state.recentlyViewed));
    localStorage.setItem('mediahub_watchProgress', JSON.stringify(state.watchProgress));
    localStorage.setItem('mediahub_settings', JSON.stringify(state.settings));
}

function applySettings() {
    // Apply dark mode
    if (!state.settings.darkMode) {
        document.documentElement.style.setProperty('--bg-primary', '#ffffff');
        document.documentElement.style.setProperty('--bg-secondary', '#f5f5f5');
        document.documentElement.style.setProperty('--bg-tertiary', '#e0e0e0');
        document.documentElement.style.setProperty('--text-primary', '#333333');
        document.documentElement.style.setProperty('--text-secondary', '#666666');
    }

    // Apply accent color
    document.documentElement.style.setProperty('--accent-color', state.settings.accentColor);
    document.documentElement.style.setProperty('--accent-hover', adjustColor(state.settings.accentColor, -20));

    // Update settings UI
    document.getElementById('darkModeToggle').checked = state.settings.darkMode;
    document.getElementById('accentColor').value = state.settings.accentColor;
    document.getElementById('autoplayToggle').checked = state.settings.autoplay;
    document.getElementById('videoQuality').value = state.settings.videoQuality;
    document.getElementById('externalSearchToggle').checked = state.settings.externalSearchEnabled;
    document.getElementById('defaultSource').value = state.settings.defaultSource;
    document.getElementById('apiKey').value = state.settings.apiKey || '';
}

function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById(`${page}Page`);
    if (targetPage) {
        targetPage.classList.add('active');
        state.currentPage = page;

        // Render page content
        switch (page) {
            case 'home':
                renderHomePage();
                break;
            case 'videos':
                renderVideosPage();
                break;
            case 'photos':
                renderPhotosPage();
                break;
            case 'favorites':
                renderFavoritesPage();
                break;
            case 'recent':
                renderRecentPage();
                break;
            case 'external':
                renderExternalPage();
                break;
        }
    }

    // Close sidebar on mobile
    if (window.innerWidth <= 992) {
        document.getElementById('sidebar').classList.remove('active');
    }
}

// Sidebar
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const menuToggle = document.getElementById('menuToggle');

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        document.querySelector('.main-content').classList.toggle('expanded');
    });

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 992 && 
            !sidebar.contains(e.target) && 
            !menuToggle.contains(e.target) &&
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });
}

// Search
function initializeSearch() {
    const searchBar = document.getElementById('searchBar');
    let searchTimeout;

    searchBar.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(e.target.value);
        }, 300);
    });
}

function performSearch(query) {
    if (!query.trim()) {
        navigateTo(state.currentPage);
        return;
    }

    const lowerQuery = query.toLowerCase();
    const matchingVideos = state.videos.filter(video => 
        video.title.toLowerCase().includes(lowerQuery) ||
        video.description.toLowerCase().includes(lowerQuery) ||
        video.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );

    const matchingPhotos = state.photos.filter(photo => 
        photo.title.toLowerCase().includes(lowerQuery) ||
        photo.description.toLowerCase().includes(lowerQuery) ||
        photo.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );

    // Show search results on current page
    if (state.currentPage === 'videos' || state.currentPage === 'home') {
        renderVideosGrid(matchingVideos);
    } else if (state.currentPage === 'photos') {
        renderPhotosGrid(matchingPhotos);
    }
}

// Upload
function initializeUpload() {
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadModal = document.getElementById('uploadModal');
    const uploadModalClose = document.getElementById('uploadModalClose');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadTabs = document.querySelectorAll('.upload-tab');
    const uploadSubmit = document.getElementById('uploadSubmit');

    let uploadType = 'video';
    let selectedFiles = [];

    uploadBtn.addEventListener('click', () => {
        uploadModal.classList.add('active');
    });

    uploadModalClose.addEventListener('click', () => {
        uploadModal.classList.remove('active');
        resetUploadForm();
    });

    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            uploadModal.classList.remove('active');
            resetUploadForm();
        }
    });

    uploadTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            uploadTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            uploadType = tab.dataset.type;
            fileInput.accept = uploadType === 'video' ? 'video/*' : 'image/*';
        });
    });

    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        selectedFiles = Array.from(files);
        if (selectedFiles.length > 0) {
            uploadArea.innerHTML = `
                <i class="fas fa-check-circle" style="color: var(--accent-color);"></i>
                <p>${selectedFiles.length} file(s) selected</p>
                <p style="font-size: 0.8rem; margin-top: 10px;">${selectedFiles.map(f => f.name).join(', ')}</p>
            `;
        }
    }

    uploadSubmit.addEventListener('click', () => {
        if (selectedFiles.length === 0) {
            alert('Please select files to upload');
            return;
        }

        const title = document.getElementById('uploadTitle').value;
        const description = document.getElementById('uploadDescription').value;
        const tags = document.getElementById('uploadTags').value.split(',').map(t => t.trim()).filter(t => t);
        const category = document.getElementById('uploadCategory').value;

        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const mediaData = {
                    id: Date.now() + index,
                    title: title || file.name,
                    description: description || '',
                    tags: tags,
                    category: category || 'Uncategorized',
                    src: e.target.result,
                    uploadDate: new Date().toISOString(),
                    views: 0,
                    type: uploadType
                };

                if (uploadType === 'video') {
                    // For videos, we'll create a thumbnail from the video
                    mediaData.duration = '0:00';
                    mediaData.thumbnail = e.target.result; // Will be updated when video loads
                    state.videos.unshift(mediaData);
                } else {
                    state.photos.unshift(mediaData);
                }

                saveData();
                
                if (index === selectedFiles.length - 1) {
                    uploadModal.classList.remove('active');
                    resetUploadForm();
                    navigateTo(uploadType === 'video' ? 'videos' : 'photos');
                }
            };

            reader.readAsDataURL(file);
        });
    });

    function resetUploadForm() {
        selectedFiles = [];
        fileInput.value = '';
        document.getElementById('uploadTitle').value = '';
        document.getElementById('uploadDescription').value = '';
        document.getElementById('uploadTags').value = '';
        document.getElementById('uploadCategory').value = '';
        uploadArea.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Drag and drop files here or click to browse</p>
            <input type="file" id="fileInput" multiple accept="video/*,image/*">
        `;
        // Re-attach event listener to new file input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
    }
}

// Settings
function initializeSettings() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const accentColor = document.getElementById('accentColor');
    const autoplayToggle = document.getElementById('autoplayToggle');
    const videoQuality = document.getElementById('videoQuality');
    const externalSearchToggle = document.getElementById('externalSearchToggle');
    const defaultSource = document.getElementById('defaultSource');
    const apiKey = document.getElementById('apiKey');
    const exportData = document.getElementById('exportData');
    const importData = document.getElementById('importData');
    const clearData = document.getElementById('clearData');

    darkModeToggle.addEventListener('change', (e) => {
        state.settings.darkMode = e.target.checked;
        applySettings();
        saveData();
    });

    accentColor.addEventListener('input', (e) => {
        state.settings.accentColor = e.target.value;
        applySettings();
        saveData();
    });

    autoplayToggle.addEventListener('change', (e) => {
        state.settings.autoplay = e.target.checked;
        saveData();
    });

    videoQuality.addEventListener('change', (e) => {
        state.settings.videoQuality = e.target.value;
        saveData();
    });

    externalSearchToggle.addEventListener('change', (e) => {
        state.settings.externalSearchEnabled = e.target.checked;
        saveData();
    });

    defaultSource.addEventListener('change', (e) => {
        state.settings.defaultSource = e.target.value;
        saveData();
    });

    apiKey.addEventListener('change', (e) => {
        state.settings.apiKey = e.target.value;
        saveData();
    });

    exportData.addEventListener('click', () => {
        const data = {
            videos: state.videos,
            photos: state.photos,
            favorites: state.favorites,
            recentlyViewed: state.recentlyViewed,
            watchProgress: state.watchProgress,
            settings: state.settings
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mediahub_backup.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    importData.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    state.videos = data.videos || [];
                    state.photos = data.photos || [];
                    state.favorites = data.favorites || [];
                    state.recentlyViewed = data.recentlyViewed || [];
                    state.watchProgress = data.watchProgress || {};
                    state.settings = { ...state.settings, ...data.settings };
                    saveData();
                    applySettings();
                    navigateTo(state.currentPage);
                    alert('Data imported successfully');
                } catch (error) {
                    alert('Error importing data: Invalid JSON file');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });

    clearData.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            localStorage.clear();
            state.videos = [];
            state.photos = [];
            state.favorites = [];
            state.recentlyViewed = [];
            state.watchProgress = {};
            saveData();
            navigateTo('home');
            alert('All data cleared');
        }
    });
}

// Render Functions
function renderHomePage() {
    renderFeaturedSection();
    renderRecentSection();
    renderContinueWatching();
    renderRecommendations();
}

function renderFeaturedSection() {
    const container = document.getElementById('featuredCarousel');
    const featuredMedia = [...state.videos, ...state.photos].slice(0, 4);
    
    if (featuredMedia.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-film"></i><h3>No media yet</h3><p>Upload some videos or photos to get started</p></div>';
        return;
    }

    container.innerHTML = featuredMedia.map(media => `
        <div class="featured-card" onclick="${media.type === 'video' ? `openVideoPlayer('${media.id}')` : `openPhotoLightbox('${media.id}')`}">
            ${media.type === 'video' 
                ? `<video src="${media.src}" muted></video>` 
                : `<img src="${media.src}" alt="${media.title}">`
            }
            <div class="featured-overlay">
                <div class="featured-title">${media.title}</div>
                <div class="featured-meta">${formatDate(media.uploadDate)}</div>
            </div>
        </div>
    `).join('');
}

function renderRecentSection() {
    const container = document.getElementById('recentGrid');
    const recentMedia = [...state.videos, ...state.photos].slice(0, 8);
    
    if (recentMedia.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><h3>No media yet</h3><p>Upload some videos or photos to get started</p></div>';
        return;
    }

    container.innerHTML = recentMedia.map(media => createMediaCard(media)).join('');
}

function renderContinueWatching() {
    const container = document.getElementById('continueWatching');
    const continueWatching = state.videos.filter(video => 
        state.watchProgress[video.id] && state.watchProgress[video.id] > 0
    ).slice(0, 4);

    if (continueWatching.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><h3>Continue watching</h3><p>Videos you\'ve started will appear here</p></div>';
        return;
    }

    container.innerHTML = continueWatching.map(video => createMediaCard(video)).join('');
}

function renderRecommendations() {
    const container = document.getElementById('recommendations');
    const recommendations = [...state.videos, ...state.photos]
        .sort(() => Math.random() - 0.5)
        .slice(0, 8);

    if (recommendations.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><h3>Recommendations</h3><p>Upload some media to get recommendations</p></div>';
        return;
    }

    container.innerHTML = recommendations.map(media => createMediaCard(media)).join('');
}

function renderVideosPage() {
    updateCategoryFilters('video');
    renderVideosGrid(state.videos);
}

function renderVideosGrid(videos) {
    const container = document.getElementById('videosGrid');
    
    if (videos.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-video"></i><h3>No videos yet</h3><p>Upload some videos to get started</p></div>';
        return;
    }

    container.innerHTML = videos.map(video => createMediaCard(video)).join('');
}

function renderPhotosPage() {
    updateCategoryFilters('photo');
    renderPhotosGrid(state.photos);
}

function renderPhotosGrid(photos) {
    const container = document.getElementById('photosGrid');
    
    if (photos.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-image"></i><h3>No photos yet</h3><p>Upload some photos to get started</p></div>';
        return;
    }

    container.innerHTML = photos.map(photo => createMediaCard(photo)).join('');
}

function renderFavoritesPage() {
    const container = document.getElementById('favoritesGrid');
    const favoriteMedia = [...state.videos, ...state.photos].filter(media => 
        state.favorites.includes(media.id)
    );

    if (favoriteMedia.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-heart"></i><h3>No favorites yet</h3><p>Add videos or photos to your favorites to see them here</p></div>';
        return;
    }

    container.innerHTML = favoriteMedia.map(media => createMediaCard(media)).join('');
}

function renderRecentPage() {
    const container = document.getElementById('recentPageGrid');
    const recentMedia = [...state.videos, ...state.photos]
        .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    if (recentMedia.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-clock"></i><h3>No media yet</h3><p>Upload some videos or photos to get started</p></div>';
        return;
    }

    container.innerHTML = recentMedia.map(media => createMediaCard(media)).join('');
}

function createMediaCard(media) {
    const isFavorite = state.favorites.includes(media.id);
    const thumbnail = media.type === 'video' 
        ? `<video src="${media.src}" muted></video>`
        : `<img src="${media.src}" alt="${media.title}">`;

    return `
        <div class="media-card" onclick="${media.type === 'video' ? `openVideoPlayer('${media.id}')` : `openPhotoLightbox('${media.id}')`}">
            <div class="media-thumbnail">
                ${thumbnail}
                ${media.type === 'video' ? `<span class="duration-overlay">${media.duration}</span>` : ''}
            </div>
            <div class="media-info">
                <div class="media-title">${media.title}</div>
                <div class="media-meta">
                    <span>${formatDate(media.uploadDate)}</span>
                    ${media.type === 'video' ? `<span>${media.views} views</span>` : ''}
                </div>
                <div class="media-tags">
                    ${media.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
}

function updateCategoryFilters(type) {
    const filterSelect = type === 'video' 
        ? document.getElementById('videoFilter')
        : document.getElementById('photoFilter');
    
    const media = type === 'video' ? state.videos : state.photos;
    const categories = [...new Set(media.map(m => m.category))];
    
    filterSelect.innerHTML = '<option value="all">All Categories</option>' +
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

    filterSelect.onchange = () => {
        const selectedCategory = filterSelect.value;
        const filteredMedia = selectedCategory === 'all' 
            ? media 
            : media.filter(m => m.category === selectedCategory);
        
        if (type === 'video') {
            renderVideosGrid(filteredMedia);
        } else {
            renderPhotosGrid(filteredMedia);
        }
    };
}

// Video Player
function openVideoPlayer(videoId) {
    const video = state.videos.find(v => v.id == videoId);
    if (!video) return;

    state.currentVideo = video;
    
    // Update view count
    video.views++;
    saveData();

    // Add to recently viewed
    addToRecentlyViewed(video.id, 'video');

    // Update UI
    document.getElementById('videoTitle').textContent = video.title;
    document.getElementById('videoViews').textContent = `${video.views} views`;
    document.getElementById('videoDate').textContent = formatDate(video.uploadDate);
    document.getElementById('videoDescription').textContent = video.description;
    document.getElementById('videoTags').innerHTML = video.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

    // Set video source
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.src = video.src;

    // Restore playback progress
    if (state.watchProgress[video.id]) {
        videoPlayer.currentTime = state.watchProgress[video.id];
    }

    // Update favorite button
    const favoriteBtn = document.getElementById('videoFavorite');
    favoriteBtn.classList.toggle('active', state.favorites.includes(video.id));
    favoriteBtn.onclick = () => toggleFavorite(video.id);

    // Save progress periodically
    videoPlayer.addEventListener('timeupdate', () => {
        state.watchProgress[video.id] = videoPlayer.currentTime;
        saveData();
    });

    // Auto-play next video if enabled
    videoPlayer.addEventListener('ended', () => {
        if (state.settings.autoplay) {
            playNextVideo();
        }
    });

    // Render related videos
    renderRelatedVideos(video);

    navigateTo('videoPlayer');
}

function renderRelatedVideos(currentVideo) {
    const container = document.getElementById('relatedVideos');
    const relatedVideos = state.videos
        .filter(v => v.id !== currentVideo.id)
        .slice(0, 10);

    container.innerHTML = relatedVideos.map(video => `
        <div class="related-card" onclick="openVideoPlayer('${video.id}')">
            <div class="related-thumbnail">
                <video src="${video.src}" muted></video>
            </div>
            <div class="related-info">
                <div class="related-title">${video.title}</div>
                <div class="related-meta">${video.views} views • ${formatDate(video.uploadDate)}</div>
            </div>
        </div>
    `).join('');
}

function playNextVideo() {
    const currentIndex = state.videos.findIndex(v => v.id === state.currentVideo.id);
    const nextVideo = state.videos[currentIndex + 1];
    
    if (nextVideo) {
        openVideoPlayer(nextVideo.id);
    }
}

// Photo Lightbox
function openPhotoLightbox(photoId) {
    const photo = state.photos.find(p => p.id == photoId);
    if (!photo) return;

    state.currentPhoto = photo;
    state.currentPhotoIndex = state.photos.findIndex(p => p.id == photoId);

    // Add to recently viewed
    addToRecentlyViewed(photo.id, 'photo');

    // Update UI
    document.getElementById('lightboxImage').src = photo.src;
    document.getElementById('lightboxTitle').textContent = photo.title;
    document.getElementById('lightboxDescription').textContent = photo.description;

    navigateTo('photoLightbox');
}

function initializeLightboxControls() {
    document.getElementById('lightboxClose').addEventListener('click', () => {
        stopSlideshow();
        navigateTo('photos');
    });

    document.getElementById('lightboxPrev').addEventListener('click', () => {
        navigatePhoto(-1);
    });

    document.getElementById('lightboxNext').addEventListener('click', () => {
        navigatePhoto(1);
    });

    document.getElementById('lightboxDownload').addEventListener('click', () => {
        downloadCurrentPhoto();
    });

    document.getElementById('lightboxSlideshow').addEventListener('click', () => {
        toggleSlideshow();
    });

    document.getElementById('lightboxZoom').addEventListener('click', () => {
        toggleZoom();
    });
}

function navigatePhoto(direction) {
    const newIndex = state.currentPhotoIndex + direction;
    
    if (newIndex >= 0 && newIndex < state.photos.length) {
        state.currentPhotoIndex = newIndex;
        state.currentPhoto = state.photos[newIndex];
        
        document.getElementById('lightboxImage').src = state.currentPhoto.src;
        document.getElementById('lightboxTitle').textContent = state.currentPhoto.title;
        document.getElementById('lightboxDescription').textContent = state.currentPhoto.description;
    }
}

function toggleSlideshow() {
    const btn = document.getElementById('lightboxSlideshow');
    
    if (state.slideshowInterval) {
        stopSlideshow();
    } else {
        btn.innerHTML = '<i class="fas fa-pause"></i>';
        state.slideshowInterval = setInterval(() => {
            navigatePhoto(1);
            if (state.currentPhotoIndex >= state.photos.length - 1) {
                state.currentPhotoIndex = -1;
            }
        }, 3000);
    }
}

function stopSlideshow() {
    if (state.slideshowInterval) {
        clearInterval(state.slideshowInterval);
        state.slideshowInterval = null;
        document.getElementById('lightboxSlideshow').innerHTML = '<i class="fas fa-play"></i>';
    }
}

function toggleZoom() {
    const img = document.getElementById('lightboxImage');
    img.style.transform = img.style.transform === 'scale(2)' ? 'scale(1)' : 'scale(2)';
}

function downloadCurrentPhoto() {
    const link = document.createElement('a');
    link.href = state.currentPhoto.src;
    link.download = state.currentPhoto.title;
    link.click();
}

// Favorites
function toggleFavorite(mediaId) {
    const index = state.favorites.indexOf(mediaId);
    
    if (index > -1) {
        state.favorites.splice(index, 1);
    } else {
        state.favorites.push(mediaId);
    }
    
    saveData();
    
    // Update UI if on favorites page
    if (state.currentPage === 'favorites') {
        renderFavoritesPage();
    }

    // Update favorite button if video player is open
    const favoriteBtn = document.getElementById('videoFavorite');
    if (favoriteBtn) {
        favoriteBtn.classList.toggle('active', state.favorites.includes(mediaId));
    }
}

// Recently Viewed
function addToRecentlyViewed(mediaId, type) {
    // Remove if already exists
    const index = state.recentlyViewed.findIndex(item => item.id === mediaId);
    if (index > -1) {
        state.recentlyViewed.splice(index, 1);
    }

    // Add to beginning
    state.recentlyViewed.unshift({
        id: mediaId,
        type: type,
        timestamp: new Date().toISOString()
    });

    // Keep only last 50
    if (state.recentlyViewed.length > 50) {
        state.recentlyViewed = state.recentlyViewed.slice(0, 50);
    }

    saveData();
}

// Sorting
document.getElementById('videoSort').addEventListener('change', (e) => {
    const sortBy = e.target.value;
    let sortedVideos = [...state.videos];

    switch (sortBy) {
        case 'newest':
            sortedVideos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
            break;
        case 'oldest':
            sortedVideos.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
            break;
        case 'mostViewed':
            sortedVideos.sort((a, b) => b.views - a.views);
            break;
        case 'alphabetical':
            sortedVideos.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }

    renderVideosGrid(sortedVideos);
});

// Photo View Toggle
document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const view = btn.dataset.view;
        const photosGrid = document.getElementById('photosGrid');
        
        if (view === 'masonry') {
            photosGrid.classList.add('masonry');
        } else {
            photosGrid.classList.remove('masonry');
        }
    });
});

// Theme Toggle
document.getElementById('themeToggle').addEventListener('click', () => {
    state.settings.darkMode = !state.settings.darkMode;
    document.getElementById('darkModeToggle').checked = state.settings.darkMode;
    applySettings();
    saveData();
});

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return date.toLocaleDateString();
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case 'Escape':
                if (state.currentPage === 'photoLightbox') {
                    stopSlideshow();
                    navigateTo('photos');
                }
                break;
            case 'ArrowLeft':
                if (state.currentPage === 'photoLightbox') {
                    navigatePhoto(-1);
                }
                break;
            case 'ArrowRight':
                if (state.currentPage === 'photoLightbox') {
                    navigatePhoto(1);
                }
                break;
            case ' ':
                if (state.currentPage === 'videoPlayer') {
                    e.preventDefault();
                    const video = document.getElementById('videoPlayer');
                    if (video.paused) {
                        video.play();
                    } else {
                        video.pause();
                    }
                }
                break;
            case 'f':
                if (state.currentPage === 'videoPlayer') {
                    const video = document.getElementById('videoPlayer');
                    if (video.requestFullscreen) {
                        video.requestFullscreen();
                    }
                }
                break;
        }
    });
}

// Initialize lightbox controls
initializeLightboxControls();

// Load sample data if empty (for demo purposes)
function loadSampleData() {
    if (state.videos.length === 0 && state.photos.length === 0) {
        // Add sample data here if needed
        console.log('No media found. Upload some videos or photos to get started.');
    }
}

loadSampleData();

// External Search
function initializeExternalSearch() {
    const searchBtn = document.getElementById('externalSearchBtn');
    const searchBar = document.getElementById('externalSearchBar');
    const sourceSelect = document.getElementById('sourceSelect');
    const ratingSelect = document.getElementById('ratingSelect');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');

    // Set default source from settings
    sourceSelect.value = state.settings.defaultSource;

    searchBtn.addEventListener('click', () => {
        performExternalSearch();
    });

    searchBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performExternalSearch();
        }
    });

    sourceSelect.addEventListener('change', () => {
        state.externalSearch.currentSource = sourceSelect.value;
        state.externalSearch.currentPage = 1;
        if (state.externalSearch.currentQuery) {
            performExternalSearch();
        }
    });

    ratingSelect.addEventListener('change', () => {
        state.externalSearch.currentPage = 1;
        if (state.externalSearch.currentQuery) {
            performExternalSearch();
        }
    });

    prevPageBtn.addEventListener('click', () => {
        if (state.externalSearch.currentPage > 1) {
            state.externalSearch.currentPage--;
            performExternalSearch();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        state.externalSearch.currentPage++;
        performExternalSearch();
    });
}

function renderExternalPage() {
    if (!state.settings.externalSearchEnabled) {
        document.getElementById('externalResults').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-lock"></i>
                <h3>External Search Disabled</h3>
                <p>Enable external search in Settings to use this feature</p>
            </div>
        `;
        return;
    }

    if (state.externalSearch.results.length === 0) {
        document.getElementById('externalResults').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-globe"></i>
                <h3>Search External Sources</h3>
                <p>Enter tags to search for media from external sources like e621.net</p>
            </div>
        `;
        return;
    }

    renderExternalResults();
}

async function performExternalSearch() {
    const query = document.getElementById('externalSearchBar').value.trim();
    const source = document.getElementById('sourceSelect').value;
    const rating = document.getElementById('ratingSelect').value;
    const highQuality = document.getElementById('highQuality').checked;

    if (!query) {
        alert('Please enter search tags');
        return;
    }

    state.externalSearch.currentQuery = query;
    state.externalSearch.currentSource = source;

    // Show loading state
    document.getElementById('externalResults').innerHTML = `
        <div class="loading-external">
            <div class="loading-spinner"></div>
        </div>
    `;

    try {
        let results = [];
        
        switch (source) {
            case 'e621':
                results = await searchE621(query, rating, highQuality);
                break;
            case 'danbooru':
                results = await searchDanbooru(query, rating, highQuality);
                break;
            case 'gelbooru':
                results = await searchGelbooru(query, rating, highQuality);
                break;
        }

        state.externalSearch.results = results;
        state.externalSearch.totalResults = results.length;
        
        renderExternalResults();
        updatePagination();

    } catch (error) {
        console.error('External search error:', error);
        document.getElementById('externalResults').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Search Error</h3>
                <p>${error.message || 'Failed to fetch results from external source'}</p>
            </div>
        `;
    }
}

async function searchE621(tags, rating, highQuality) {
    const page = state.externalSearch.currentPage;
    const limit = 20;
    
    // Build query with rating filter
    let queryTags = tags;
    if (rating !== 'all') {
        queryTags += ` rating:${rating}`;
    }
    if (highQuality) {
        queryTags += ' score:>100';
    }

    const url = `https://e621.net/posts.json?tags=${encodeURIComponent(queryTags)}&page=${page}&limit=${limit}`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'MediaHub/1.0 (Personal Media Platform)'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch from e621.net');
    }

    const data = await response.json();
    
    return data.posts.map(post => ({
        id: post.id,
        title: post.tags.artist?.[0] || 'Unknown Artist',
        description: post.tags.general?.slice(0, 5).join(', ') || '',
        tags: [...(post.tags.artist || []), ...(post.tags.general || [])],
        thumbnail: post.preview?.url || post.file?.url,
        fullSize: post.file?.url,
        source: 'e621',
        rating: post.rating,
        score: post.score,
        type: post.file?.ext?.includes('webm') || post.file?.ext?.includes('mp4') ? 'video' : 'photo'
    }));
}

async function searchDanbooru(tags, rating, highQuality) {
    const page = state.externalSearch.currentPage;
    const limit = 20;
    
    let queryTags = tags;
    if (rating !== 'all') {
        queryTags += ` rating:${rating}`;
    }
    if (highQuality) {
        queryTags += ' score:>100';
    }

    const url = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(queryTags)}&page=${page}&limit=${limit}`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'MediaHub/1.0 (Personal Media Platform)'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch from Danbooru');
    }

    const data = await response.json();
    
    return data.map(post => ({
        id: post.id,
        title: post.tag_string_artist?.split(' ')[0] || 'Unknown Artist',
        description: post.tag_string_general?.split(' ').slice(0, 5).join(', ') || '',
        tags: [...(post.tag_string_artist?.split(' ') || []), ...(post.tag_string_general?.split(' ') || [])],
        thumbnail: post.preview_file_url || post.large_file_url || post.file_url,
        fullSize: post.file_url,
        source: 'danbooru',
        rating: post.rating,
        score: post.score,
        type: post.file_ext === 'webm' || post.file_ext === 'mp4' ? 'video' : 'photo'
    }));
}

async function searchGelbooru(tags, rating, highQuality) {
    const page = state.externalSearch.currentPage;
    const limit = 20;
    
    let queryTags = tags;
    if (rating !== 'all') {
        queryTags += ` rating:${rating}`;
    }
    if (highQuality) {
        queryTags += ' score:>100';
    }

    const url = `https://gelbooru.com/index.php?page=dapi&s=post&q=index&tags=${encodeURIComponent(queryTags)}&pid=${page - 1}&limit=${limit}&json=1`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'MediaHub/1.0 (Personal Media Platform)'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch from Gelbooru');
    }

    const data = await response.json();
    
    if (!data.post) return [];
    
    const posts = Array.isArray(data.post) ? data.post : [data.post];
    
    return posts.map(post => ({
        id: post.id,
        title: post.tags?.split(' ').find(t => t.startsWith('artist:'))?.replace('artist:', '') || 'Unknown',
        description: post.tags?.split(' ').slice(0, 5).join(', ') || '',
        tags: post.tags?.split(' ') || [],
        thumbnail: post.preview_url || post.file_url,
        fullSize: post.file_url,
        source: 'gelbooru',
        rating: post.rating,
        score: parseInt(post.score) || 0,
        type: post.file_url?.includes('.webm') || post.file_url?.includes('.mp4') ? 'video' : 'photo'
    }));
}

function renderExternalResults() {
    const container = document.getElementById('externalResults');
    const results = state.externalSearch.results;

    if (results.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No Results Found</h3>
                <p>Try different tags or search terms</p>
            </div>
        `;
        return;
    }

    container.innerHTML = results.map(item => createExternalCard(item)).join('');
}

function createExternalCard(item) {
    const isImported = isMediaImported(item.id, item.source);
    const autoImport = document.getElementById('importAuto').checked;

    return `
        <div class="external-card ${isImported ? 'imported' : ''}" data-id="${item.id}" data-source="${item.source}">
            <div class="external-thumbnail">
                <img src="${item.thumbnail}" alt="${item.title}" loading="lazy">
                <span class="external-badge">${item.source}</span>
            </div>
            <div class="external-info">
                <div class="external-title">${item.title}</div>
                <div class="external-meta">
                    ${item.tags.slice(0, 3).map(tag => `<span class="external-tag">${tag}</span>`).join('')}
                </div>
                <div class="external-source">
                    Score: ${item.score} • Rating: ${item.rating}
                </div>
                <div class="external-actions">
                    <button class="external-btn ${isImported ? 'imported' : ''}" onclick="importExternalMedia('${item.id}', '${item.source}')">
                        ${isImported ? 'Imported' : 'Import'}
                    </button>
                    <button class="external-btn" onclick="previewExternalMedia('${item.fullSize}', '${item.type}')">
                        Preview
                    </button>
                </div>
            </div>
        </div>
    `;
}

function isMediaImported(id, source) {
    const allMedia = [...state.videos, ...state.photos];
    return allMedia.some(media => media.externalId == id && media.externalSource == source);
}

async function importExternalMedia(id, source) {
    const item = state.externalSearch.results.find(r => r.id == id && r.source == source);
    if (!item) return;

    if (isMediaImported(id, source)) {
        alert('This media has already been imported');
        return;
    }

    try {
        // Fetch the media
        const response = await fetch(item.fullSize);
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const mediaData = {
                id: Date.now(),
                externalId: item.id,
                externalSource: item.source,
                title: item.title,
                description: item.description,
                tags: item.tags,
                category: 'External',
                src: e.target.result,
                uploadDate: new Date().toISOString(),
                views: 0,
                type: item.type
            };

            if (item.type === 'video') {
                mediaData.duration = '0:00';
                state.videos.unshift(mediaData);
            } else {
                state.photos.unshift(mediaData);
            }

            saveData();
            
            // Update the card to show it's imported
            const card = document.querySelector(`.external-card[data-id="${id}"][data-source="${source}"]`);
            if (card) {
                card.classList.add('imported');
                const btn = card.querySelector('.external-btn:first-child');
                btn.textContent = 'Imported';
                btn.classList.add('imported');
            }

            alert('Media imported successfully!');
        };

        reader.readAsDataURL(blob);
    } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import media. Please try again.');
    }
}

function previewExternalMedia(url, type) {
    if (type === 'video') {
        window.open(url, '_blank');
    } else {
        // Create a simple preview modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90vw; max-height: 90vh;">
                <div class="modal-header">
                    <h2>Preview</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="display: flex; justify-content: center; align-items: center;">
                    <img src="${url}" style="max-width: 100%; max-height: 80vh; object-fit: contain;" alt="Preview">
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

function updatePagination() {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');

    prevBtn.disabled = state.externalSearch.currentPage <= 1;
    nextBtn.disabled = state.externalSearch.results.length < 20;
    pageInfo.textContent = `Page ${state.externalSearch.currentPage}`;
}
