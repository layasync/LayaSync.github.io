document.addEventListener("DOMContentLoaded", function(){

  const WORKER = "https://layasync-proxy.layasync.workers.dev";
  let credentials = null;

  const status = document.getElementById("xtream-status");
  const xtreamPopup = document.getElementById("xtream-popup");
  const xtreamClose = document.getElementById("xtream-close");
  const xtreamConnect = document.getElementById("xtream-connect");

  /* ================= RESTORE LOGIN ================= */

  const saved = localStorage.getItem("xtream_login");
  if(saved){
    credentials = JSON.parse(saved);
    status.textContent = "Connected";
    status.classList.add("connected");
  }

  /* ================= NAVIGATION ================= */

  const navItems = document.querySelectorAll(".nav");

  function activateNav(clickedNav){
    navItems.forEach(n => n.classList.remove("active"));
    clickedNav.classList.add("active");
  }

  navItems.forEach(nav=>{
    nav.onclick = ()=>{
      const name = nav.textContent.trim();
      activateNav(nav);

      document.querySelectorAll(".page").forEach(p=>p.style.display="none");

      const page = document.getElementById(name.toLowerCase());
      if(page) page.style.display="block";

      if(name==="Movies") loadMovieCategories();
      if(name==="Shows") loadShowCategories();
    };
  });

  /* ================= LOGIN ================= */

  xtreamConnect.onclick = async function(){

    const server = document.getElementById("xtream-server").value.trim();
    const username = document.getElementById("xtream-username").value.trim();
    const password = document.getElementById("xtream-password").value.trim();

    if(!server || !username || !password){
      alert("Fill all fields");
      return;
    }

    try{

      const res = await fetch(
        `${WORKER}/login?server=${encodeURIComponent(server)}&username=${username}&password=${password}`
      );

      const data = await res.json();

      if(!data.user_info || data.user_info.auth !== 1){
        throw new Error("Invalid login");
      }

      credentials = { server, username, password };
      localStorage.setItem("xtream_login", JSON.stringify(credentials));

      status.textContent = "Connected";
      status.classList.remove("failed");
      status.classList.add("connected");

      xtreamPopup.style.display = "none";

    }catch(e){
      status.textContent = "Failed";
      status.classList.remove("connected");
      status.classList.add("failed");
      alert("Login Failed");
    }
  };

  xtreamClose.onclick = ()=> xtreamPopup.style.display="none";

  document.querySelector(".xtream-btn").onclick = ()=>{
    xtreamPopup.style.display="flex";
  };

  /* ================= MOVIES ================= */

  async function loadMovieCategories(){

    if(!credentials) return alert("Please login first");

    const container = document.getElementById("movies-container");
    container.innerHTML = "Loading...";

    const res = await fetch(
      `${WORKER}/vod-categories?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}`
    );

    const categories = await res.json();
    container.innerHTML = "";

    categories.forEach(cat=>{

      const block = document.createElement("div");
      block.className = "category-block";

      const header = document.createElement("div");
      header.className = "category-header";
      header.textContent = cat.category_name;

      const streamsContainer = document.createElement("div");
      streamsContainer.className = "category-streams";

      header.onclick = async ()=>{

        document.querySelectorAll("#movies-container .category-header")
          .forEach(h=>h.classList.remove("active"));

        document.querySelectorAll("#movies-container .category-streams")
          .forEach(s=>s.classList.remove("active"));

        header.classList.add("active");
        streamsContainer.classList.add("active");

        if(streamsContainer.dataset.loaded) return;

        streamsContainer.innerHTML = "Loading...";

        const streamRes = await fetch(
          `${WORKER}/vod-streams?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}&category_id=${cat.category_id}`
        );

        const movies = await streamRes.json();
        streamsContainer.innerHTML = "";

        const row = document.createElement("div");
        row.className = "row";

        movies.forEach(movie=>{

          const card = document.createElement("div");
          card.className = "card small";

          const poster =
            movie.stream_icon ||
            movie.movie_icon ||
            movie.cover ||
            movie.icon;

          if(poster){
            const img = document.createElement("img");
            img.src = `${WORKER}/image?url=${encodeURIComponent(poster)}`;
            img.loading = "lazy";
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";
            card.appendChild(img);
          }

          card.onclick = ()=>{
            const ext = movie.container_extension || "mp4";
            const streamUrl =
              `${credentials.server}/movie/${credentials.username}/${credentials.password}/${movie.stream_id}.${ext}`;
            openPlayer(streamUrl, movie.name);
          };

          row.appendChild(card);
        });

        streamsContainer.appendChild(row);
        streamsContainer.dataset.loaded = "true";
      };

      block.appendChild(header);
      block.appendChild(streamsContainer);
      container.appendChild(block);
    });
  }

  /* ================= SHOWS ================= */

  async function loadShowCategories(){

    if(!credentials) return alert("Please login first");

    const container = document.getElementById("shows-container");
    container.innerHTML = "Loading...";

    const res = await fetch(
      `${WORKER}/series-categories?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}`
    );

    const categories = await res.json();
    container.innerHTML = "";

    categories.forEach(cat=>{

      const block = document.createElement("div");
      block.className = "category-block";

      const header = document.createElement("div");
      header.className = "category-header";
      header.textContent = cat.category_name;

      const streamsContainer = document.createElement("div");
      streamsContainer.className = "category-streams";

      header.onclick = async ()=>{

        document.querySelectorAll("#shows-container .category-header")
          .forEach(h=>h.classList.remove("active"));

        document.querySelectorAll("#shows-container .category-streams")
          .forEach(s=>s.classList.remove("active"));

        header.classList.add("active");
        streamsContainer.classList.add("active");

        if(streamsContainer.dataset.loaded) return;

        streamsContainer.innerHTML = "Loading...";

        const streamRes = await fetch(
          `${WORKER}/series?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}&category_id=${cat.category_id}`
        );

        const shows = await streamRes.json();
        streamsContainer.innerHTML = "";

        const row = document.createElement("div");
        row.className = "row";

        shows.forEach(show=>{

          const card = document.createElement("div");
          card.className = "card small";

          const poster =
            show.cover ||
            show.stream_icon ||
            show.icon;

          if(poster){
            const img = document.createElement("img");
            img.src = `${WORKER}/image?url=${encodeURIComponent(poster)}`;
            img.loading = "lazy";
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";
            card.appendChild(img);
          }

          card.onclick = ()=>{
            const streamUrl =
              `${credentials.server}/series/${credentials.username}/${credentials.password}/${show.series_id}.mp4`;
            openPlayer(streamUrl, show.name);
          };

          row.appendChild(card);
        });

        streamsContainer.appendChild(row);
        streamsContainer.dataset.loaded = "true";
      };

      block.appendChild(header);
      block.appendChild(streamsContainer);
      container.appendChild(block);
    });
/* ================= NETWORK STREAM ================= */

const networkPopup = document.getElementById("network-popup");
const networkBtn = document.querySelector(".network-btn");
const networkClose = document.getElementById("network-close");
const networkPlay = document.getElementById("network-play");

if(networkBtn){
  networkBtn.addEventListener("click", ()=>{
    networkPopup.style.display = "flex";
  });
}

if(networkClose){
  networkClose.addEventListener("click", ()=>{
    networkPopup.style.display = "none";
  });
}

if(networkPlay){
  networkPlay.addEventListener("click", ()=>{
    const url = document.getElementById("network-url").value.trim();
    if(!url) return alert("Enter URL");

    networkPopup.style.display = "none";
    openPlayer(url, "Network Stream");
  });
}
  }

});