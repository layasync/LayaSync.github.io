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
  document.getElementById(pages[name]).style.display='block';

  navItems.forEach(n=>n.classList.remove('active'));
  [...navItems].find(n=>n.textContent.trim()===name).classList.add('active');
}

navItems.forEach(item=>{
  item.addEventListener('click',()=>{
    showPage(item.textContent.trim());
  });
});