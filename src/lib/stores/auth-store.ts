import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { apiClient } from '$lib/api-client';

interface User {
	id: string;
	email: string;
	name: string;
	role: string;
	language: string;
}

interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		token: null,
		isAuthenticated: false,
		isLoading: true
	});

	let initialized = false;

	// Initialize from localStorage
	if (browser) {
		const token = localStorage.getItem('auth_token');
		const userStr = localStorage.getItem('user');
		
		if (token && userStr) {
			try {
				const user = JSON.parse(userStr);
				set({
					user,
					token,
					isAuthenticated: true,
					isLoading: false
				});
				initialized = true;
			} catch (error) {
				console.error('Failed to parse user data:', error);
				localStorage.removeItem('auth_token');
				localStorage.removeItem('user');
				set({ user: null, token: null, isAuthenticated: false, isLoading: false });
				initialized = true;
			}
		} else {
			set({ user: null, token: null, isAuthenticated: false, isLoading: false });
			initialized = true;
		}
	}

	return {
		subscribe,
		
		login: async (email: string, password: string) => {
			try {
				// Set loading state
				update(state => ({ ...state, isLoading: true }));
				
				const response = await apiClient.auth.login(email, password);
				
				// Small delay to ensure smooth transition
				await new Promise(resolve => setTimeout(resolve, 100));
				
				set({
					user: response.user,
					token: response.token,
					isAuthenticated: true,
					isLoading: false
				});
				
				return { success: true, user: response.user };
			} catch (error: any) {
				set({
					user: null,
					token: null,
					isAuthenticated: false,
					isLoading: false
				});
				return { success: false, error: error.message || 'Login failed' };
			}
		},

		register: async (data: {
			email: string;
			password: string;
			name: string;
			role: string;
			phone?: string;
			language?: string;
		}) => {
			try {
				// Set loading state
				update(state => ({ ...state, isLoading: true }));
				
				const response = await apiClient.auth.register(data);
				
				// Small delay to ensure smooth transition
				await new Promise(resolve => setTimeout(resolve, 100));
				
				set({
					user: response.user,
					token: response.token,
					isAuthenticated: true,
					isLoading: false
				});
				
				return { success: true, user: response.user };
			} catch (error: any) {
				set({
					user: null,
					token: null,
					isAuthenticated: false,
					isLoading: false
				});
				return { success: false, error: error.message || 'Registration failed' };
			}
		},

		logout: () => {
			apiClient.auth.logout();
			set({
				user: null,
				token: null,
				isAuthenticated: false,
				isLoading: false
			});
		},

		updateUser: (user: User) => {
			update(state => ({ ...state, user }));
			if (browser) {
				localStorage.setItem('user', JSON.stringify(user));
			}
		}
	};
}

export const authStore = createAuthStore();
