async function fetchMembers() {
  try {
    const response = await fetch(
      "https://intensprotectionexenew.vercel.app/api/member"
    );
    const data = await response.json();
    const members = data.members.member;
    members.sort((a, b) => a.nama_member.localeCompare(b.nama_member));

    const container = document.getElementById("page-member-container");
    container.innerHTML = "";

    container.className =
      "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-4";

    if (!members || members.length === 0) {
      showNotFoundMessage(container, "Member tidak ditemukan 😭");
      return;
    }

    const renderMembers = (filteredMembers) => {
      container.innerHTML = "";
      container.className =
        "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-4";

      if (filteredMembers.length === 0) {
        container.innerHTML = `
          <div class="col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-9 flex justify-center items-center">
            <div class="flex flex-col items-center">
              <img src="https://res.cloudinary.com/dlx2zm7ha/image/upload/v1733508715/allactkiuu9tmtrqfumi.png" alt="Not Found" class="w-32 h-32 mb-4">
              <p class="text-gray-500 text-lg font-bold">Member tidak ditemukan 😭</p>
            </div>
          </div>
        `;
        return;
      }

      filteredMembers.forEach((member) => {
        const memberId = member.id_member;
        const detailUrl = `/member/${memberId}`;
        const isMainMember = member.kategori === "Anggota JKT48";

        const cardBg = isMainMember ? "bg-rose-200 hover:bg-rose-100" : "bg-blue-100 hover:bg-blue-200";
        const badgeColor = isMainMember ? "bg-rose-400" : "bg-blue-500";

        const card = document.createElement("a");
        card.href = detailUrl;
        card.className = `${cardBg} shadow-md rounded-3xl flex flex-col items-center p-4 cursor-pointer relative`;

        const badge = document.createElement("span");
        badge.className = `${badgeColor} text-white text-xs px-2 py-1 rounded absolute top-2 right-2`;
        badge.innerText = member.kategori;
        card.appendChild(badge);

        const imageContainer = document.createElement("div");
        imageContainer.className = "w-full h-40 mb-4 overflow-hidden rounded-3xl";
        const img = document.createElement("img");
        img.src = `https://jkt48.com${member.ava_member}`;
        img.alt = member.nama_member;
        img.className = "w-full h-full object-cover";
        imageContainer.appendChild(img);
        card.appendChild(imageContainer);

        const name = document.createElement("div");
        name.className = "text-center text-2x1 font-semibold leading-tight break-words";
        name.innerText = member.nama_member;
        card.appendChild(name);

        container.appendChild(card);
      });
    };

    renderMembers(members);

    const searchInput = document.getElementById("search-member");
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      const filteredMembers = members.filter((member) =>
        member.nama_member.toLowerCase().includes(query) ||
        member.nickname?.toLowerCase().includes(query)
      );
      renderMembers(filteredMembers);
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    const container = document.getElementById("page-member-container");
    showNotFoundMessage(container, "Gagal memuat data member. Silakan coba lagi nanti.");
  }
}

function showNotFoundMessage(container, message) {
  container.className =
    "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-4";
  container.innerHTML = `
    <div class="col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-9 flex justify-center items-center">
      <div class="flex flex-col items-center">
        <img src="https://res.cloudinary.com/dlx2zm7ha/image/upload/v1733508715/allactkiuu9tmtrqfumi.png" alt="Not Found" class="w-32 h-32 mb-4">
        <p class="text-gray-500 text-lg font-bold">${message}</p>
      </div>
    </div>
  `;
}

fetchMembers();
