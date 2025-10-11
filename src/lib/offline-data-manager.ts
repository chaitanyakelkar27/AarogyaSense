/**
 * Offline-First Data Architecture
 * Robust sync, conflict resolution, and data integrity for rural healthcare
 */

interface SyncableRecord {
	id: string;
	data: any;
	version: number;
	lastModified: number;
	checksum: string;
	syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict';
	deviceId: string;
}

interface SyncConflict {
	recordId: string;
	localVersion: SyncableRecord;
	remoteVersion: SyncableRecord;
	conflictType: 'version' | 'concurrent' | 'deleted';
	timestamp: number;
}

interface DataChangeLog {
	id: string;
	recordId: string;
	operation: 'create' | 'update' | 'delete';
	changes: any;
	timestamp: number;
	userId: string;
	deviceId: string;
}

class OfflineDataManager {
	private dbName = 'AarogyaHealthcare';
	private version = 1;
	private db: IDBDatabase | null = null;
	private deviceId: string;
	private syncQueue: SyncableRecord[] = [];
	private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
	private syncInProgress = false;
	
	// Event listeners
	private onSyncStatusChange: ((status: string) => void) | null = null;
	private onConflictDetected: ((conflict: SyncConflict) => void) | null = null;
	private onDataChange: ((change: DataChangeLog) => void) | null = null;

	constructor() {
		this.deviceId = this.generateDeviceId();
		this.initializeDatabase();
		this.setupNetworkListeners();
		this.setupPeriodicSync();
	}

	private generateDeviceId(): string {
		// Check if we're in a browser environment
		if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
			return 'ssr_device_' + Date.now() + '_' + Math.random().toString(36).substring(2);
		}
		
		let deviceId = localStorage.getItem('aarogya_device_id');
		if (!deviceId) {
			deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2);
			localStorage.setItem('aarogya_device_id', deviceId);
		}
		return deviceId;
	}

	private async initializeDatabase(): Promise<void> {
		// Skip initialization during SSR
		if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
			return Promise.resolve();
		}
		
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.version);
			
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				this.db = request.result;
				resolve();
			};
			
			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				
				// Cases store
				if (!db.objectStoreNames.contains('cases')) {
					const casesStore = db.createObjectStore('cases', { keyPath: 'id' });
					casesStore.createIndex('syncStatus', 'syncStatus');
					casesStore.createIndex('lastModified', 'lastModified');
					casesStore.createIndex('deviceId', 'deviceId');
				}
				
				// Sync queue store
				if (!db.objectStoreNames.contains('syncQueue')) {
					const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
					syncStore.createIndex('timestamp', 'timestamp');
				}
				
				// Conflicts store
				if (!db.objectStoreNames.contains('conflicts')) {
					const conflictsStore = db.createObjectStore('conflicts', { keyPath: 'recordId' });
					conflictsStore.createIndex('timestamp', 'timestamp');
				}
				
				// Change log store
				if (!db.objectStoreNames.contains('changeLog')) {
					const changeLogStore = db.createObjectStore('changeLog', { keyPath: 'id' });
					changeLogStore.createIndex('recordId', 'recordId');
					changeLogStore.createIndex('timestamp', 'timestamp');
				}

				// Metadata store
				if (!db.objectStoreNames.contains('metadata')) {
					db.createObjectStore('metadata', { keyPath: 'key' });
				}
			};
		});
	}

	private setupNetworkListeners(): void {
		// Only set up listeners in browser environment
		if (typeof window === 'undefined') return;
		
		window.addEventListener('online', () => {
			this.isOnline = true;
			this.notifyStatusChange('online');
			this.triggerSync();
		});
		
		window.addEventListener('offline', () => {
			this.isOnline = false;
			this.notifyStatusChange('offline');
		});
	}

	private setupPeriodicSync(): void {
		// Only set up periodic sync in browser environment
		if (typeof window === 'undefined') return;
		
		// Sync every 5 minutes when online
		setInterval(() => {
			if (this.isOnline && !this.syncInProgress) {
				this.triggerSync();
			}
		}, 5 * 60 * 1000);
	}

	// Public API Methods

	async saveRecord(storeName: string, data: any, operation: 'create' | 'update' = 'create'): Promise<string> {
		// Skip in SSR
		if (typeof window === 'undefined') {
			return data.id || this.generateId();
		}
		
		if (!this.db) await this.initializeDatabase();
		
		const record: SyncableRecord = {
			id: data.id || this.generateId(),
			data: data,
			version: await this.getNextVersion(data.id),
			lastModified: Date.now(),
			checksum: this.calculateChecksum(data),
			syncStatus: 'pending',
			deviceId: this.deviceId
		};

		// Save to IndexedDB
		await this.storeRecord(storeName, record);
		
		// Add to sync queue
		await this.addToSyncQueue(record);
		
		// Log the change
		await this.logChange(record.id, operation, data);
		
		// Trigger sync if online
		if (this.isOnline) {
			this.triggerSync();
		}

		return record.id;
	}

	async getRecord(storeName: string, id: string): Promise<any | null> {
		// Skip in SSR
		if (typeof window === 'undefined') {
			return null;
		}
		
		if (!this.db) await this.initializeDatabase();
		
		if (!this.db) throw new Error('Database not initialized');
		
		const transaction = this.db.transaction(storeName, 'readonly');
		const store = transaction.objectStore(storeName);
		
		return new Promise((resolve, reject) => {
			const request = store.get(id);
			request.onsuccess = () => {
				const record = request.result;
				resolve(record ? record.data : null);
			};
			request.onerror = () => reject(request.error);
		});
	}

	async queryRecords(storeName: string, filter?: any): Promise<any[]> {
		// Skip in SSR
		if (typeof window === 'undefined') {
			return [];
		}
		
		if (!this.db) await this.initializeDatabase();
		
		if (!this.db) throw new Error('Database not initialized');
		
		const transaction = this.db.transaction(storeName, 'readonly');
		const store = transaction.objectStore(storeName);
		
		return new Promise((resolve, reject) => {
			const request = store.getAll();
			request.onsuccess = () => {
				let results = request.result.map(record => record.data);
				
				// Apply basic filtering if provided
				if (filter) {
					results = results.filter(item => {
						return Object.keys(filter).every(key => {
							if (filter[key] === null || filter[key] === undefined) return true;
							return item[key] === filter[key];
						});
					});
				}
				
				resolve(results);
			};
			request.onerror = () => reject(request.error);
		});
	}

	async deleteRecord(storeName: string, id: string): Promise<void> {
		// Skip in SSR
		if (typeof window === 'undefined') {
			return;
		}
		
		if (!this.db) await this.initializeDatabase();
		
		// Mark as deleted instead of actually deleting (for sync purposes)
		const existingRecord = await this.getFullRecord(storeName, id);
		if (existingRecord) {
			existingRecord.data._deleted = true;
			existingRecord.lastModified = Date.now();
			existingRecord.syncStatus = 'pending';
			existingRecord.version++;
			
			await this.storeRecord(storeName, existingRecord);
			await this.addToSyncQueue(existingRecord);
			await this.logChange(id, 'delete', { _deleted: true });
		}
	}

	// Sync Methods

	async triggerSync(): Promise<void> {
		// Skip in SSR
		if (typeof window === 'undefined') {
			return;
		}
		
		if (this.syncInProgress || !this.isOnline) return;
		
		this.syncInProgress = true;
		this.notifyStatusChange('syncing');
		
		try {
			// Get pending records
			const pendingRecords = await this.getPendingRecords();
			
			// Simulate server sync (in real implementation, this would be API calls)
			for (const record of pendingRecords) {
				await this.syncRecord(record);
			}
			
			this.notifyStatusChange('synced');
		} catch (error) {
			console.error('Sync failed:', error);
			this.notifyStatusChange('sync_error');
		} finally {
			this.syncInProgress = false;
		}
	}

	private async syncRecord(record: SyncableRecord): Promise<void> {
		// Simulate network delay
		await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
		
		// Simulate server-side conflict detection
		const hasConflict = Math.random() < 0.1; // 10% chance of conflict
		
		if (hasConflict) {
			const conflict: SyncConflict = {
				recordId: record.id,
				localVersion: record,
				remoteVersion: {
					...record,
					version: record.version + 1,
					lastModified: record.lastModified + 1000,
					data: { ...record.data, serverModified: true }
				},
				conflictType: 'concurrent',
				timestamp: Date.now()
			};
			
			await this.handleConflict(conflict);
		} else {
			// Successful sync
			record.syncStatus = 'synced';
			await this.storeRecord('cases', record);
			await this.removeFromSyncQueue(record.id);
		}
	}

	// Conflict Resolution

	private async handleConflict(conflict: SyncConflict): Promise<void> {
		// Store conflict for user resolution
		await this.storeConflict(conflict);
		
		// Notify application about conflict
		if (this.onConflictDetected) {
			this.onConflictDetected(conflict);
		}
	}

	async resolveConflict(recordId: string, resolution: 'local' | 'remote' | 'merge', mergedData?: any): Promise<void> {
		const conflict = await this.getConflict(recordId);
		if (!conflict) return;
		
		let resolvedRecord: SyncableRecord;
		
		switch (resolution) {
			case 'local':
				resolvedRecord = conflict.localVersion;
				break;
			case 'remote':
				resolvedRecord = conflict.remoteVersion;
				break;
			case 'merge':
				resolvedRecord = {
					...conflict.localVersion,
					data: mergedData || conflict.localVersion.data,
					version: Math.max(conflict.localVersion.version, conflict.remoteVersion.version) + 1,
					lastModified: Date.now()
				};
				break;
		}
		
		resolvedRecord.syncStatus = 'pending';
		await this.storeRecord('cases', resolvedRecord);
		await this.removeConflict(recordId);
		await this.addToSyncQueue(resolvedRecord);
		
		// Re-trigger sync
		this.triggerSync();
	}

	// Data Integrity

	private calculateChecksum(data: any): string {
		const str = JSON.stringify(data, Object.keys(data).sort());
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(16);
	}

	async validateDataIntegrity(storeName: string): Promise<{ valid: boolean; errors: string[] }> {
		const records = await this.getAllRecords(storeName);
		const errors: string[] = [];
		
		for (const record of records) {
			const expectedChecksum = this.calculateChecksum(record.data);
			if (record.checksum !== expectedChecksum) {
				errors.push(`Checksum mismatch for record ${record.id}`);
			}
		}
		
		return { valid: errors.length === 0, errors };
	}

	// Backup and Restore

	async createBackup(): Promise<string> {
		const backup = {
			timestamp: Date.now(),
			deviceId: this.deviceId,
			data: {
				cases: await this.getAllRecords('cases'),
				conflicts: await this.getAllRecords('conflicts'),
				changeLog: await this.getAllRecords('changeLog')
			},
			version: this.version
		};
		
		return JSON.stringify(backup);
	}

	async restoreFromBackup(backupData: string): Promise<void> {
		try {
			const backup = JSON.parse(backupData);
			
			// Validate backup format
			if (!backup.data || !backup.timestamp) {
				throw new Error('Invalid backup format');
			}
			
			// Clear existing data
			await this.clearAllData();
			
			// Restore data
			for (const [storeName, records] of Object.entries(backup.data)) {
				for (const record of records as SyncableRecord[]) {
					await this.storeRecord(storeName, record);
				}
			}
			
			this.notifyStatusChange('restored');
		} catch (error: unknown) {
			throw new Error(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	// Utility Methods

	private generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substring(2);
	}

	private async getNextVersion(recordId?: string): Promise<number> {
		if (!recordId) return 1;
		
		const existing = await this.getFullRecord('cases', recordId);
		return existing ? existing.version + 1 : 1;
	}

	private async storeRecord(storeName: string, record: SyncableRecord): Promise<void> {
		if (!this.db) return;
		
		const transaction = this.db.transaction(storeName, 'readwrite');
		const store = transaction.objectStore(storeName);
		
		return new Promise((resolve, reject) => {
			const request = store.put(record);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	private async getFullRecord(storeName: string, id: string): Promise<SyncableRecord | null> {
		if (!this.db) return null;
		
		const transaction = this.db.transaction(storeName, 'readonly');
		const store = transaction.objectStore(storeName);
		
		return new Promise((resolve, reject) => {
			const request = store.get(id);
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => reject(request.error);
		});
	}

	private async getAllRecords(storeName: string): Promise<SyncableRecord[]> {
		if (!this.db) return [];
		
		const transaction = this.db.transaction(storeName, 'readonly');
		const store = transaction.objectStore(storeName);
		
		return new Promise((resolve, reject) => {
			const request = store.getAll();
			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	}

	private async getPendingRecords(): Promise<SyncableRecord[]> {
		if (!this.db) return [];
		
		const transaction = this.db.transaction('cases', 'readonly');
		const store = transaction.objectStore('cases');
		const index = store.index('syncStatus');
		
		return new Promise((resolve, reject) => {
			const request = index.getAll('pending');
			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	}

	private async addToSyncQueue(record: SyncableRecord): Promise<void> {
		if (!this.db) return;
		
		const queueItem = {
			id: this.generateId(),
			recordId: record.id,
			timestamp: Date.now(),
			attempts: 0
		};
		
		const transaction = this.db.transaction('syncQueue', 'readwrite');
		const store = transaction.objectStore('syncQueue');
		store.put(queueItem);
	}

	private async removeFromSyncQueue(recordId: string): Promise<void> {
		if (!this.db) return;
		
		// Find and remove queue items for this record
		const transaction = this.db.transaction('syncQueue', 'readwrite');
		const store = transaction.objectStore('syncQueue');
		const request = store.getAll();
		
		request.onsuccess = () => {
			const items = request.result || [];
			items.forEach(item => {
				if (item.recordId === recordId) {
					store.delete(item.id);
				}
			});
		};
	}

	private async logChange(recordId: string, operation: 'create' | 'update' | 'delete', changes: any): Promise<void> {
		if (!this.db) return;
		
		const changeLog: DataChangeLog = {
			id: this.generateId(),
			recordId,
			operation,
			changes,
			timestamp: Date.now(),
			userId: 'current_user', // Would be actual user ID
			deviceId: this.deviceId
		};
		
		const transaction = this.db.transaction('changeLog', 'readwrite');
		const store = transaction.objectStore('changeLog');
		store.put(changeLog);
		
		if (this.onDataChange) {
			this.onDataChange(changeLog);
		}
	}

	private async storeConflict(conflict: SyncConflict): Promise<void> {
		if (!this.db) return;
		
		const transaction = this.db.transaction('conflicts', 'readwrite');
		const store = transaction.objectStore('conflicts');
		store.put(conflict);
	}

	private async getConflict(recordId: string): Promise<SyncConflict | null> {
		if (!this.db) return null;
		
		const transaction = this.db.transaction('conflicts', 'readonly');
		const store = transaction.objectStore('conflicts');
		
		return new Promise((resolve, reject) => {
			const request = store.get(recordId);
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => reject(request.error);
		});
	}

	private async removeConflict(recordId: string): Promise<void> {
		if (!this.db) return;
		
		const transaction = this.db.transaction('conflicts', 'readwrite');
		const store = transaction.objectStore('conflicts');
		store.delete(recordId);
	}

	private async clearAllData(): Promise<void> {
		if (!this.db) return;
		
		const stores = ['cases', 'syncQueue', 'conflicts', 'changeLog'];
		const transaction = this.db.transaction(stores, 'readwrite');
		
		stores.forEach(storeName => {
			const store = transaction.objectStore(storeName);
			store.clear();
		});
	}

	private notifyStatusChange(status: string): void {
		if (this.onSyncStatusChange) {
			this.onSyncStatusChange(status);
		}
	}

	// Event Handlers

	onSync(callback: (status: string) => void): void {
		this.onSyncStatusChange = callback;
	}

	onConflict(callback: (conflict: SyncConflict) => void): void {
		this.onConflictDetected = callback;
	}

	onChange(callback: (change: DataChangeLog) => void): void {
		this.onDataChange = callback;
	}

	// Status Methods

	getSyncStatus(): { isOnline: boolean; syncInProgress: boolean; pendingCount: number } {
		return {
			isOnline: this.isOnline,
			syncInProgress: this.syncInProgress,
			pendingCount: this.syncQueue.length
		};
	}

	getDeviceId(): string {
		return this.deviceId;
	}
}

export default OfflineDataManager;