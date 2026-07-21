
import { Game, Achievement, Content, User, UserAchievementProgress, ValidationLog, ProfileWallpaper, Feedback, UserGoal, StoreItem } from './types';

const API_URL = '/api';

class BackendService {
  private async request(path: string, options?: RequestInit) {
    try {
      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      if (!response.ok) {
        let errorMsg = `API Error (${response.status})`;
        try {
          const errorJson = await response.json();
          if (errorJson && errorJson.error) {
            errorMsg = errorJson.error;
          } else if (errorJson && errorJson.message) {
            errorMsg = errorJson.message;
          }
        } catch (e) {
          const errorText = await response.text().catch(() => '');
          if (errorText) errorMsg += `: ${errorText}`;
        }
        
        throw new Error(errorMsg);
      }
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${path}:`, error);
      throw error;
    }
  }

  // --- STEAM ---
  async getSteamAuthUrl(): Promise<{ url: string }> {
    return this.request('/auth/steam/url');
  }

  async syncSteamAchievements(steamId: string, appId: string): Promise<any[]> {
    return this.request(`/steam/achievements/${steamId}/${appId}`);
  }

  async getGameSchema(appId: string): Promise<any[]> {
    return this.request(`/steam/game-schema/${appId}`);
  }

  async getOwnedGames(steamId: string): Promise<any[]> {
    return this.request(`/steam/owned-games/${steamId}`);
  }

  async getGlobalAchievementPercentages(appId: string): Promise<{ name: string; percent: number }[]> {
    return this.request(`/steam/achievement-percentages/${appId}`);
  }

  // --- SUBSCRIPTION (STUB) ---
  async getSubscriptionStatus(): Promise<{ plan: string; status: string; expiresAt: string | null }> {
    return this.request('/subscription/status');
  }
}

export const api = new BackendService();
