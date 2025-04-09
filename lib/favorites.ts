'use client';

// Key for storing favorites in localStorage
const FAVORITES_KEY = 'nextbus_favorites';

// Load favorites from localStorage
export const loadFavorites = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  
  try {
    const favoritesStr = localStorage.getItem(FAVORITES_KEY);
    if (favoritesStr) {
      return JSON.parse(favoritesStr);
    }
  } catch (error) {
    console.error('Error loading favorites:', error);
  }
  
  return [];
};

// Save favorites to localStorage
export const saveFavorites = (favorites: string[]): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Error saving favorites:', error);
  }
};

// Toggle a movie's favorite status
export const toggleFavorite = (movieId: string): boolean => {
  const favorites = loadFavorites();
  const index = favorites.indexOf(movieId);
  
  if (index === -1) {
    // Add to favorites
    favorites.push(movieId);
    saveFavorites(favorites);
    return true;
  } else {
    // Remove from favorites
    favorites.splice(index, 1);
    saveFavorites(favorites);
    return false;
  }
};

// Check if a movie is in favorites
export const isFavorite = (movieId: string): boolean => {
  const favorites = loadFavorites();
  return favorites.includes(movieId);
};

// Clear all favorites
export const clearFavorites = (): void => {
  saveFavorites([]);
}; 