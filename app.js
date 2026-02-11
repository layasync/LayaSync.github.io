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