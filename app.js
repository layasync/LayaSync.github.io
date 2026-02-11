document.addEventListener("DOMContentLoaded", function(){

  const WORKER = "https://layasync-proxy.layasync.workers.dev";
  let credentials = null;

  const status = document.getElementById("xtream-status");
  const xtreamPopup = document.getElementById("xtream-popup");
  const xtreamClose = document.getElementById("xtream-close");
  const xtreamConnect = document.getElementById("xtream-connect");

  // ================= LOGIN =================

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

  // ================= MOVIE CATEGORIES =================

  async function loadMovieCategories(){

    const container = document.getElementById("movies-container");
    container.innerHTML = "Loading...";

    const res = await fetch(
      `${WORKER}/vod-categories?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}`
    );

    const categories = await res.json();
    container.innerHTML = "";

    categories.forEach(cat=>{

      const section = document.createElement("div");
      section.className="section";

      const title = document.createElement("h3");
      title.textContent = cat.category_name;

      const row = document.createElement("div");
      row.className="row";

      row.onclick = ()=> loadMovies(cat.category_id, row);

      section.appendChild(title);
      section.appendChild(row);
      container.appendChild(section);
    });
  }

  async function loadMovies(category_id, row){

    if(row.dataset.loaded) return;

    row.innerHTML="Loading...";

    const res = await fetch(
      `${WORKER}/vod-streams?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}&category_id=${category_id}`
    );

    const movies = await res.json();
    row.innerHTML="";
    row.dataset.loaded="true";

    movies.forEach(movie=>{

      const card = document.createElement("div");
      card.className="card small";

      if(movie.stream_icon){
        const img=document.createElement("img");
        img.src=`${WORKER}/image?url=${encodeURIComponent(movie.stream_icon)}`;
        img.loading="lazy";
        img.style.width="100%";
        img.style.height="100%";
        img.style.objectFit="cover";
        card.appendChild(img);
      }

      row.appendChild(card);
    });
  }

  // ================= SHOW CATEGORIES =================

  async function loadShowCategories(){

    const container = document.getElementById("shows-container");
    container.innerHTML = "Loading...";

    const res = await fetch(
      `${WORKER}/series-categories?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}`
    );

    const categories = await res.json();
    container.innerHTML = "";

    categories.forEach(cat=>{

      const section = document.createElement("div");
      section.className="section";

      const title = document.createElement("h3");
      title.textContent = cat.category_name;

      const row = document.createElement("div");
      row.className="row";

      row.onclick = ()=> loadShows(cat.category_id, row);

      section.appendChild(title);
      section.appendChild(row);
      container.appendChild(section);
    });
  }

  async function loadShows(category_id, row){

    if(row.dataset.loaded) return;

    row.innerHTML="Loading...";

    const res = await fetch(
      `${WORKER}/series?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}&category_id=${category_id}`
    );

    const shows = await res.json();
    row.innerHTML="";
    row.dataset.loaded="true";

    shows.forEach(show=>{

      const card = document.createElement("div");
      card.className="card small";

      if(show.cover){
        const img=document.createElement("img");
        img.src=`${WORKER}/image?url=${encodeURIComponent(show.cover)}`;
        img.loading="lazy";
        img.style.width="100%";
        img.style.height="100%";
        img.style.objectFit="cover";
        card.appendChild(img);
      }

      row.appendChild(card);
    });
  }

  // ================= NAVIGATION =================

  document.querySelectorAll(".nav").forEach(nav=>{
    nav.onclick = ()=>{
      const name = nav.textContent.trim();

      document.querySelectorAll(".page").forEach(p=>p.style.display="none");

      const page = document.getElementById(name.toLowerCase());
      if(page) page.style.display="block";

      if(name==="Movies") loadMovieCategories();
      if(name==="Shows") loadShowCategories();
    };
  });

});