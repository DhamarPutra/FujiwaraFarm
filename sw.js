self.addEventListener("push", function (event) {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: "🌱", // Ganti dengan ikon aplikasi Anda
    });
  });
  