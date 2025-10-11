import * as tf from '@tensorflow/tfjs';
import { tfManager } from './model-loader';

export interface ImageAnalysisResult {
	condition: string;
	confidence: number;
	findings: string[];
	severity: 'normal' | 'mild' | 'moderate' | 'severe';
}

/**
 * Analyze medical images (e.g., anemia detection from eye/nail photos)
 */
export async function analyzeImage(imageElement: HTMLImageElement): Promise<ImageAnalysisResult> {
	try {
		// Initialize TensorFlow if needed
		await tfManager.initialize();

		// Preprocess image
		const tensor = tfManager.preprocessImage(imageElement, [224, 224]);

		// TODO: Load actual trained model
		// For now, use rule-based analysis on image characteristics
		const result = await analyzeImageRuleBased(tensor);

		// Clean up
		tensor.dispose();

		return result;

	} catch (error) {
		console.error('Image analysis error:', error);
		throw error;
	}
}

/**
 * Rule-based image analysis (placeholder until models are trained)
 */
async function analyzeImageRuleBased(tensor: tf.Tensor): Promise<ImageAnalysisResult> {
	return tf.tidy(() => {
		// Calculate average color values (for anemia detection)
		const normalized = tensor.squeeze([0]);
		const mean = normalized.mean();
		const std = tf.moments(normalized).variance.sqrt();
		
		const meanValue = mean.dataSync()[0];
		const stdValue = std.dataSync()[0];
		
		// Simple heuristic: Low red channel and low brightness suggests pallor
		const redChannel = normalized.slice([0, 0, 0], [-1, -1, 1]);
		const redMean = redChannel.mean().dataSync()[0];
		
		// Determine severity based on color analysis
		let severity: 'normal' | 'mild' | 'moderate' | 'severe' = 'normal';
		let confidence = 0.6;
		const findings: string[] = [];
		let condition = 'Normal';

		if (redMean < 0.3 && meanValue < 0.4) {
			severity = 'severe';
			confidence = 0.75;
			condition = 'Severe Anemia Suspected';
			findings.push('Significant pallor detected');
			findings.push('Very low red coloration');
			findings.push('Recommend immediate blood test');
		} else if (redMean < 0.4 && meanValue < 0.5) {
			severity = 'moderate';
			confidence = 0.7;
			condition = 'Moderate Anemia Possible';
			findings.push('Moderate pallor observed');
			findings.push('Reduced red coloration');
			findings.push('Blood test recommended');
		} else if (redMean < 0.5) {
			severity = 'mild';
			confidence = 0.65;
			condition = 'Mild Anemia Possible';
			findings.push('Slight pallor noted');
			findings.push('Monitor symptoms');
		} else {
			findings.push('Color appears normal');
			findings.push('No obvious signs of anemia');
		}

		return {
			condition,
			confidence,
			findings,
			severity
		};
	});
}

/**
 * Analyze multiple images and combine results
 */
export async function analyzeMultipleImages(
	images: HTMLImageElement[]
): Promise<ImageAnalysisResult> {
	const results = await Promise.all(images.map(img => analyzeImage(img)));
	
	// Combine results (take the most severe finding)
	let maxSeverity = 'normal';
	let maxConfidence = 0;
	let combinedCondition = 'Normal';
	const allFindings: string[] = [];
	
	results.forEach((result, index) => {
		const severityScores: Record<string, number> = {
			'normal': 0,
			'mild': 1,
			'moderate': 2,
			'severe': 3
		};
		
		const severityScore = severityScores[result.severity];
		const currentMaxScore = severityScores[maxSeverity];
		
		if (severityScore > currentMaxScore) {
			maxSeverity = result.severity;
			maxConfidence = result.confidence;
			combinedCondition = result.condition;
		}
		
		allFindings.push(`Image ${index + 1}: ${result.findings.join(', ')}`);
	});
	
	return {
		condition: combinedCondition,
		confidence: maxConfidence,
		findings: allFindings,
		severity: maxSeverity as 'normal' | 'mild' | 'moderate' | 'severe'
	};
}

/**
 * Load image from file or URL
 */
export function loadImage(source: string | File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		
		img.onload = () => resolve(img);
		img.onerror = (error) => reject(error);
		
		if (typeof source === 'string') {
			img.src = source;
		} else {
			const reader = new FileReader();
			reader.onload = (e) => {
				img.src = e.target?.result as string;
			};
			reader.onerror = reject;
			reader.readAsDataURL(source);
		}
	});
}
