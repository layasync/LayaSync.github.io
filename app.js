const grid = document.getElementById("grid");

const posters = [
    "https://picsum.photos/300/450?1",
    "https://picsum.photos/300/450?2",
    "https://picsum.photos/300/450?3",
    "https://picsum.photos/300/450?4",
    "https://picsum.photos/300/450?5",
    "https://picsum.photos/300/450?6"
];

function createCard(image){
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<img src="${image}">`;
    card.onclick = () => openPlayer("https://www.w3schools.com/html/mov_bbb.mp4");
    return card;
}

posters.forEach(p => {
    grid.appendChild(createCard(p));
});

function openPlayer(src){
    const modal = document.getElementById("playerModal");
    const video = document.getElementById("videoPlayer");
    video.src = src;
    modal.style.display = "flex";
    video.play();
}

function closePlayer(){
    const modal = document.getElementById("playerModal");
    const video = document.getElementById("videoPlayer");
    video.pause();
    video.src = "";
    modal.style.display = "none";
} 
const currentRow = document.getElementById("currentRow");
const movieGrid = document.getElementById("movieGrid");

const landscapeImages = [
    "https://picsum.photos/800/450?1",
    "https://picsum.photos/800/450?2",
    "https://picsum.photos/800/450?3"
];

const posterImages = [
    "https://picsum.photos/300/450?4",
    "https://picsum.photos/300/450?5",
    "https://picsum.photos/300/450?6",
    "https://picsum.photos/300/450?7",
    "https://picsum.photos/300/450?8",
    "https://picsum.photos/300/450?9"
];

landscapeImages.forEach(img => {
    const card = document.createElement("div");
    card.className = "landscape-card";
    card.innerHTML = `<img src="${img}">`;
    currentRow.appendChild(card);


posterImages.forEach(img => {
    const card = document.createElement("div");
    card.className = "poster-card";
    card.innerHTML = `<img src="${img}">`;
    movieGrid.appendChild(card);
});