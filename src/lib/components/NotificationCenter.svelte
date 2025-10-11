<script lang="ts">
	import { onMount } from 'svelte';
	import { apiClient } from '$lib/api-client';
	import { authStore } from '$lib/stores/auth-store';

	export let isOpen = false;
	export let onClose: () => void;

	let notifications: any[] = [];
	let isLoading = false;
	let unreadCount = 0;

	onMount(() => {
		loadNotifications();
		// Poll for new notifications every 30 seconds
		const interval = setInterval(loadNotifications, 30000);
		return () => clearInterval(interval);
	});

	async function loadNotifications() {
		if (!$authStore.user?.id) return;

		try {
			isLoading = true;
			const response = await apiClient.alerts.list({ userId: $authStore.user.id, limit: 50 });
			notifications = response.alerts || [];
			// Count unread notifications (status !== 'READ')
			unreadCount = notifications.filter((n: any) => n.status !== 'READ').length;
		} catch (error) {
			console.error('Failed to load notifications:', error);
		} finally {
			isLoading = false;
		}
	}

	async function markAsRead(notificationId: string) {
		try {
			await apiClient.alerts.markRead(notificationId);
			notifications = notifications.map(n => 
				n.id === notificationId ? { ...n, status: 'READ', readAt: new Date().toISOString() } : n
			);
			unreadCount = notifications.filter((n: any) => n.status !== 'READ').length;
		} catch (error) {
			console.error('Failed to mark notification as read:', error);
		}
	}

	async function markAllAsRead() {
		try {
			const unreadIds = notifications.filter(n => n.status !== 'READ').map(n => n.id);
			await Promise.all(unreadIds.map(id => apiClient.alerts.markRead(id)));
			notifications = notifications.map(n => ({ ...n, status: 'READ', readAt: new Date().toISOString() }));
			unreadCount = 0;
		} catch (error) {
			console.error('Failed to mark all as read:', error);
		}
	}

	function getPriorityColor(priority: number): string {
		if (priority >= 75) return 'text-red-600 bg-red-50';
		if (priority >= 50) return 'text-orange-600 bg-orange-50';
		if (priority >= 25) return 'text-yellow-600 bg-yellow-50';
		return 'text-blue-600 bg-blue-50';
	}

	function getTypeIcon(type: string): string {
		const icons: Record<string, string> = {
			'case_status_update': '📋',
			'case_approved': '✅',
			'case_rejected': '❌',
			'case_escalated': '🚨',
			'system_alert': '⚠️',
			'reminder': '🔔'
		};
		return icons[type] || '📬';
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div 
		class="fixed inset-0 z-50 bg-black/20"
		onclick={onClose}
	></div>

	<div class="fixed right-4 top-16 z-50 w-96 max-h-[600px] overflow-hidden rounded-2xl bg-white shadow-2xl">
		<!-- Header -->
		<div class="flex items-center justify-between border-b bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
			<div class="flex items-center gap-2">
				<span class="text-2xl">🔔</span>
				<h3 class="font-bold text-lg">Notifications</h3>
				{#if unreadCount > 0}
					<span class="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-blue-600">
						{unreadCount}
					</span>
				{/if}
			</div>
			<button
				type="button"
				onclick={onClose}
				class="rounded-lg p-1 hover:bg-blue-500"
				aria-label="Close notifications"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
				</svg>
			</button>
		</div>

		<!-- Actions -->
		{#if notifications.length > 0 && unreadCount > 0}
			<div class="border-b p-3">
				<button
					type="button"
					onclick={markAllAsRead}
					class="text-sm font-semibold text-blue-600 hover:text-blue-700"
				>
					Mark all as read
				</button>
			</div>
		{/if}

		<!-- Notification List -->
		<div class="max-h-[480px] overflow-y-auto">
			{#if isLoading}
				<div class="p-8 text-center">
					<div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
					<p class="mt-2 text-sm text-gray-600">Loading notifications...</p>
				</div>
			{:else if notifications.length === 0}
				<div class="p-8 text-center">
					<div class="text-4xl">📭</div>
					<p class="mt-2 font-semibold text-gray-900">No notifications</p>
					<p class="text-sm text-gray-600">You're all caught up!</p>
				</div>
			{:else}
				<div class="divide-y">
					{#each notifications as notification}
						<button
							type="button"
							onclick={() => markAsRead(notification.id)}
							class="w-full p-4 text-left transition-colors hover:bg-gray-50 {notification.status !== 'READ' ? 'bg-blue-50' : ''}"
						>
							<div class="flex gap-3">
								<div class="flex-shrink-0 text-2xl">
									{getTypeIcon(notification.type)}
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between gap-2">
										<p class="text-sm font-semibold text-gray-900 {notification.status !== 'READ' ? 'font-bold' : ''}">
											{notification.message}
										</p>
										{#if notification.status !== 'READ'}
											<div class="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1"></div>
										{/if}
									</div>
									<p class="mt-1 text-xs text-gray-600">
										{formatDate(notification.createdAt)}
									</p>
									{#if notification.priority >= 50}
										<span class="mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold {getPriorityColor(notification.priority)}">
											{notification.priority >= 75 ? 'Urgent' : 'Important'}
										</span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="border-t bg-gray-50 p-3 text-center">
			<button
				type="button"
				onclick={loadNotifications}
				disabled={isLoading}
				class="text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-50"
			>
				{isLoading ? 'Refreshing...' : '🔄 Refresh'}
			</button>
		</div>
	</div>
{/if}
