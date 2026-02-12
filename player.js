const overlay = document.getElementById("video-player-overlay");
const video = document.getElementById("video-element");
const titleEl = document.getElementById("video-title");

const playPause = document.getElementById("play-pause");
const seekBack = document.getElementById("seek-back");
const seekForward = document.getElementById("seek-forward");
const exitBtn = overlay ? overlay.querySelector(".video-top .video-btn") : null;

const progressBar = document.getElementById("progress-bar");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");

const aspectSelect = document.getElementById("aspect-select");
const audioSelect = document.getElementById("audio-select");
const subtitleSelect = document.getElementById("subtitle-select");

let hideTimer = null;
let hls = null;

/* ================= OPEN PLAYER ================= */

window.openPlayer = function(url, title){

  if(!overlay || !video) return;

  // Reset previous stream
  video.pause();
  video.removeAttribute("src");
  video.load();

  if(hls){
    hls.destroy();
    hls = null;
  }

  overlay.style.display = "flex";
  titleEl.textContent = title || "Now Playing";

  // HLS support
  if(url.includes(".m3u8")){
    if(window.Hls && Hls.isSupported()){
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if(video.canPlayType("application/vnd.apple.mpegurl")){
      video.src = url;
    }
  } else {
    video.src = url;
  }

  video.play().catch(()=>{});

  setupTracks();
  resetHideTimer();
};

/* ================= CLOSE PLAYER ================= */

window.closePlayer = function(){
  if(video){
    video.pause();
    video.removeAttribute("src");
    video.load();
  }

  if(hls){
    hls.destroy();
    hls = null;
  }

  if(overlay){
    overlay.style.display = "none";
  }
};

/* ================= EXIT BUTTON ================= */

if(exitBtn){
  exitBtn.onclick = closePlayer;
}

/* ================= PLAY / PAUSE ================= */

if(playPause){
  playPause.onclick = function(){
    video.paused ? video.play() : video.pause();
  };
}

/* ================= SEEK ================= */

if(seekBack) seekBack.onclick = ()=> video.currentTime -= 10;
if(seekForward) seekForward.onclick = ()=> video.currentTime += 10;

/* ================= PROGRESS ================= */

video.addEventListener("timeupdate", ()=>{
  if(!video.duration) return;

  const percent = (video.currentTime / video.duration) * 100;
  progressBar.value = percent || 0;

  currentTimeEl.textContent = formatTime(video.currentTime);
  durationEl.textContent = formatTime(video.duration);
});

if(progressBar){
  progressBar.oninput = function(){
    if(video.duration){
      video.currentTime = (progressBar.value / 100) * video.duration;
    }
  };
}

function formatTime(seconds){
  if(!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0"+s : s}`;
}

/* ================= ASPECT MODES ================= */

if(aspectSelect){
  aspectSelect.onchange = function(){

    const val = this.value;

    // Reset first
    video.style.aspectRatio = "";
    video.style.width = "100%";
    video.style.height = "100%";

    switch(val){

      case "contain":   // FIT
        video.style.objectFit = "contain";
        break;

      case "cover":     // ZOOM
        video.style.objectFit = "cover";
        break;

      case "fill":      // TRUE FILL (stretch to full screen)
        video.style.objectFit = "fill";
        break;

      case "16:9":
        video.style.objectFit = "contain";
        video.style.aspectRatio = "16 / 9";
        break;

      default:
        video.style.objectFit = "contain";
    }
  };
}

/* ================= AUDIO & SUBTITLES ================= */

function setupTracks(){

  if(!audioSelect || !subtitleSelect) return;

  audioSelect.innerHTML = "";
  subtitleSelect.innerHTML = "";

  const audioTracks = video.audioTracks;

  if(audioTracks && audioTracks.length > 0){
    for(let i=0;i<audioTracks.length;i++){
      const option = document.createElement("option");
      option.value = i;
      option.textContent = audioTracks[i].label || "Audio "+(i+1);
      audioSelect.appendChild(option);
    }

    audioSelect.onchange = function(){
      for(let i=0;i<audioTracks.length;i++){
        audioTracks[i].enabled = (i == this.value);
      }
    };
  }

  const textTracks = video.textTracks;

  if(textTracks && textTracks.length > 0){
    for(let i=0;i<textTracks.length;i++){
      const option = document.createElement("option");
      option.value = i;
      option.textContent = textTracks[i].label || "Subtitle "+(i+1);
      subtitleSelect.appendChild(option);
    }

    subtitleSelect.onchange = function(){
      for(let i=0;i<textTracks.length;i++){
        textTracks[i].mode = (i == this.value) ? "showing" : "disabled";
      }
    };
  }
}

/* ================= AUTO HIDE UI ================= */

function resetHideTimer(){
  if(!overlay) return;

  clearTimeout(hideTimer);

  const ui = overlay.querySelector(".video-ui");
  if(ui) ui.style.opacity = "1";

  hideTimer = setTimeout(()=>{
    if(ui) ui.style.opacity = "0";
  }, 4000);
}

if(overlay){
  overlay.addEventListener("mousemove", resetHideTimer);
  overlay.addEventListener("click", resetHideTimer);
}