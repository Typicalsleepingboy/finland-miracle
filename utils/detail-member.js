function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

async function fetchDetailMember() {
  const container = document.getElementById("member-detail-container");

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');

    if (!memberId) {
      container.innerHTML =
        `<div class="flex items-center justify-center h-96">
          <div class="text-center text-gray-500">
            <h2 class="text-2xl font-bold">Member tidak ditemukan</h2>
          </div>
        </div>`;
      return;
    }
    container.innerHTML =
    container.innerHTML = `
    <div class="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-6">
      <div class="w-full md:w-2/3">
        <div class="border-2 border-gray-200 bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
          <div class="w-full h-35 sm:h-30 bg-gray-300"></div>
          
          <div class="flex flex-col sm:flex-row">
            <div class="w-full sm:w-1/3 p-6">
              <div class="bg-gray-300 w-full h-[400px] rounded-3xl"></div>
            </div>
            <div class="w-full sm:w-2/3 p-6">
              <div class="flex items-center justify-between mb-6">
                <div class="space-y-3">
                  <div class="h-8 bg-gray-300 rounded w-1/2"></div>
                  <div class="h-4 bg-gray-300 rounded w-1/3"></div>
                </div>
                <div class="flex space-x-3">
                  <div class="h-6 w-6 bg-gray-300 rounded-full"></div>
                  <div class="h-6 w-6 bg-gray-300 rounded-full"></div>
                  <div class="h-6 w-6 bg-gray-300 rounded-full"></div>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div class="space-y-4">
                  <div class="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div class="h-4 bg-gray-300 rounded w-2/3"></div>
                  <div class="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div class="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div class="h-32 bg-gray-300 rounded-3xl"></div>
              </div>
            </div>
          </div>
  
          <div class="px-6 pb-6">
            <div class="grid grid-cols-2 gap-4">
              <div class="h-24 bg-gray-300 rounded-3xl"></div>
              <div class="h-24 bg-gray-300 rounded-3xl"></div>
            </div>
          </div>
  
          <div class="p-6 border-t border-gray-200">
            <div class="flex items-center gap-2 mb-4">
              <div class="h-6 w-6 bg-gray-300 rounded"></div>
              <div class="h-8 bg-gray-300 rounded w-1/4"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              ${Array(3).fill().map(() => `
                <div class="bg-gray-50 rounded-xl p-4">
                  <div class="flex items-center space-x-3 mb-3">
                    <div class="w-10 h-10 bg-gray-300 rounded-full"></div>
                    <div class="space-y-2">
                      <div class="h-4 bg-gray-300 rounded w-24"></div>
                      <div class="h-3 bg-gray-300 rounded w-20"></div>
                    </div>
                  </div>
                  <div class="h-16 bg-gray-300 rounded"></div>
                </div>
              `).join('')}
            </div>
          </div>
  
          <div class="mt-8 px-6 pb-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="h-6 w-6 bg-gray-300 rounded"></div>
              <div class="h-8 bg-gray-300 rounded w-1/4"></div>
            </div>
            <div class="bg-gray-300 w-full aspect-video rounded-3xl"></div>
          </div>
        </div>
      </div>
  
      <div id="ranking-container" class="w-full md:w-1/3">
        <div class="border-2 border-gray-200 bg-white rounded-xl shadow-lg p-6 animate-pulse">
          <div class="flex items-center justify-center gap-2 mb-4">
            <div class="h-6 w-6 bg-gray-300 rounded"></div>
            <div class="h-8 bg-gray-300 rounded w-1/4"></div>
          </div>
          <div class="space-y-4">
            ${Array(15).fill().map(() => `
              <div class="flex items-center bg-gray-100 rounded-lg p-3">
                <div class="h-4 w-8 bg-gray-300 rounded mr-4"></div>
                <div class="h-10 w-10 bg-gray-300 rounded-full mr-4"></div>
                <div class="flex-grow space-y-2">
                  <div class="h-4 bg-gray-300 rounded w-2/3"></div>
                  <div class="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>`;
    const response = await fetch(`https://48intensapi.my.id/api/member/${memberId}`);
    if (!response.ok) {
      showNotFoundMessage(container, "Member tidak ditemukan");
      return;
    }
    const memberData = await response.json();
    const memberJsonResponse = await fetch("/data/member.json");
    const memberJsonData = await memberJsonResponse.json();
    const jikoMember = memberJsonData.find(member => member.name === memberData.name);

    document.title = `${memberData.name} - 48intens`;

    const removeMetaTags = () => {
      const metaSelectors = [
        'meta[name="description"]',
        'meta[property="og:title"]',
        'meta[property="og:description"]',
        'meta[property="og:image"]',
        'meta[property="og:url"]',
        'meta[name="twitter:title"]',
        'meta[name="twitter:description"]',
        'meta[name="twitter:image"]'
      ].join(',');
      document.querySelectorAll(metaSelectors).forEach(tag => tag.remove());
    };

    removeMetaTags();
    const headElement = document.head || document.getElementsByTagName('head')[0];

    const metaTags = [
      { property: 'og:title', content: `${memberData.name} - 48intens` },
      { property: 'og:description', content: jikoMember?.jikosokai || `${memberData.name} 48intens` },
      { property: 'og:image', content: memberData.profileImage },
      { property: 'og:url', content: window.location.href },
      { name: 'twitter:title', content: `${memberData.name} - 48intens` },
      { name: 'twitter:description', content: jikoMember?.jikosokai || `${memberData.name} 48intens` },
      { name: 'twitter:image', content: memberData.profileImage },
      { name: 'description', content: jikoMember?.jikosokai || `${memberData.name} 48intens` }
    ];

    metaTags.forEach(tag => {
      const meta = document.createElement('meta');
      if (tag.property) meta.setAttribute('property', tag.property);
      if (tag.name) meta.setAttribute('name', tag.name);
      meta.setAttribute('content', tag.content);
      headElement.appendChild(meta);
    });

    const generateSocialMediaIcons = (socialMedia) => {
      if (!socialMedia) return '';

      const platforms = [
        { name: 'twitter', icon: 'fa-brands fa-x-twitter', color: '#1DA1F2' },
        { name: 'instagram', icon: 'fa-brands fa-instagram', color: '#E4405F' },
        { name: 'tiktok', icon: 'fa-brands fa-tiktok', color: '#000000' }
      ];

      return platforms
        .filter(platform => socialMedia[platform.name])
        .map(platform => `
          <a href="${socialMedia[platform.name]}" target="_blank" rel="noopener noreferrer" class="text-gray-600 hover:text-[${platform.color}] transition-colors duration-300 mr-4">
            <i class="${platform.icon} w-6 h-6"></i>
          </a>
        `).join('');
    };

    const memberDetailsContainer = container.querySelector('[class*="md:w-2/3"]');
    memberDetailsContainer.innerHTML = `
  <div class="border-2 border-gray-200 bg-white rounded-xl shadow-lg overflow-hidden">
    <div class="w-full h-35 sm:h-30">
      <img src="https://res.cloudinary.com/dlx2zm7ha/image/upload/v1737654318/banner_i51agc.jpg" alt="Banner" 
          class="w-full h-full rounded-b-3xl object-cover" loading="lazy">
    </div>
    
    <div class="flex flex-col sm:flex-row">
      <div class="w-full sm:w-1/3 p-6">
        <img src="${memberData.profileImage}" alt="${memberData.name}" 
            class="w-full h-[400px] sm:h-auto rounded-3xl shadow-md object-cover" loading="lazy">
      </div>

      <div class="w-full sm:w-2/3 p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">${memberData.name}</h1>
            <p class="font-semibold text-blue-300 mt-2 text-base">${jikoMember ? jikoMember.nicknames : 'Tidak tersedia'}</p>
          </div>
          ${memberData.socialMedia ? `
            <div class="flex items-center">
              ${generateSocialMediaIcons(memberData.socialMedia)}
            </div>
          ` : ''}
        </div>

        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div class="space-y-4">
            <p class="text-gray-700 text-base"><span class="font-semibold">Tanggal Lahir:</span> ${memberData.birthdate || 'Tidak tersedia'}</p>
            <p class="text-gray-700 text-base"><span class="font-semibold">Golongan Darah:</span> ${memberData.bloodType || 'Tidak tersedia'}</p>
            <p class="text-gray-700 text-base"><span class="font-semibold">Zodiak:</span> ${memberData.zodiac || 'Tidak tersedia'}</p>
            <p class="text-gray-700 text-base"><span class="font-semibold">Tinggi:</span> ${memberData.height || 'Tidak tersedia'}</p>
          </div>
          <div class="bg-blue-200/30 p-4 rounded-3xl">
            <p class="text-gray-700 italic text-base">${jikoMember ? jikoMember.jikosokai : 'Tidak tersedia'}</p>
          </div>
        </div>
      </div>
    </div>

    ${memberData.followerCount || memberData.roomLevel ? `
    <div class="px-6 pb-6">
      <div class="grid grid-cols-2 gap-4">
        ${memberData.followerCount ? `
        <div class="bg-rose-100/50 p-4 rounded-3xl">
          <div class="flex items-center gap-2 mb-2">
            <i class="fas fa-users text-rose-400"></i>
            <span class="font-semibold text-gray-700">Followers</span>
          </div>
          <p class="text-2xl font-bold text-gray-900">${memberData.followerCount.toLocaleString()}</p>
        </div>
        ` : ''}
        
        ${memberData.roomLevel ? `
        <div class="bg-blue-100/50 p-4 rounded-3xl">
          <div class="flex items-center gap-2 mb-2">
            <i class="fas fa-star text-blue-400"></i>
            <span class="font-semibold text-gray-700">Room Level</span>
          </div>
          <p class="text-2xl font-bold text-gray-900">${memberData.roomLevel}</p>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    ${memberData.recommendComments ? `
      <div class="p-6 border-t border-gray-200">
        <div class="flex items-center gap-2 mb-4">
          <i class="fas fa-envelope text-rose-300"></i>
          <h2 class="text-2xl font-bold">Fan Letters</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          ${memberData.recommendComments.map(comment => `
            <div class="bg-gray-50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div class="flex items-center space-x-3 mb-3">
                <img src="${comment.user.image}" alt="${comment.user.name}" 
                      class="w-10 h-10 rounded-full object-cover">
                <div>
                  <p class="font-medium text-gray-900">${comment.user.name}</p>
                  <p class="text-sm text-gray-500">${new Date(comment.created_at * 1000).toLocaleDateString()}</p>
                </div>
              </div>
              <p class="text-gray-600">${comment.comment}</p>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    ${jikoMember?.video_perkenalan ?
        `<div class="mt-8 px-6 pb-6">
      <div class="flex items-center gap-2 mb-4">
        <i class="fas fa-video text-rose-300"></i>
        <h2 class="text-2xl font-bold">Introduction Video</h2>
      </div>
      <iframe class="w-full aspect-video rounded-3xl shadow-lg"
        src="https://www.youtube.com/embed/${jikoMember.video_perkenalan}" 
        title="Introduction Video" frameborder="0" allowfullscreen>
      </iframe>
    </div>` : ''}
  </div>`;

    const rankingContainer = container.querySelector('#ranking-container');
    const summaryRanking = memberData.summaryRanking || [];

    rankingContainer.innerHTML =
      `<div class="border-2 border-gray-200 bg-white rounded-xl shadow-lg p-6">
    <div class="flex items-center justify-center gap-2 mb-4">
      <i class="fas fa-trophy text-yellow-400"></i>
      <h2 class="text-2xl font-bold text-center">Visit Showroom Ranking</h2>
    </div>
    <div class="space-y-4">
      ${summaryRanking.length > 0 ? summaryRanking.slice(0, 15).map((ranking, index) => `
        <div class="flex items-center bg-gray-100 rounded-lg p-3 ${ranking.name === memberData.name ? 'border-2 border-blue-500' : ''}">
          <div class="flex items-center justify-center mr-4 w-8">
            ${ranking.rank <= 3 ?
          `<i class="fas fa-crown text-lg ${ranking.rank === 1 ? 'text-yellow-400' :
            ranking.rank === 2 ? 'text-gray-400' : 'text-yellow-600'
          }"></i>` :
          `<span class="font-bold text-center">${ranking.rank}</span>`
        }
          </div>
          <img src="${ranking.avatar_url}" alt="${ranking.name}" class="w-10 h-10 rounded-full mr-4">
          <div class="flex-grow">
            <p class="font-semibold">${ranking.name}</p>
            <p class="text-sm text-gray-500">${ranking.point} pts | ${ranking.visit_count} visits</p>
          </div>
        </div>
      `).join('') : `<p class="text-center text-gray-500">No ranking data available 😭</p>`}
    </div>
  </div>`;

  } catch (error) {
    console.error("Error fetching member details:", error);
    showNotFoundMessage(container, "Gagal memuat detail member");
  }
}

function showNotFoundMessage(container, message) {
  container.className = 'flex items-center justify-center min-h-[24rem]';

  container.innerHTML = `
    <div class="flex flex-col items-center">
      <img src="https://res.cloudinary.com/dlx2zm7ha/image/upload/v1737173118/z0erjecyq6twx7cmnaii.png" alt="Not Found" class="w-64 h-64 mb-4 loading="lazy"">
      <p class="text-gray-500 text-lg font-bold">${message}</p>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', fetchDetailMember);