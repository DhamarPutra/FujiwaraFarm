document.addEventListener("DOMContentLoaded", () => {
  checkRegistration();
  requestNotificationPermission();
  loadPlants();
  checkNotifications();
  setInterval(checkNotifications, 30000);
});

// 🔹 Meminta izin notifikasi browser
function requestNotificationPermission() {
  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js")
    .then((reg) => console.log("Service Worker Registered", reg))
    .catch((err) => console.error("Service Worker Error", err));
}

// 🔹 Cek apakah pengguna sudah register
function checkRegistration() {
  const user = localStorage.getItem("fujiwara_user");
  if (user) {
    document.getElementById("register-page").classList.add("hidden");
    document.getElementById("home-page").classList.remove("hidden");
  }
}

// 🔹 Daftar pengguna (hanya 1x)
function registerUser() {
  const username = document.getElementById("username").value;
  if (username.trim() !== "") {
    localStorage.setItem("fujiwara_user", username);
    checkRegistration();
  }
}

// 🔹 Tambah tanaman baru ke local storage
function addPlant() {
  const name = document.getElementById("plant-name").value;
  const capitalizedName =
    name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const date = document.getElementById("plant-date").value;

  if (!name || !date) return alert("Isi semua kolom!");

  const plants = JSON.parse(localStorage.getItem("fujiwara_plants") || "[]");
  plants.push({
    name: capitalizedName,
    date,
    watered: false,
    pesticide: false,
    fertilizer: false,
  });
  localStorage.setItem("fujiwara_plants", JSON.stringify(plants));

  document.getElementById("plant-name").value = "";
  document.getElementById("plant-date").value = "";

  loadPlants();
}

// 🔹 Load daftar tanaman
function loadPlants() {
  const plants = JSON.parse(localStorage.getItem("fujiwara_plants") || "[]");
  const plantList = document.getElementById("plant-list");
  plantList.innerHTML = "";

  plants.forEach((plant) => {
    const plantCard = `
        <div class="text-black bg-white p-4 rounded shadow-md">
          <h3 class="font-bold">${plant.name}</h3>
          <p>Tanggal Semai: ${plant.date}</p>
          <p>💧 Disiram: ${plant.watered ? "✅" : "❌"}</p>
          <p>🐜 Pestisida: ${plant.pesticide ? "✅" : "❌"}</p>
          <p>🌱 Pupuk: ${plant.fertilizer ? "✅" : "❌"}</p>
        </div>
      `;
    plantList.innerHTML += plantCard;
  });
}

// 🔹 Cek dan buat notifikasi otomatis per tanaman
function checkNotifications() {
  const plants = JSON.parse(localStorage.getItem("fujiwara_plants") || "[]");
  let notifications = JSON.parse(
    localStorage.getItem("fujiwara_notifications") || "[]"
  );
  const today = new Date().toISOString().split("T")[0];

  plants.forEach((plant, index) => {
    const plantDate = new Date(plant.date);
    const daysOld = Math.floor(
      (new Date() - plantDate) / (1000 * 60 * 60 * 24)
    );

    if (daysOld >= 14 && daysOld <= 21) {
      scheduleNotification(
        `Pindahkan Bibit - ${plant.name}`,
        `Sudah ${daysOld} hari sejak semai.`,
        index,
        "move",
        null
      );
    }

    if (
      !localStorage.getItem(`fujiwara_done_watering_${plant.name}_${today}`)
    ) {
      scheduleNotification(
        `Waktunya Menyiram - ${plant.name}`,
        "Jangan lupa menyiram tanaman!",
        index,
        "water",
        1
      );
    }

    if (daysOld >= 14 && daysOld % 7 === 0) {
      scheduleNotification(
        `Beri Pestisida Nabati - ${plant.name}`,
        "Saatnya memberi pestisida.",
        index,
        "pesticide",
        7
      );
    }

    if (daysOld >= 14 && (daysOld % 7 === 0 || daysOld % 10 === 0)) {
      scheduleNotification(
        `Beri Pupuk NPK 16 - ${plant.name}`,
        "Jangan lupa beri pupuk.",
        index,
        "fertilizer",
        daysOld % 10 === 0 ? 10 : 7
      );
    }
  });

  loadNotifications();
}

// 🔹 Menjadwalkan notifikasi baru per tanaman jika belum ada
function scheduleNotification(title, message, plantIndex, action, repeatDays) {
  let notifications = JSON.parse(
    localStorage.getItem("fujiwara_notifications") || "[]"
  );

  const exists = notifications.some(
    (n) => n.title === title && n.plantIndex === plantIndex
  );
  if (!exists) {
    notifications.unshift({
      title,
      message,
      date: new Date().toLocaleString(),
      plantIndex,
      action,
      repeatDays,
      done: false,
    });
    localStorage.setItem(
      "fujiwara_notifications",
      JSON.stringify(notifications)
    );
  }
}

// 🔹 Load daftar notifikasi
function loadNotifications() {
  const notifications = JSON.parse(
    localStorage.getItem("fujiwara_notifications") || "[]"
  );
  const notificationList = document.getElementById("notification-list");
  notificationList.innerHTML = "";

  notifications.forEach((notif, index) => {
    const today = new Date().toISOString().split("T")[0];
    const isDoneToday =
      localStorage.getItem(
        `fujiwara_done_${notif.action}_${notif.title}_${today}`
      ) === "true";

    notificationList.innerHTML += `
        <div class="text-black bg-yellow-100 p-4 rounded shadow-md mb-2">
          <h3 class="font-bold">${notif.title}</h3>
          <p>${notif.message}</p>
          <p class="text-sm">${notif.date}</p>
          <button 
            onclick="completeNotification(${index})" 
            class="mt-2 ${
              isDoneToday ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500"
            } text-white p-2 rounded"
            ${isDoneToday ? "disabled" : ""}
          >
            Selesai
          </button>
        </div>
      `;
  });
}

// 🔹 Hapus notifikasi & update status tanaman
function completeNotification(index) {
  let notifications = JSON.parse(
    localStorage.getItem("fujiwara_notifications") || "[]"
  );
  let plants = JSON.parse(localStorage.getItem("fujiwara_plants") || "[]");

  const notif = notifications[index];
  if (notif) {
    const plantIndex = notif.plantIndex;
    const today = new Date().toISOString().split("T")[0];

    if (plants[plantIndex]) {
      if (notif.action === "water") plants[plantIndex].watered = true;
      if (notif.action === "pesticide") plants[plantIndex].pesticide = true;
      if (notif.action === "fertilizer") plants[plantIndex].fertilizer = true;
    }

    localStorage.setItem(
      `fujiwara_done_${notif.action}_${notif.title}_${today}`,
      "true"
    );

    if (notif.repeatDays) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + notif.repeatDays);
      localStorage.setItem(
        `fujiwara_next_${notif.action}_${notif.title}`,
        nextDate
      );
    }
  }

  notifications.splice(index, 1);
  localStorage.setItem("fujiwara_notifications", JSON.stringify(notifications));
  localStorage.setItem("fujiwara_plants", JSON.stringify(plants));

  loadPlants();
  loadNotifications();
}
