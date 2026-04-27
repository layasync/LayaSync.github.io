const logos = [
  { name: "Nike", img: "https://cdn.simpleicons.org/nike/000" },
  { name: "Adidas", img: "https://cdn.simpleicons.org/adidas/000" },
  { name: "Puma", img: "https://cdn.simpleicons.org/puma/000" },
  { name: "Apple", img: "https://cdn.simpleicons.org/apple/000" },
  { name: "Samsung", img: "https://cdn.simpleicons.org/samsung/1428A0" },
  { name: "Google", img: "https://cdn.simpleicons.org/google" },
  { name: "Microsoft", img: "https://cdn.simpleicons.org/microsoft" },
  { name: "Toyota", img: "https://cdn.simpleicons.org/toyota/EB0A1E" },
  { name: "Mercedes", img: "https://cdn.simpleicons.org/mercedes/000" },
  { name: "BMW", img: "https://cdn.simpleicons.org/bmw" },
  { name: "Audi", img: "https://cdn.simpleicons.org/audi/000" },
  { name: "Coca-Cola", img: "https://cdn.simpleicons.org/cocacola/E41A1C" },
  { name: "PlayStation", img: "https://cdn.simpleicons.org/playstation" },
  { name: "Amazon", img: "https://cdn.simpleicons.org/amazon" },
  { name: "Twitter", img: "https://cdn.simpleicons.org/twitter" }
];

const grid = document.getElementById("grid");

logos.forEach(logo => {
  grid.innerHTML += `
    <div class="card">
      <img src="${logo.img}">
      <p>${logo.name}</p>
    </div>
  `;
});