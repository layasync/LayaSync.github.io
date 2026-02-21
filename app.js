const mockData = {
    recent: [
        { title: 'SUPERMAN', img: 'https://via.placeholder.com/440x247', meta: '1h 15m', progress: 60 },
        { title: 'MOBLAND', img: 'https://via.placeholder.com/440x247', meta: 'S1 E5 - 58m', progress: 30 }
    ],
    movies: [
        { title: 'Deep Cover', img: 'https://via.placeholder.com/210x315' },
        { title: 'The Amateur', img: 'https://via.placeholder.com/210x315' },
        { title: 'Dragon', img: 'https://via.placeholder.com/210x315', new: true }
    ]
};

function initHome() {
    const recentContainer = document.getElementById('recent-watching');
    const movieContainer = document.getElementById('last-added');

    // Render Recent (Landscape)
    mockData.recent.forEach(item => {
        recentContainer.innerHTML += `
            <div class="card-landscape">
                <img class="poster" src="${item.img}">
                <div class="progress-bar"><div class="progress-fill" style="width:${item.progress}%"></div></div>
                <div style="position:absolute; bottom:30px; left:20px; font-weight:bold;">${item.title}</div>
            </div>`;
    });

    // Render Last Added (Portrait)
    mockData.movies.forEach(item => {
        movieContainer.innerHTML += `
            <div class="card-portrait">
                <img class="poster" src="${item.img}">
                ${item.new ? '<div class="status-dot"></div>' : ''}
            </div>`;
    });
}

document.addEventListener('DOMContentLoaded', initHome); 