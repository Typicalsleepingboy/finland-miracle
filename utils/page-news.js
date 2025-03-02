function showNotFoundMessage(container, message) {
    container.className = 'flex items-center justify-center min-h-[24rem]';
    container.innerHTML = `
      <div class="flex flex-col items-center">
        <img src="https://res.cloudinary.com/dlx2zm7ha/image/upload/v1737173118/z0erjecyq6twx7cmnaii.png" alt="Not Found" class="w-64 mb-4">
        <p class="text-gray-500 text-lg font-bold">${message}</p>
      </div>
    `;
}

function showNotFoundMessageInsideCard(container, message) {
    container.innerHTML = `
      <div class="bg-gray-700 text-white rounded-2xl p-4 mb-2 shadow-md">
        <div class="flex flex-col items-center justify-center py-8">
          <img src="https://res.cloudinary.com/dlx2zm7ha/image/upload/v1737173118/z0erjecyq6twx7cmnaii.png" alt="Not Found" class="w-32 mb-4">
          <p class="text-gray-400 text-center">${message}</p>
        </div>
      </div>
    `;
}


// list news

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function fetchPageNews() {
    const container = document.getElementById("page-news-container");

    if (!container) {
        console.error("Not found");
        return;
    }

    const skeletonCount = 16;
    container.innerHTML = "";
    for (let i = 0; i < skeletonCount; i++) {
        const skeletonCard = ` 
      <div class="block bg-gray-300 rounded-3xl shadow-md animate-pulse overflow-hidden">
        <div class="p-4">
          <div class="w-20 h-5 bg-gray-400 rounded-3xl mb-3"></div>
          <div class="h-6 bg-gray-400 rounded mb-2"></div>
          <div class="h-4 bg-gray-400 rounded w-3/4"></div>
        </div>
      </div>
      `;
        container.innerHTML += skeletonCard;
    }

    try {
        const response = await fetch(
            "https://48intensapi.my.id/api/news"
        );

        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();

        const News = data.berita.slice(0, 16);

        const colors = ["bg-blue-400", "bg-purple-400", "bg-green-400", "bg-red-400/50"];

        container.innerHTML = "";

        if (News.length === 0) {
            showNotFoundMessage(container, "News Not Found 😭");
            return;
        }

        News.forEach((news, index) => {
            const beritaId = news.berita_id || "";
            const badgeUrl = news.badge_url
                ? `https://res.cloudinary.com/haymzm4wp/image/upload/assets/jkt48${news.badge_url}`
                : "https://jkt48.com/images/logo.svg";
            const waktu = news.waktu || "Waktu tidak tersedia";
            const judul = news.judul || "Judul tidak tersedia";

            const colorClass = colors[index % colors.length];
            const detailUrl = `/news/${beritaId}`;
            const newsCard = `
        <a href="${detailUrl}" class="block ${colorClass} text-white rounded-3xl shadow-md hover:shadow-lg overflow-hidden transition-all duration-300"
          onclick="localStorage.setItem('newsColor', '${colorClass}')">
          <div class="p-4">
            <img src="${badgeUrl}" alt="Badge" class="w-14 h-5 mb-3 rounded-3xl">
            <h3 class="text-lg text-white font-bold mb-2">${judul}</h3>
            <span class="text-sm text-white-200">${waktu}</span>
          </div>
        </a>
        `;
            container.innerHTML += newsCard;
        });
    } catch (error) {
        console.error("Error fetching Page News:", error);
        showNotFoundMessage(container, "News Not Found 😭");
    }
}


//  detail news
async function fetchDetailNews() {
  try {
    const pathSegments = window.location.pathname.split('/');
    const beritaId = pathSegments[pathSegments.length - 1];
    const container = document.getElementById("news-detail-container");

    if (!beritaId) {
      console.error("Berita ID tidak ditemukan di URL.");
      showNotFoundMessage(container, "Detail News Not Found 😭");
      return;
    }

    try {
      const response = await fetch(`https://48intensapi.my.id/api/news/detail/${beritaId}`);
      if (!response.ok) throw new Error("Failed to fetch news details");

      const data = await response.json();
      const judul = data.judul || "Judul tidak tersedia";
      const tanggal = data.tanggal || "Tanggal tidak tersedia";

      let konten = data.konten || "Konten tidak tersedia";
      
      // Step 1: Handle HTML encoded entities (like \u003C becomes <)
      konten = konten.replace(/\\u003C/g, '<')
                     .replace(/\\u003E/g, '>')
                     .replace(/\\n/g, '\n')
                     .replace(/\\"/g, '"')
                     .replace(/\\'/g, "'")
                     .replace(/\\t/g, '\t');
      
      // Step 2: Clean up common HTML artifacts from Word/Office exports
      konten = konten.replace(/\<\!-- \[if \!supportLineBreakNewLine\]--\>\<br\> \<\!--\[endif\]--\>/g, '<br><br>')
                     .replace(/<span[^>]*>/g, '')
                     .replace(/<\/span>/g, '')
                     .replace(/<p>/g, '')
                     .replace(/<\/p>/g, '<br><br>')
                     .replace(/<html>|<\/html>|<head>|<\/head>|<body>|<\/body>/g, '');
      
      // Step 3: Remove duplicate content
      const removeDuplicateContent = (text) => {
        const paragraphs = text.split(/\n{2,}|(<br\s*\/?>\s*){2,}/i);
        const uniqueParagraphs = [];
        const seenParagraphs = new Set();
        
        for (const paragraph of paragraphs) {
          // Skip if paragraph is undefined or null
          if (!paragraph) continue;
          
          // Use a simple hash of the paragraph - first 50 chars should be enough for most duplicates
          const hash = paragraph.trim().substring(0, 50);
          if (!seenParagraphs.has(hash) && hash.length > 5) { 
            seenParagraphs.add(hash);
            uniqueParagraphs.push(paragraph);
          }
        }
        
        return uniqueParagraphs.join("<br><br>");
      };
      
      konten = removeDuplicateContent(konten);
      
      // Step 4: Process image URLs
      const processImageUrls = (text) => {
        const urlRegex = /(https?:\/\/[^\s<>"']+\.(jpg|jpeg|png|gif|webp))/gi;
        
        const allImageUrls = [];
        let match;
        while ((match = urlRegex.exec(text)) !== null) {
          const fullUrl = match[0];
          if (fullUrl.indexOf('https', 1) !== -1) {
            const urls = fullUrl.split(/(https:\/\/)/);
            for (let i = 0; i < urls.length; i++) {
              if (urls[i] === 'https://' && i + 1 < urls.length) {
                const completeUrl = 'https://' + urls[i + 1];
                if (completeUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                  allImageUrls.push(completeUrl);
                }
              }
            }
          } else if (fullUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            allImageUrls.push(fullUrl);
          }
        }
        
        let processedText = text;
        allImageUrls.forEach(url => {
          // Only replace if not already in an img tag
          if (!processedText.includes(`<img src="${url}"`)) {
            const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedUrl, 'g');
            processedText = processedText.replace(regex, `<img src="${url}" alt="News Image" class="max-w-full my-4 rounded-lg">`);
          }
        });
        
        return processedText;
      };
      
      konten = processImageUrls(konten);
      
      // Step 5: Preserve list formatting while handling line breaks
      // First make sure numbered lists are preserved
      konten = konten.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match) => {
        return match.replace(/<br><br>/g, '<br>');
      });
      
      // Process line breaks for remaining content
      konten = konten
        // Replace multiple consecutive <br> or linebreaks with a standard double break
        .replace(/(<br\s*\/?>\s*){2,}|\n{2,}/gi, '<br><br>')
        // Replace single newlines with <br>
        .replace(/\n/g, '<br>')
        // Ensure double line breaks are preserved
        .replace(/(<br><br>)\s*(<br>)+/g, '$1')
        .replace(/News Image/g, "")
        // Handle links but avoid image URLs
        .replace(/(https?:\/\/[^\s<>]+\.(?:com|id|net|org)[^\s<>]*)/g, (match) => {
          if (konten.includes(`<img src="${match}"`) || match.match(/\.(png|jpg|jpeg|gif|webp)(\b|$)/i)) {
            return match;
          }
          return `<a href="${match}" target="_blank" class="text-blue-400 underline">${match}</a>`;
        });
      
      // Ensure proper spacing for list items
      konten = konten.replace(/<\/li>/g, '</li><br>');

      const detailTemplate = `
        <div class="max-w-5xl mx-auto p-8 bg-gray-800 shadow-lg rounded-3xl">
          <h1 class="text-3xl font-bold mb-6 text-white">${judul}</h1>
          <p class="text-white text-base mb-6">${tanggal}</p>
          <div class="text-white leading-relaxed text-sm font-semibold">${konten}</div>
        </div>
      `;

      container.innerHTML = detailTemplate;
      
      // Apply consistent text styling
      const kontenElement = container.querySelector('.text-white.leading-relaxed');
      if (kontenElement) {
        // Make sure all text content is white except for links
        kontenElement.querySelectorAll('*:not(a)').forEach(el => {
          el.style.color = 'white';
        });
        
        // Add proper spacing to list elements
        kontenElement.querySelectorAll('ol, ul').forEach(list => {
          list.style.marginTop = '1rem';
          list.style.marginBottom = '1rem';
          list.style.paddingLeft = '2rem';
        });
        
        kontenElement.querySelectorAll('li').forEach(item => {
          item.style.marginBottom = '0.5rem';
        });
        
        // Style strong/bold text
        kontenElement.querySelectorAll('strong').forEach(strong => {
          strong.style.fontWeight = 'bold';
        });
      }
    } catch (error) {
      console.error("Error parsing detail news:", error);
      showNotFoundMessage(container, "Detail News Not Found 😭");
    }
  } catch (error) {
    console.error("Error fetching Detail News:", error);
    showNotFoundMessage(container, "Gagal memuat detail berita. Silakan coba lagi nanti.");
  }
}

function showNotFoundMessage(container, message) {
  container.innerHTML = `
    <div class="max-w-5xl mx-auto p-8 bg-gray-800 shadow-lg rounded-3xl">
      <h1 class="text-3xl font-bold mb-6 text-white">${message}</h1>
    </div>
  `;
}
// news sidebar

async function fetchNewsSidebar() {
    const container = document.getElementById("news-list-sidebar");
    if (!container) return;

    container.innerHTML = `<p class="text-white text-lg font-bold mb-4">Latest News</p>`;

    try {
        const response = await fetch("https://48intensapi.my.id/api/news");
        if (!response.ok) throw new Error("Failed to fetch news");

        const data = await response.json();
        const News = data.berita.slice(0, 5);

        if (News.length === 0) {
            showNotFoundMessageInsideCard(container, "No news available.");
            return;
        }

        container.innerHTML += News.map(news => `
        <a href="/news/${news.berita_id}" class="block bg-gray-700 hover:bg-gray-600 text-white rounded-2xl p-4 mb-2 shadow-md transition-all">
          <div class="flex items-center gap-3">
            <img src="https://res.cloudinary.com/haymzm4wp/image/upload/assets/jkt48${news.badge_url || ''}" class="w-14 h-5 mb-3 rounded-3xl">
            <div>
              <h3 class="text-sm font-bold">${news.judul}</h3>
              <span class="text-xs text-gray-300">${news.waktu}</span>
            </div>
          </div>
        </a>
      `).join("");
    } catch (error) {
        console.error("Error fetching News Sidebar:", error);
        showNotFoundMessageInsideCard(container, "Failed to load news.");
    }
}

//  schedule sidebar
async function fetchScheduleSidebar() {
    const container = document.getElementById("schedule-sidebar");
    if (!container) return;

    container.innerHTML = `<p class="text-white text-lg font-bold mb-4">Upcoming Schedule</p>`;

    try {
        const [scheduleResponse, theaterResponse] = await Promise.all([
            fetch("https://48intensapi.my.id/api/schedule/section"),
            fetch("/data/theater.json")
        ]);

        if (!scheduleResponse.ok || !theaterResponse.ok) throw new Error("Failed to fetch data");

        const schedules = await scheduleResponse.json();
        const theaterData = await theaterResponse.json();
        const limitedSchedules = schedules.slice(0, 3);

        if (limitedSchedules.length === 0) {
            showNotFoundMessageInsideCard(container, "No upcoming events.");
            return;
        }

        container.innerHTML += limitedSchedules.map(({ tanggal, hari, bulan, events }) =>
            events.map(event => {
                const matchingTheater = theaterData.find(theater => theater.setlist === event.eventName);
                const badgeUrl = matchingTheater
                    ? matchingTheater.image
                    : "https://jkt48.com/images/logo.svg";

                return `
            <a href="/home" class="block bg-gray-700 hover:bg-gray-600 text-white rounded-2xl p-4 mb-2 shadow-md transition-all">
              <div class="flex items-center gap-3">
                <img src="${badgeUrl}" alt="${event.eventName}" class="w-10 h-10 rounded-lg object-cover">
                <div>
                  <h3 class="text-sm font-bold">${event.eventName}</h3>
                  <span class="text-xs text-gray-300">${hari}, ${tanggal} ${bulan}</span>
                </div>
              </div>
            </a>
          `;
            }).join("")
        ).join("");
    } catch (error) {
        console.error("Error fetching Schedule Sidebar:", error);
        showNotFoundMessageInsideCard(container, "Failed to load schedule.");
    }
}


fetchNewsSidebar();
fetchScheduleSidebar();
fetchPageNews();
fetchDetailNews();
