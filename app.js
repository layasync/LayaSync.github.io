const data = {
    recent: [
        { title: 'SUPERMAN', meta: '1h 15m', progress: 40, img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsx6PViRWfo7nMFel81zgsYqq4mNCr4cN3BPTbq348gw&s=10' },
        { title: 'MOBLAND', meta: 'S1 · E5 - 58m', progress: 80, img: 'https://images7.alphacoders.com/132/1325170.jpeg' },
        { title: 'BALLERINA', meta: '2h 42m', progress: 10, img: 'https://images8.alphacoders.com/133/1339031.jpg' }
    ],
    lastAdded: [
        { title: 'Deep Cover', img: 'https://www.themoviedb.org/t/p/original/6S0x7hI9S8Xl1WdY1Z1U0u6X0.jpg', isNew: false },
        { title: 'The Amateur', img: 'https://www.themoviedb.org/t/p/original/8uVKfR6VoBovmZ4fS6SAsURunje.jpg', isNew: false },
        { title: 'Dragon', img: 'https://www.themoviedb.org/t/p/original/pA0VpS3D28Iu3bJvPqV8t2mC4vL.jpg', isNew: true },
        { title: 'Sinners', img: 'https://www.themoviedb.org/t/p/original/6S0x7hI9S8Xl1WdY1Z1U0u6X0.jpg', isNew: false },
        { title: 'Elio', img: 'https://www.themoviedb.org/t/p/original/6S0x7hI9S8Xl1WdY1Z1U0u6X0.jpg', isNew: true }
    ]
};

function renderHome() {
    const recentRow = document.getElementById('row-recent');
    const lastAddedRow = document.getElementById('row-last-added');

    data.recent.forEach(item => {
        recentRow.innerHTML += `
            <div class="card-landscape">
                <img src="${item.img}">
                <div class="card-overlay">
                    <div class="card-title">${item.title}</div>
                    <div class="card-meta"><span>▶</span> ${item.meta}</div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${item.progress}%"></div></div>
                </div>
            </div>`;
    });

    data.lastAdded.forEach(item => {
        lastAddedRow.innerHTML += `
            <div class="card-portrait">
                <img src="${item.img}">
                ${item.isNew ? '<div class="dot-new"></div>' : ''}
            </div>`;
    });
}

window.onload = renderHome;