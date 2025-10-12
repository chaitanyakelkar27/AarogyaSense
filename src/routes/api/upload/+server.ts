import { json, type RequestEvent } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = 'uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Ensure upload directory exists
async function ensureUploadDir() {
	const dir = join(process.cwd(), 'static', UPLOAD_DIR);
	if (!existsSync(dir)) {
		await mkdir(dir, { recursive: true });
	}
	return dir;
}

export async function POST({ request }: RequestEvent) {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const type = formData.get('type') as string; // 'image' or 'audio'

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			return json(
				{ error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
				{ status: 400 }
			);
		}

		// Validate file type
		const allowedTypes: Record<string, string[]> = {
			image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
			audio: ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg']
		};

		if (type && allowedTypes[type] && !allowedTypes[type].includes(file.type)) {
			return json(
				{ error: `Invalid file type. Allowed: ${allowedTypes[type].join(', ')}` },
				{ status: 400 }
			);
		}

		// Generate unique filename
		const timestamp = Date.now();
		const extension = file.name.split('.').pop();
		const filename = `${type || 'file'}_${timestamp}.${extension}`;

		// Ensure upload directory exists
		const uploadDir = await ensureUploadDir();
		const filePath = join(uploadDir, filename);

		// Convert file to buffer and save
		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(filePath, buffer);

		// Return public URL
		const publicUrl = `/${UPLOAD_DIR}/${filename}`;

		return json({
			success: true,
			url: publicUrl,
			filename,
			size: file.size,
			type: file.type
		});
	} catch (error) {
		console.error('File upload error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to upload file'
			},
			{ status: 500 }
		);
	}
}
