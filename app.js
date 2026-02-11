document.addEventListener("DOMContentLoaded", function(){

  const WORKER_URL = "https://layasync-proxy.layasync.workers.dev";

  const status = document.getElementById("xtream-status");
  const xtreamPopup = document.getElementById("xtream-popup");
  const xtreamClose = document.getElementById("xtream-close");
  const xtreamConnect = document.getElementById("xtream-connect");

  const navItems = document.querySelectorAll(".nav");

  const pages = {
    Home: "home",
    Search: "search",
    Movies: "movies",
    Shows: "shows",
    Playlists: "playlists",
    Collections: "collections",
    Live: "live"
  };

  /* ================= NAVIGATION ================= */

  function showPage(name){

    document.querySelectorAll(".page").forEach(p=>{
      p.style.display = "none";
    });

    if(pages[name]){
      const target = document.getElementById(pages[name]);
      if(target) target.style.display = "block";
    }

    navItems.forEach(n=>n.classList.remove("active"));

    const activeNav = [...navItems].find(n=>n.textContent.trim()===name);
    if(activeNav) activeNav.classList.add("active");
  }

  navItems.forEach(item=>{
    item.addEventListener("click", function(){
      const page = this.textContent.trim();
      showPage(page);

      if(page === "Movies") renderMovies();
      if(page === "Shows") renderShows();
    });
  });

  /* ================= POPUP OPEN (SAFE DELEGATION) ================= */

  document.addEventListener("click", function(e){

    const btn = e.target.closest(".xtream-btn");

    if(btn){
      if(xtreamPopup){
        xtreamPopup.style.display = "flex";
      }
    }

  });

  /* ================= POPUP CLOSE ================= */

  if(xtreamClose){
    xtreamClose.addEventListener("click", function(){
      if(xtreamPopup){
        xtreamPopup.style.display = "none";
      }
    });
  }

  /* ================= CONNECT ================= */

  if(xtreamConnect){

    xtreamConnect.addEventListener("click", async function(){

      const server = document.getElementById("xtream-server").value.trim();
      const username = document.getElementById("xtream-username").value.trim();
      const password = document.getElementById("xtream-password").value.trim();

      if(!server || !username || !password){
        alert("Fill all fields");
        return;
      }

      try {

        localStorage.removeItem("xtream");
        localStorage.removeItem("xtream_cache");

        const cleanServer = server.replace(/\/+$/, "");

        const syncUrl =
          `${WORKER_URL}/sync?server=${encodeURIComponent(cleanServer)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

        if(status){
          status.textContent = "Syncing...";
          status.classList.remove("connected");
          status.classList.remove("failed");
        }

        const response = await fetch(syncUrl);

        if(!response.ok){
          throw new Error("Sync failed");
        }

        const data = await response.json();

        localStorage.setItem("xtream", JSON.stringify({
          server: cleanServer,
          username,
          password
        }));

        localStorage.setItem("xtream_cache", JSON.stringify(data));

        if(status){
          status.textContent = "Connected";
          status.classList.remove("failed");
          status.classList.add("connected");
        }

        xtreamPopup.style.display = "none";

      } catch (err){

        console.error(err);

        if(status){
          status.textContent = "Failed";
          status.classList.remove("connected");
          status.classList.add("failed");
        }

        alert("Connection Failed. Try again later.");
      }

    });

  }

  /* ================= RENDER MOVIES ================= */

  function renderMovies(){

    const container = document.getElementById("movies-container");
    if(!container) return;

    container.innerHTML = "";

    const cache = JSON.parse(localStorage.getItem("xtream_cache"));
    if(!cache || !cache.movies) return;

    for(const category in cache.movies){

      const section = document.createElement("div");
      section.className = "section";

      const title = document.createElement("h3");
      title.textContent = category;

      const row = document.createElement("div");
      row.className = "row";

      cache.movies[category].forEach(movie=>{

        const card = document.createElement("div");
        card.className = "card small";
        card.setAttribute("tabindex","0");

        if(movie.icon){
          const img = document.createElement("img");
          img.src = movie.icon;
          img.loading = "lazy";
          img.style.width="100%";
          img.style.height="100%";
          img.style.objectFit="cover";
          card.appendChild(img);
        }

        row.appendChild(card);
      });

      section.appendChild(title);
      section.appendChild(row);
      container.appendChild(section);
    }
  }

  /* ================= RENDER SHOWS ================= */

  function renderShows(){

    const container = document.getElementById("shows-container");
    if(!container) return;

    container.innerHTML = "";

    const cache = JSON.parse(localStorage.getItem("xtream_cache"));
    if(!cache || !cache.shows) return;

    for(const category in cache.shows){

      const section = document.createElement("div");
      section.className = "section";

      const title = document.createElement("h3");
      title.textContent = category;

      const row = document.createElement("div");
      row.className = "row";

      cache.shows[category].forEach(show=>{

        const card = document.createElement("div");
        card.className = "card small";
        card.setAttribute("tabindex","0");

        if(show.cover){
          const img = document.createElement("img");
          img.src = show.cover;
          img.loading = "lazy";
          img.style.width="100%";
          img.style.height="100%";
          img.style.objectFit="cover";
          card.appendChild(img);
        }

        row.appendChild(card);
      });

      section.appendChild(title);
      section.appendChild(row);
      container.appendChild(section);
    }
  }

});