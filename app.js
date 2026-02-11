document.addEventListener("DOMContentLoaded", function(){

  const WORKER_URL = "https://layasync-proxy.layasync.workers.dev";

  const status = document.getElementById("xtream-status");

  const navItems = document.querySelectorAll('.nav');

  const pages = {
    Home:'home',
    Search:'search',
    Movies:'movies',
    Shows:'shows',
    Playlists:'playlists',
    Collections:'collections',
    Live:'live'
  };

  function showPage(name){
    document.querySelectorAll('.page').forEach(p=>p.style.display='none');

    if(pages[name]){
      document.getElementById(pages[name]).style.display='block';
    }

    navItems.forEach(n=>n.classList.remove('active'));
    const activeNav = [...navItems].find(n=>n.textContent.trim()===name);
    if(activeNav) activeNav.classList.add('active');
  }

  navItems.forEach(item=>{
    item.addEventListener('click', ()=>{
      const page = item.textContent.trim();
      showPage(page);

      if(page === "Movies") renderMovies();
      if(page === "Shows") renderShows();
    });
  });

  /* ================= XTREAM CONNECT ================= */

  document.getElementById("xtream-connect").addEventListener("click", async function(){

    const server = document.getElementById("xtream-server").value.trim();
    const username = document.getElementById("xtream-username").value.trim();
    const password = document.getElementById("xtream-password").value.trim();

    if(!server || !username || !password){
      alert("Fill all fields");
      return;
    }

    try{

      localStorage.removeItem("xtream");
      localStorage.removeItem("xtream_cache");

      const cleanServer = server.replace(/\/+$/, "");

      const syncUrl =
        `${WORKER_URL}/sync?server=${encodeURIComponent(cleanServer)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

      status.textContent = "Syncing...";
      status.classList.remove("connected");
      status.classList.remove("failed");

      const response = await fetch(syncUrl);

      if(!response.ok){
        throw new Error("Sync failed");
      }

      const data = await response.json();

      // Save login
      localStorage.setItem("xtream", JSON.stringify({
        server: cleanServer,
        username,
        password
      }));

      // Save full library
      localStorage.setItem("xtream_cache", JSON.stringify(data));

      status.textContent = "Connected";
      status.classList.add("connected");

      document.getElementById("xtream-popup").style.display="none";

    }catch(e){

      console.error(e);

      status.textContent = "Failed";
      status.classList.add("failed");

      alert("Connection Failed. Try again after 30 seconds.");
    }

  });

  /* ================= RENDER MOVIES ================= */

  function renderMovies(){

    const container = document.getElementById("movies-container");
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