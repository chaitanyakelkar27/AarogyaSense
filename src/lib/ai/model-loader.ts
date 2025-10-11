import * as tf from '@tensorflow/tfjs';

interface ModelCache {
	[key: string]: tf.LayersModel | tf.GraphModel;
}

class TensorFlowManager {
	private models: ModelCache = {};
	private initialized = false;

	/**
	 * Initialize TensorFlow.js backend
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		try {
			// Set backend (prefer WebGL for performance)
			await tf.ready();
			await tf.setBackend('webgl');
			this.initialized = true;
			console.log('TensorFlow.js initialized with backend:', tf.getBackend());
		} catch (error) {
			console.error('Failed to initialize TensorFlow.js:', error);
			// Fallback to CPU
			await tf.setBackend('cpu');
			this.initialized = true;
		}
	}

	/**
	 * Load a model from URL or IndexedDB cache
	 */
	async loadModel(
		modelName: string,
		modelUrl: string,
		format: 'layers' | 'graph' = 'layers'
	): Promise<tf.LayersModel | tf.GraphModel> {
		// Check if model is already loaded
		if (this.models[modelName]) {
			return this.models[modelName];
		}

		try {
			console.log(`Loading ${modelName} model...`);
			
			let model;
			if (format === 'layers') {
				model = await tf.loadLayersModel(modelUrl);
			} else {
				model = await tf.loadGraphModel(modelUrl);
			}

			this.models[modelName] = model;
			console.log(`${modelName} model loaded successfully`);
			
			return model;
		} catch (error) {
			console.error(`Failed to load ${modelName} model:`, error);
			throw error;
		}
	}

	/**
	 * Get a loaded model
	 */
	getModel(modelName: string): tf.LayersModel | tf.GraphModel | null {
		return this.models[modelName] || null;
	}

	/**
	 * Unload a model to free memory
	 */
	async unloadModel(modelName: string): Promise<void> {
		const model = this.models[modelName];
		if (model) {
			model.dispose();
			delete this.models[modelName];
			console.log(`${modelName} model unloaded`);
		}
	}

	/**
	 * Preprocess image for model input
	 */
	preprocessImage(imageElement: HTMLImageElement, targetSize: [number, number]): tf.Tensor {
		return tf.tidy(() => {
			// Convert to tensor
			let tensor = tf.browser.fromPixels(imageElement);
			
			// Resize to target size
			tensor = tf.image.resizeBilinear(tensor, targetSize);
			
			// Normalize to [0, 1]
			tensor = tensor.div(255.0);
			
			// Add batch dimension
			return tensor.expandDims(0);
		});
	}

	/**
	 * Preprocess audio for model input
	 */
	async preprocessAudio(audioBuffer: AudioBuffer, targetLength: number): Promise<tf.Tensor> {
		return tf.tidy(() => {
			// Get audio data
			const audioData = audioBuffer.getChannelData(0);
			
			// Create tensor
			let tensor = tf.tensor1d(audioData);
			
			// Pad or truncate to target length
			if (audioData.length < targetLength) {
				const padding: [number, number][] = [[0, targetLength - audioData.length]];
				tensor = tf.pad(tensor, padding);
			} else if (audioData.length > targetLength) {
				tensor = tensor.slice(0, targetLength);
			}
			
			// Add batch and channel dimensions
			return tensor.expandDims(0).expandDims(-1);
		});
	}

	/**
	 * Clean up memory
	 */
	dispose(): void {
		Object.values(this.models).forEach(model => model.dispose());
		this.models = {};
	}

	/**
	 * Get memory info
	 */
	getMemoryInfo(): { numTensors: number; numBytes: number } {
		return tf.memory();
	}
}

// Singleton instance
export const tfManager = new TensorFlowManager();

// Browser-only initialization
if (typeof window !== 'undefined') {
	tfManager.initialize();
}

export default tfManager;
