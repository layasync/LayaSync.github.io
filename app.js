document.addEventListener("DOMContentLoaded", function(){

  console.log("APP READY");

  /* ================= NAVIGATION ================= */

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
    document.querySelectorAll('.page').forEach(p=>{
      p.style.display='none';
    });

    if(pages[name]){
      document.getElementById(pages[name]).style.display='block';
    }

    navItems.forEach(n=>n.classList.remove('active'));

    const activeNav = [...navItems].find(n=>n.textContent.trim()===name);
    if(activeNav){
      activeNav.classList.add('active');
    }
  }

  navItems.forEach(item=>{
    item.addEventListener('click',()=>{
      showPage(item.textContent.trim());
    });
  });


  /* ================= XTREAM POPUP ================= */

  const xtreamBtn = document.querySelector(".xtream-btn");
  const xtreamPopup = document.getElementById("xtream-popup");
  const xtreamClose = document.getElementById("xtream-close");

  console.log("Button:", xtreamBtn);
  console.log("Popup:", xtreamPopup);

  if(xtreamBtn && xtreamPopup){
    xtreamBtn.addEventListener("click", function(){
      console.log("Xtream clicked");
      xtreamPopup.style.display = "flex";
    });
  }

  if(xtreamClose && xtreamPopup){
    xtreamClose.addEventListener("click", function(){
      xtreamPopup.style.display = "none";
    });
  }

});