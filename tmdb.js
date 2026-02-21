const TMDB_API_KEY = 'c78abeb00aa64f93fd7b516cb9bd180e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original';

const TMDB = {
    // Fetch Trending Movies for the Top Row (Landscape)
    async getTrending() {
        try {
            const response = await fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`);
            const data = await response.json();
            return data.results.slice(0, 5); // Get top 5
        } catch (error) {
            console.error("TMDB Trending Error:", error);
            return [];
        }
    },

    // Fetch Latest Popular Movies for Bottom Row (Portrait)
    async getPopular() {
        try {
            const response = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
            const data = await response.json();
            return data.results.slice(0, 10); // Get top 10
        } catch (error) {
            console.error("TMDB Popular Error:", error);
            return [];
        }
    }
};